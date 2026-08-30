/**
 * Chat Panel — native VS Code webview for crew chat with WebSocket backing.
 *
 * Provides a persistent, dockable chat interface at the bottom of VS Code that:
 * - Connects to the crew via WebSocket proxy (auto-reconnect, batching)
 * - Maintains conversation history per session
 * - Can attach file references and workspace context
 * - Shows cost/model metadata for each response
 * - Displays connection status and priority queue status
 */

import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import { LCARS_MARKDOWN_CSS, LCARS_MARKDOWN_CLIENT_JS } from '@story-agent/shared/lcars-markdown';
import { webviewTokenStyle, type WebviewThemeId } from '@story-agent/shared/ui-tokens';
import { getChatClient } from '../chat/chat-engine';
import { updateControlLane, type ControlLane } from '../controlLaneStatusBar';
import { processFileForChat, formatFileSize, generateFilePreview, toChatFileInputFormat, type ChatFileInput } from '../chat/file-paste-handler';

function getNonce(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  costUSD?: number;
  timestamp?: number;
  inProgress?: boolean; // Track if still receiving chunks
  metadata?: Record<string, unknown>; // Store execution/crew metadata
  files?: ChatFileInput[]; // File attachments (images or PDFs)
}

export class ChatPanel {
  private static instance: ChatPanel | null = null;
  private panel: vscode.WebviewPanel;
  private context: vscode.ExtensionContext;
  private history: ChatMessage[] = [];
  private sessionId = `session-${Date.now()}`;
  private pendingFiles: ChatFileInput[] = []; // Files queued for next message

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;

    this.panel = vscode.window.createWebviewPanel(
      'storyAgentChat',
      '💬 Story Agent Chat',
      { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
      {
        enableScripts: true,
        enableForms: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      }
    );

    this.panel.onDidDispose(() => this.dispose());
    this.setupWebviewHandlers();
    this.updatePanel();
  }

  /** Get or create the singleton chat panel instance */
  static show(context: vscode.ExtensionContext): ChatPanel {
    if (!ChatPanel.instance) {
      ChatPanel.instance = new ChatPanel(context);
    } else {
      ChatPanel.instance.panel.reveal(vscode.ViewColumn.Two, false);
    }
    return ChatPanel.instance;
  }

  private setupWebviewHandlers(): void {
    this.panel.webview.onDidReceiveMessage(async (msg: Record<string, unknown>) => {
      switch (msg.command) {
        case 'sendMessage': {
          const userMessage = String(msg.message ?? '').trim();
          if (!userMessage && this.pendingFiles.length === 0) break;

          // Add user message to history (with any pending file attachments)
          this.history.push({
            role: 'user',
            content: userMessage,
            timestamp: Date.now(),
            files: this.pendingFiles.length > 0 ? [...this.pendingFiles] : undefined,
          });

          // Clear pending files after sending
          const filesToSend = this.pendingFiles;
          this.pendingFiles = [];

          // Show thinking indicator
          this.panel.webview.postMessage({
            command: 'thinkingStart',
          });

          try {
            const response = await this.callCrewChatViaWebSocket(userMessage, filesToSend.length > 0 ? filesToSend : undefined);

            // Add assistant response to history
            this.history.push({
              role: 'assistant',
              content: response.answer,
              model: response.model,
              costUSD: response.costUSD,
              timestamp: Date.now(),
            });

            this.panel.webview.postMessage({
              command: 'messageReceived',
              role: 'assistant',
              content: response.answer,
              model: response.model,
              costUSD: response.costUSD,
              sources: response.sources,
              executionActivation: response.executionActivation,
              crewSelfOrganization: response.crewSelfOrganization,
              costAnalysis: response.costAnalysis,
              filesProcessed: filesToSend.length > 0 ? filesToSend.map(f => ({
                fileName: f.fileName,
                type: f.type,
                size: f.size,
              })) : undefined,
            });

            // Update the persistent control-lane status bar (lane derived like the chat badges).
            const ea = response.executionActivation as { activated?: boolean } | undefined;
            const lane: ControlLane = ea?.activated ? 'claude' : (response.crewSelfOrganization ? 'crew' : 'shell');
            updateControlLane(lane, response.costUSD);
          } catch (err) {
            // FIX #2: Sanitize error messages (no tokens/paths/URLs)
            let errorMsg = err instanceof Error ? err.message : String(err);
            // Remove common secret patterns
            errorMsg = errorMsg
              .replace(/\/[\w\/.:-]+/g, '[path]') // file paths
              .replace(/https?:\/\/[^\s]+/g, '[url]') // URLs
              .replace(/Bearer\s+\S+/gi, '[bearer-token]') // bearer tokens
              .replace(/api[-_]?key\s*[:=]\s*\S+/gi, '[api-key]') // API keys
              .replace(/token\s*[:=]\s*\S+/gi, '[token]') // tokens
              .replace(/\w+\s*=\s*([a-f0-9]{32,}|[a-zA-Z0-9_\-]{40,})/gi, '[secret]') // env secrets + SSH keys
              .replace(/(?:postgres|mysql|mongodb):\/\/[^@]+@[^\s]+/gi, '[db-url]'); // database credentials

            this.panel.webview.postMessage({
              command: 'error',
              message: errorMsg,
            });
          }

          this.panel.webview.postMessage({ command: 'thinkingEnd' });
          break;
        }

        case 'attachFile': {
          const uri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
              'All Supported': ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'],
              'Images': ['png', 'jpg', 'jpeg', 'gif', 'webp'],
              'PDFs': ['pdf'],
            },
            openLabel: 'Attach',
          });

          if (uri && uri[0]) {
            try {
              const fileData = await vscode.workspace.fs.readFile(uri[0]);
              const fileName = uri[0].path.split('/').pop() || 'file';
              
              // Process file using file-paste-handler
              const chatFile = await processFileForChat('attach', fileData, fileName);
              if (chatFile) {
                this.pendingFiles.push(chatFile);
                
                // Notify webview to display file preview
                const preview = generateFilePreview(chatFile);
                this.panel.webview.postMessage({
                  command: 'fileAttached',
                  file: {
                    ...preview,
                    size: chatFile.size,
                  },
                });
              }
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              vscode.window.showErrorMessage(`Failed to attach file: ${errorMsg}`);
              this.panel.webview.postMessage({
                command: 'error',
                message: `File attachment failed: ${errorMsg}`,
              });
            }
          }
          break;
        }

        case 'pasteFile': {
          // Handle paste event from webview (Ctrl+V / Cmd+V detection)
          try {
            const chatFile = await processFileForChat('paste');
            if (chatFile) {
              this.pendingFiles.push(chatFile);
              
              // Notify webview to display file preview
              const preview = generateFilePreview(chatFile);
              this.panel.webview.postMessage({
                command: 'fileAttached',
                file: {
                  ...preview,
                  size: chatFile.size,
                },
              });
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            this.panel.webview.postMessage({
              command: 'error',
              message: `File paste failed: ${errorMsg}`,
            });
          }
          break;
        }

        case 'clearHistory': {
          this.history = [];
          this.panel.webview.postMessage({ command: 'historyCleared' });
          break;
        }

        case 'copyToClipboard': {
          const text = String(msg.text ?? '');
          await vscode.env.clipboard.writeText(text);
          vscode.window.showInformationMessage('Copied to clipboard');
          break;
        }

        case 'openSettings':
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'storyAgent'
          );
          break;
      }
    });
  }

  private async callCrewChatViaWebSocket(message: string, files?: ChatFileInput[]): Promise<{
    answer: string;
    model: string;
    costUSD: number;
    sources: string[];
    executionActivation?: unknown;
    crewSelfOrganization?: unknown;
    costAnalysis?: unknown;
  }> {
    // FIX #5: Use actual WebSocket ChatClient instead of HTTP
    const chatClient = getChatClient();
    if (!chatClient) {
      throw new Error('Chat client not initialized');
    }

    // Convert history to chat format (last 8 turns)
    const chatHistory = this.history
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content }));

    // Convert ChatFileInput to ChatAttachment format for the chat request
    const attachments = files?.map(f => ({
      name: f.fileName || 'file',
      mimeType: f.mimeType || 'application/octet-stream',
      size: f.size,
      dataUrl: `data:${f.mimeType || 'application/octet-stream'};base64,${f.data}`,
    }));

    return new Promise((resolve, reject) => {
      // Generate unique message ID
      const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Set up response handler
      const unsubscribe = chatClient.onChatResponse(msgId, (response) => {
        if (response.done) {
          unsubscribe();
          const raw = response as unknown as Record<string, unknown>;
          resolve({
            answer: response.content,
            model: response.model,
            costUSD: response.costUSD,
            sources: response.sources || [],
            executionActivation: raw.executionActivation,
            crewSelfOrganization: raw.crewSelfOrganization,
            costAnalysis: raw.costAnalysis,
          });
        } else if (response.content) {
          // Partial chunk frame — stream the accumulated answer into the webview live.
          this.panel.webview.postMessage({ command: 'chunkUpdate', content: response.content });
        }
      });

      // Send request via WebSocket — pass msgId as the correlation id so the proxy echoes it
      // back and the handler registered above (keyed by msgId) actually matches the response.
      chatClient.send({
        id: msgId,
        message,
        priority: 'high',
        sessionId: this.sessionId,
        userId: vscode.env.sessionId || 'vscode-user',
        context: chatHistory as any,
        ...(attachments && { attachments }), // Include files as attachments if present
      }).catch((err) => {
        unsubscribe();
        reject(err);
      });

      // Timeout: 30s max (matches HTTP timeout) — increased to 60s for file processing
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Chat response timeout'));
      }, files && files.length > 0 ? 60000 : 30000); // Longer timeout for file processing
    });
  }

  private updatePanel(): void {
    if (!this.panel) return;
    this.panel.webview.html = this.buildHtml();
  }

  private uiTheme(): WebviewThemeId {
    const value = vscode.workspace.getConfiguration('storyAgent').get<string>('uiTheme') ?? 'lcars';
    return value === 'lcars' || value === 'dark' || value === 'light' || value === 'vscode'
      ? value
      : 'lcars';
  }

  private buildHtml(): string {
    const nonce = getNonce();
    const theme = this.uiTheme();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Story Agent Chat</title>
  ${webviewTokenStyle(nonce, theme)}
  <style nonce="${nonce}">
    * { box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      color: var(--sa-text);
      background: var(--vscode-editor-background);
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .message {
      padding: 8px 10px;
      border-radius: 4px;
      word-wrap: break-word;
      line-height: 1.5;
    }

    .message.user {
      align-self: flex-end;
      background: var(--sa-primary);
      color: var(--sa-onAccent);
      max-width: 75%;
      border-radius: 6px 2px 6px 6px;
    }

    .message.assistant {
      align-self: flex-start;
      background: var(--sa-card);
      color: var(--sa-text);
      border: 1px solid var(--sa-border);
      border-radius: 2px 6px 6px 6px;
      max-width: 85%;
    }

    .message-meta {
      font-size: 11px;
      color: var(--sa-muted);
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid var(--sa-border);
    }

    .sources {
      font-size: 11px;
      color: var(--sa-muted);
      margin-top: 4px;
    }

    .sources code {
      background: var(--vscode-editor-background);
      padding: 1px 3px;
      border-radius: 2px;
      font-family: var(--vscode-editor-font-family);
    }

    .thinking {
      align-self: center;
      color: var(--sa-muted);
      font-size: 12px;
      font-style: italic;
      padding: 8px;
    }

    .input-area {
      padding: 12px;
      border-top: 1px solid var(--sa-border);
      background: var(--vscode-editor-background);
      display: flex;
      gap: 6px;
    }

    .input-wrapper {
      flex: 1;
      display: flex;
      gap: 4px;
    }

    input[type="text"] {
      flex: 1;
      padding: 6px 8px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, var(--sa-border));
      border-radius: 3px;
      font-size: 13px;
      font-family: var(--vscode-font-family);
      outline: none;
    }

    input[type="text"]:focus {
      border-color: var(--vscode-focusBorder);
    }

    input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    button {
      padding: 6px 12px;
      background: var(--sa-primary);
      color: var(--sa-onAccent);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      font-family: var(--vscode-font-family);
      white-space: nowrap;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button:active {
      opacity: 0.85;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .toolbar {
      padding: 8px 12px;
      border-top: 1px solid var(--sa-border);
      background: var(--vscode-editor-background);
      display: flex;
      gap: 4px;
      font-size: 11px;
    }

    .toolbar button {
      padding: 3px 8px;
      font-size: 11px;
    }

    .error-message {
      color: var(--sa-danger);
      padding: 8px;
      background: rgba(255, 0, 0, 0.1);
      border-radius: 2px;
      margin: 4px;
    }

    code {
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
    }

    /* Markdown styling comes from the SHARED stylesheet in @story-agent/shared/lcars-markdown, so
       this webview and the web chat page cannot drift apart the way they had. The renderer below is
       kept client-side because this surface streams chunkUpdate events and re-renders as tokens
       arrive; it emits the same lcars-md-* class vocabulary the shared stylesheet defines. */
${LCARS_MARKDOWN_CSS}

    .code-block {
      background: var(--vscode-editor-background);
      border: 1px solid var(--sa-border);
      border-left: 3px solid var(--sa-primary);
      border-radius: 3px;
      padding: 8px 10px;
      margin: 6px 0;
      overflow-x: auto;
    }
    .code-block code { background: none; padding: 0; }

    /* Control-lane + model/cost badges */
    .badge {
      display: inline-block;
      padding: 1px 6px;
      margin-right: 4px;
      border-radius: 8px;
      font-size: 10px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--sa-border);
    }
    .badge.lane-claude { border-color: var(--sa-danger); color: var(--sa-danger); }
    .badge.lane-crew { border-color: var(--sa-primary); color: var(--sa-primary); }
    .badge.lane-shell { border-color: var(--sa-muted); color: var(--sa-muted); }

    /* Crew execution transparency */
    .exec-block {
      margin-top: 6px;
      font-size: 11px;
      border: 1px solid var(--sa-border);
      border-radius: 3px;
      background: var(--vscode-editor-background);
    }
    .exec-block > summary {
      cursor: pointer;
      padding: 4px 8px;
      color: var(--sa-primary);
      user-select: none;
    }
    .exec-block .exec-rows {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 12px;
      padding: 4px 10px 8px;
      color: var(--sa-muted);
      font-family: var(--vscode-editor-font-family);
    }

    /* File processing status indicator */
    .file-processing {
      margin-top: 6px;
      padding: 6px 8px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--sa-primary);
      border-radius: 3px;
      font-size: 11px;
      color: var(--sa-primary);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .file-processing.processing::after {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--sa-primary);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .file-processing.complete {
      color: var(--sa-ok, #4ec9b0);
      border-color: var(--sa-ok, #4ec9b0);
    }

    .file-processing.error {
      color: var(--sa-danger);
      border-color: var(--sa-danger);
    }

    .scroller-spacer {
      height: 1px;
      align-self: flex-end;
    }

    /* File attachment preview badges */
    .file-preview {
      padding: 8px 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--sa-border);
      border-top: none;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      max-height: 100px;
      overflow-y: auto;
    }

    .file-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: var(--sa-card);
      border: 1px solid var(--sa-primary);
      border-radius: 4px;
      font-size: 11px;
      color: var(--sa-text);
      white-space: nowrap;
    }

    .file-badge .file-icon {
      font-size: 12px;
    }

    .file-badge .file-name {
      font-weight: 500;
    }

    .file-badge .file-size {
      color: var(--sa-muted);
      font-size: 10px;
    }

    .file-badge .file-remove {
      cursor: pointer;
      color: var(--sa-muted);
      margin-left: 4px;
      font-weight: bold;
    }

    .file-badge .file-remove:hover {
      color: var(--sa-danger);
    }
  </style>
</head>
<body>
  <div class="chat-container">
    <div class="messages" id="messages"></div>
    <div id="thinkingIndicator" class="thinking" style="display: none;">
      Thinking…
    </div>
  </div>

  <div class="toolbar">
    <button onclick="clearChat()" title="Clear conversation history">🗑️ Clear</button>
    <button onclick="attachFile()" title="Attach a file to reference">📎 Attach</button>
    <button onclick="openSettings()" title="Open Story Agent settings">⚙️ Settings</button>
  </div>

  <div class="input-area">
    <div class="input-wrapper">
      <input
        type="text"
        id="messageInput"
        placeholder="Ask the crew… (Ctrl+Enter to send, Ctrl+V to paste files)"
        onkeydown="handleKeyDown(event)"
        onpaste="handlePaste(event)"
        autocomplete="off"
      />
      <button onclick="sendMessage()" id="sendBtn">Send</button>
    </div>
    <div class="file-preview" id="filePreview" style="display: none;"></div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const thinkingEl = document.getElementById('thinkingIndicator');

    let isSending = false;
    let streamingEl = null; // in-progress assistant bubble while chunks arrive

    // Canonical XSS-safe markdown renderer, shared with the sidebar webview and the web /chat page —
    // see @story-agent/shared/lcars-markdown (LCARS_MARKDOWN_CLIENT_JS). Do not hand-write a local
    // copy here; that's the exact drift this shared constant exists to prevent.
    ${LCARS_MARKDOWN_CLIENT_JS}

    function laneBadge(metadata) {
      const ea = metadata.executionActivation;
      if (ea && ea.activated) return { cls: 'lane-claude', label: '🔴 agent' };
      if (metadata.crewSelfOrganization && metadata.crewSelfOrganization.enabled) return { cls: 'lane-crew', label: '🟡 crew' };
      return { cls: 'lane-shell', label: '🟢 direct' };
    }

    function renderMessage(role, content, metadata = {}) {
      const msgEl = document.createElement('div');
      msgEl.className = \`message \${role}\`;

      const body = document.createElement('div');
      body.className = 'lcars-md';
      body.innerHTML = role === 'assistant' ? renderMarkdown(content) : escapeHtml(content);
      msgEl.appendChild(body);

      // Tool-call transparency: surface the agent-core execution when chat ran real work.
      const ea = metadata.executionActivation;
      if (ea && ea.activated) {
        const exec = document.createElement('details');
        exec.className = 'exec-block';
        const rows = [];
        if (ea.iterations !== undefined) rows.push('iterations: ' + escapeHtml(ea.iterations));
        if (ea.toolCalls !== undefined) rows.push('tool calls: ' + escapeHtml(ea.toolCalls));
        if (ea.missionId) rows.push('mission: ' + escapeHtml(ea.missionId));
        if (ea.escalated) rows.push('escalated');
        if (ea.stalled) rows.push('⚠ stalled');
        exec.innerHTML = '<summary>🖖 Crew execution</summary><div class="exec-rows">' + rows.map(function (r) { return '<span>' + r + '</span>'; }).join('') + '</div>';
        msgEl.appendChild(exec);
      }

      if (role === 'assistant' && (metadata.model || metadata.costUSD !== undefined)) {
        const metaEl = document.createElement('div');
        metaEl.className = 'message-meta';
        const lane = laneBadge(metadata);
        const parts = ['<span class="badge ' + lane.cls + '">' + lane.label + '</span>'];
        if (metadata.model) parts.push('<span class="badge">' + escapeHtml(metadata.model) + '</span>');
        if (metadata.costUSD !== undefined) parts.push('<span class="badge">$' + Number(metadata.costUSD).toFixed(5) + '</span>');
        metaEl.innerHTML = parts.join(' ');
        msgEl.appendChild(metaEl);
      }

      if (metadata.sources && metadata.sources.length > 0) {
        const sourcesEl = document.createElement('div');
        sourcesEl.className = 'sources';
        sourcesEl.innerHTML = '<strong>Sources:</strong> ' + metadata.sources.map(s => \`<code>\${s}</code>\`).join(', ');
        msgEl.appendChild(sourcesEl);
      }

      // File processing metadata: show which files were extracted
      if (metadata.filesProcessed && metadata.filesProcessed.length > 0) {
        const filesEl = document.createElement('div');
        filesEl.className = 'sources'; // Reuse sources styling
        const fileLabels = metadata.filesProcessed.map(function (f) {
          const sizeKb = (f.size / 1024).toFixed(1);
          return '<code>' + escapeHtml(f.fileName || 'file') + ' (' + f.type + ', ' + sizeKb + 'KB)</code>';
        });
        filesEl.innerHTML = '<strong>Files processed:</strong> ' + fileLabels.join(', ');
        msgEl.appendChild(filesEl);
      }

      messagesEl.appendChild(msgEl);

      // Auto-scroll to bottom
      const spacer = document.createElement('div');
      spacer.className = 'scroller-spacer';
      spacer.id = 'scroller';
      messagesEl.appendChild(spacer);
      spacer.scrollIntoView();
    }

    function sendMessage() {
      const message = inputEl.value.trim();
      if (!message && document.querySelectorAll('.file-badge').length === 0) return;

      isSending = true;
      sendBtn.disabled = true;
      inputEl.disabled = true;

      renderMessage('user', message);
      inputEl.value = '';

      // Count attached files for status display
      const fileCount = document.querySelectorAll('.file-badge').length;

      vscode.postMessage({
        command: 'sendMessage',
        message,
        fileCount, // Pass file count for server-side logging
      });
    }

    function handleKeyDown(evt) {
      if ((evt.ctrlKey || evt.metaKey) && evt.key === 'Enter') {
        evt.preventDefault();
        sendMessage();
      }
    }

    function attachFile() {
      vscode.postMessage({ command: 'attachFile' });
    }

    function handlePaste(evt) {
      const items = evt.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          // Don't paste the image into the input; instead queue it for sending
          evt.preventDefault();
          vscode.postMessage({ command: 'pasteFile' });
          break;
        } else if (item.type === 'application/pdf') {
          // PDF in clipboard
          evt.preventDefault();
          vscode.postMessage({ command: 'pasteFile' });
          break;
        }
      }
      // If no file in clipboard, allow normal paste (text)
    }

    function removeFile(index) {
      vscode.postMessage({ command: 'removeFile', index });
    }

    function displayFilePreview(file) {
      const filePreviewEl = document.getElementById('filePreview');
      const badge = document.createElement('div');
      badge.className = 'file-badge';
      
      const icon = document.createElement('span');
      icon.className = 'file-icon';
      icon.textContent = file.icon || '📄';
      
      const name = document.createElement('span');
      name.className = 'file-name';
      name.textContent = file.label;
      
      const size = document.createElement('span');
      size.className = 'file-size';
      size.textContent = file.description || '';
      
      const remove = document.createElement('span');
      remove.className = 'file-remove';
      remove.textContent = '✕';
      remove.onclick = () => removeFile(Array.from(filePreviewEl.children).indexOf(badge));
      
      badge.appendChild(icon);
      badge.appendChild(name);
      badge.appendChild(size);
      badge.appendChild(remove);
      
      filePreviewEl.appendChild(badge);
      filePreviewEl.style.display = 'flex';
    }

    function clearFilePreviews() {
      const filePreviewEl = document.getElementById('filePreview');
      filePreviewEl.innerHTML = '';
      filePreviewEl.style.display = 'none';
    }

    function clearChat() {
      if (confirm('Clear chat history?')) {
        messagesEl.innerHTML = '';
        vscode.postMessage({ command: 'clearHistory' });
      }
    }

    function openSettings() {
      vscode.postMessage({ command: 'openSettings' });
    }

    window.addEventListener('message', (evt) => {
      const msg = evt.data;
      switch (msg.command) {
        case 'fileAttached':
          displayFilePreview(msg.file);
          break;

        case 'chunkUpdate':
          // Live token streaming: create the in-progress bubble on first chunk, update thereafter.
          if (!streamingEl) {
            streamingEl = document.createElement('div');
            streamingEl.className = 'message assistant';
            const b = document.createElement('div');
            b.className = 'lcars-md';
            streamingEl.appendChild(b);
            messagesEl.appendChild(streamingEl);
            thinkingEl.style.display = 'none';
          }
          streamingEl.querySelector('.lcars-md').innerHTML = renderMarkdown(msg.content);
          streamingEl.scrollIntoView({ block: 'end' });
          break;

        case 'messageReceived':
          // Finalize: drop the streaming bubble and render the complete message with badges.
          if (streamingEl) { streamingEl.remove(); streamingEl = null; }
          renderMessage('assistant', msg.content, {
            model: msg.model,
            costUSD: msg.costUSD,
            sources: msg.sources,
            executionActivation: msg.executionActivation,
            crewSelfOrganization: msg.crewSelfOrganization,
            costAnalysis: msg.costAnalysis,
            filesProcessed: msg.filesProcessed,
          });
          break;

        case 'thinkingStart':
          const fileCount = document.querySelectorAll('.file-badge').length;
          if (fileCount > 0) {
            thinkingEl.textContent = '📄 Processing ' + fileCount + ' file(s)…';
          } else {
            thinkingEl.textContent = 'Thinking…';
          }
          thinkingEl.style.display = 'block';
          break;

        case 'thinkingEnd':
          thinkingEl.style.display = 'none';
          isSending = false;
          sendBtn.disabled = false;
          inputEl.disabled = false;
          clearFilePreviews(); // Clear file previews after sending
          inputEl.focus();
          break;

        case 'error':
          if (streamingEl) { streamingEl.remove(); streamingEl = null; }
          const errEl = document.createElement('div');
          errEl.className = 'error-message';
          errEl.textContent = '❌ ' + msg.message;
          messagesEl.appendChild(errEl);
          isSending = false;
          sendBtn.disabled = false;
          inputEl.disabled = false;
          break;

        case 'historyCleared':
          clearFilePreviews();
          inputEl.focus();
          break;
      }
    });

    // Focus input on load
    inputEl.focus();
  </script>
</body>
</html>
    `;
  }

  private dispose(): void {
    ChatPanel.instance = null;
  }
}
function setTimeout(arg0: () => void, arg1: number) {
  throw new Error('Function not implemented.');
}

