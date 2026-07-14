import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { webviewTokenStyle, type WebviewThemeId } from '@story-agent/shared/ui-tokens';
import { withDashboardTheme } from './lib/dashboardThemeLink';
import { chatWithCrew } from './agentClient';
import {
  BASE_DESIGN_THEORY_ID,
  BASE_DESIGN_PRINCIPLES,
  BASE_COPYRIGHT_GUARDRAILS,
  THEME_LAYER_STACK,
} from '@story-agent/shared';

function getNonce(): string {
  return randomBytes(16).toString('base64');
}

interface PanelAttachment {
  name: string;
  mimeType: string;
  size: number;
  dataUrl?: string;
}

function parsePanelAttachments(input: unknown): PanelAttachment[] {
  if (!Array.isArray(input)) return [];
  const out: PanelAttachment[] = [];
  for (const item of input) {
    const it = item as Record<string, unknown>;
    const name = typeof it.name === 'string' ? it.name : '';
    const mimeType = typeof it.mimeType === 'string' ? it.mimeType : 'application/octet-stream';
    const size = typeof it.size === 'number' ? it.size : 0;
    const dataUrl = typeof it.dataUrl === 'string' ? it.dataUrl : undefined;
    if (!name || size <= 0) continue;
    out.push({ name, mimeType, size, dataUrl });
    if (out.length >= 6) break;
  }
  return out;
}

export class StorySidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  /** Called from commands to pre-fill the prepare form */
  focusPrepareForm(referenceNum?: string, repoFullName?: string): void {
    this._view?.show(true);
    if (referenceNum ?? repoFullName) {
      this._view?.webview.postMessage({
        command: 'prefill',
        referenceNum: referenceNum ?? '',
        repoFullName: repoFullName ?? '',
      });
    }
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _ctx: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._buildHtml();

    webviewView.webview.onDidReceiveMessage(async (msg: Record<string, unknown>) => {
      switch (msg.command) {
        case 'openDashboard':
          vscode.env.openExternal(
            vscode.Uri.parse(withDashboardTheme(this._dashboardUrl()))
          );
          break;
        case 'openObservationLounge':
          vscode.env.openExternal(
            vscode.Uri.parse(withDashboardTheme(`${this._dashboardUrl()}/observation-lounge`))
          );
          break;
        case 'launchInChat': {
          const parts = ['/prepare', msg.referenceNum, msg.repoFullName]
            .filter(Boolean)
            .join(' ');
          vscode.commands.executeCommand('workbench.action.chat.open', {
            query: `@story-agent ${parts}`,
          });
          break;
        }
        case 'copyText':
          vscode.env.clipboard.writeText(String(msg.text ?? ''));
          vscode.window.showInformationMessage('Copied to clipboard!');
          break;
        case 'openSettings':
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'storyAgent'
          );
          break;
        case 'setTheme': {
          const nextTheme = String(msg.theme ?? '').trim();
          if (!['lcars', 'dark', 'light', 'vscode'].includes(nextTheme)) break;
          vscode.workspace
            .getConfiguration('storyAgent')
            .update('uiTheme', nextTheme, vscode.ConfigurationTarget.Global)
            .then(() => {
              if (this._view) this._view.webview.html = this._buildHtml();
            });
          break;
        }
        case 'panelChat': {
          const message = String(msg.message ?? '').trim();
          if (!message) break;
          const attachments = parsePanelAttachments(msg.attachments);
          const historyRaw = Array.isArray(msg.history) ? msg.history : [];
          const history = historyRaw
            .filter((h): h is { role: 'user' | 'assistant'; content: string } => {
              const role = (h as any)?.role;
              const content = (h as any)?.content;
              return (role === 'user' || role === 'assistant') && typeof content === 'string';
            })
            .slice(-8);
          try {
            const enrichedMessage = this._buildMultimodalPrompt(message, attachments);
            const result = await chatWithCrew(enrichedMessage, { history, attachments });
            if (this._view) {
              this._view.webview.postMessage({
                command: 'panelChatResult',
                ok: result.ok,
                answer: result.answer ?? '',
                model: result.model ?? '',
                costUSD: result.costUSD ?? 0,
              });
            }
          } catch (err) {
            if (this._view) {
              this._view.webview.postMessage({
                command: 'panelChatResult',
                ok: false,
                answer: err instanceof Error ? err.message : String(err),
                model: '',
                costUSD: 0,
              });
            }
          }
          break;
        }
      }
    });
  }

  private _dashboardUrl(): string {
    return (
      vscode.workspace
        .getConfiguration('storyAgent')
        .get<string>('dashboardUrl') ?? 'http://localhost:3000'
    );
  }

  private _uiTheme(): WebviewThemeId {
    const value = vscode.workspace.getConfiguration('storyAgent').get<string>('uiTheme') ?? 'lcars';
    return value === 'lcars' || value === 'dark' || value === 'light' || value === 'vscode'
      ? value
      : 'lcars';
  }

  private _buildHtml(): string {
    // No CSP added: the existing markup relies on inline onclick handlers and a style attribute,
    // which a nonce-based CSP would disable. The token block is still a nonce'd static <style>.
    const nonce = getNonce();
    const principleList = BASE_DESIGN_PRINCIPLES
      .map(p => `<li><code>${p}</code></li>`)
      .join('');
    const guardrailList = BASE_COPYRIGHT_GUARDRAILS
      .map(g => `<li>${g}</li>`)
      .join('');
    const layerStack = THEME_LAYER_STACK.join(' → ');
    const currentTheme = this._uiTheme();
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Story Agent</title>
  ${webviewTokenStyle(nonce, currentTheme)}
  <style nonce="${nonce}">
    *, *::before, *::after { box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family);
      font-size: 12px;
      color: var(--sa-text);
      background: transparent;
      margin: 0;
      padding: 10px 8px;
    }

    h3 {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--sa-muted);
      margin: 0 0 6px;
    }

    .section { margin-bottom: 14px; }

    label {
      display: block;
      font-size: 11px;
      color: var(--sa-muted);
      margin-bottom: 3px;
    }

    input[type="text"] {
      width: 100%;
      padding: 4px 6px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 2px;
      font-size: 12px;
      font-family: var(--vscode-editor-font-family);
      margin-bottom: 4px;
      outline: none;
    }

    input[type="text"]:focus {
      border-color: var(--vscode-focusBorder);
    }

    input::placeholder { color: var(--vscode-input-placeholderForeground); }

    select {
      width: 100%;
      padding: 4px 6px;
      background: var(--vscode-dropdown-background, var(--sa-card));
      color: var(--vscode-dropdown-foreground, var(--sa-text));
      border: 1px solid var(--vscode-dropdown-border, var(--sa-border));
      border-radius: 2px;
      font-size: 12px;
      margin-bottom: 4px;
      outline: none;
    }

    .btn {
      display: block;
      width: 100%;
      padding: 4px 8px;
      margin-bottom: 4px;
      cursor: pointer;
      border: none;
      border-radius: 2px;
      font-size: 12px;
      font-family: var(--vscode-font-family);
      text-align: left;
    }

    .btn-primary {
      background: var(--sa-primary);
      color: var(--sa-onAccent);
    }
    .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
    .btn-primary:active { opacity: 0.85; }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }

    .divider {
      border: none;
      border-top: 1px solid var(--sa-border);
      margin: 10px 0;
    }

    .tip {
      font-size: 11px;
      color: var(--sa-muted);
      margin-top: 2px;
      line-height: 1.5;
    }

    code {
      font-family: var(--vscode-editor-font-family);
      font-size: 11px;
      background: var(--sa-card);
      padding: 1px 3px;
      border-radius: 2px;
    }

    .error {
      color: var(--sa-danger);
      font-size: 11px;
      margin-top: 4px;
    }

    .chat-log {
      border: 1px solid var(--sa-border);
      background: var(--sa-card);
      border-radius: 6px;
      min-height: 110px;
      max-height: 220px;
      overflow-y: auto;
      padding: 6px;
      margin-bottom: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .chat-bubble {
      padding: 6px 7px;
      border-radius: 6px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
    }

    .chat-bubble.user {
      background: color-mix(in srgb, var(--sa-primary) 20%, transparent);
      color: var(--sa-text);
      align-self: flex-end;
      border: 1px solid color-mix(in srgb, var(--sa-primary) 35%, transparent);
      max-width: 92%;
    }

    .chat-bubble.assistant {
      background: color-mix(in srgb, var(--sa-accent) 14%, transparent);
      color: var(--sa-text);
      align-self: flex-start;
      border: 1px solid color-mix(in srgb, var(--sa-accent) 34%, transparent);
      max-width: 96%;
    }

    .chat-meta {
      color: var(--sa-muted);
      font-size: 10px;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .chat-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 6px;
      align-items: start;
    }

    .chat-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 6px;
      gap: 6px;
    }

    .attach-row {
      display: flex;
      gap: 6px;
      align-items: center;
      margin-top: 6px;
      margin-bottom: 2px;
      flex-wrap: wrap;
    }

    .attach-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px solid var(--sa-border);
      background: color-mix(in srgb, var(--sa-accent) 10%, var(--sa-card));
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 10px;
      color: var(--sa-text);
      max-width: 100%;
    }

    .attach-pill button {
      border: none;
      background: transparent;
      color: var(--sa-muted);
      cursor: pointer;
      font-size: 10px;
      padding: 0;
    }

    textarea {
      width: 100%;
      resize: vertical;
      min-height: 56px;
      max-height: 140px;
      padding: 6px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 4px;
      font-size: 12px;
      font-family: var(--vscode-editor-font-family);
      outline: none;
    }

    textarea:focus {
      border-color: var(--vscode-focusBorder);
    }

    .btn-chat {
      width: auto;
      min-width: 72px;
      margin-bottom: 0;
      text-align: center;
      align-self: stretch;
    }

    .btn-chat-clear {
      min-width: 54px;
    }
  </style>
</head>
<body>

  <!-- ── Observation Lounge wizard ─────────────────────────────────── -->
  <div class="section">
    <h3>Observation Lounge</h3>
    <label for="refNum">Story Mission Input</label>
    <input id="refNum" type="text" placeholder="e.g. STORY-123 or full Aha URL" />
    <label for="repoName">Repository</label>
    <input id="repoName" type="text" placeholder="e.g. client-int/product-profile-ui" />
    <label for="branch">Target Branch</label>
    <input id="branch" type="text" placeholder="dev" value="dev" />
    <button class="btn btn-primary" onclick="launchInChat()">
      ✦ Prepare Execution Brief in Chat
    </button>
    <div id="err" class="error" style="display:none;"></div>
    <p class="tip">Opens <code>@story-agent /prepare</code> in Copilot chat with your inputs.</p>
  </div>

  <hr class="divider" />

  <!-- ── Interactive chat in-panel ─────────────────────────────────── -->
  <div class="section">
    <h3>Story Agent Chat</h3>
    <div id="chatLog" class="chat-log">
      <div class="chat-bubble assistant">
        Ask anything here for an interactive crew response.
        <div class="chat-meta">panel chat · canonical /chat brain</div>
      </div>
    </div>
    <div class="chat-row">
      <textarea id="chatInput" placeholder="Ask Story Agent... (Shift+Enter for newline)"></textarea>
      <button id="sendBtn" class="btn btn-primary btn-chat" onclick="sendPanelChat()">Send</button>
    </div>
    <div class="attach-row">
      <input id="mediaInput" type="file" accept="image/*,audio/*,video/*" multiple style="display:none" onchange="handleMediaSelected(event)" />
      <button class="btn btn-secondary btn-chat" onclick="chooseMedia()">Attach</button>
      <span class="tip">image / audio / video</span>
    </div>
    <div id="attachList" class="attach-row"></div>
    <div class="chat-actions">
      <button id="clearBtn" class="btn btn-secondary btn-chat btn-chat-clear" onclick="clearPanelChat()">Clear</button>
    </div>
    <p class="tip">Runs directly in this panel. Uses the same Quark-optimized chat backend.</p>
  </div>

  <hr class="divider" />

  <!-- ── Theme selection ───────────────────────────────────────────── -->
  <div class="section">
    <h3>Theme</h3>
    <label for="uiTheme">Cross-surface theme</label>
    <select id="uiTheme" onchange="setTheme(this.value)">
      <option value="lcars" ${currentTheme === 'lcars' ? 'selected' : ''}>LCARS (default)</option>
      <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
      <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light</option>
      <option value="vscode" ${currentTheme === 'vscode' ? 'selected' : ''}>VS Code native</option>
    </select>
    <p class="tip">Matches dashboard theme tokens for parity.</p>
  </div>

  <hr class="divider" />

  <!-- ── Web UI links ───────────────────────────────────────────────── -->
  <div class="section">
    <h3>Web Dashboard</h3>
    <button class="btn btn-secondary" onclick="openDashboard()">
      ⊞ Open Dashboard (localhost:3000)
    </button>
    <button class="btn btn-secondary" onclick="openObservationLounge()">
      ◎ Open Observation Lounge UI
    </button>
    <p class="tip">Requires <code>pnpm ui</code> to be running locally.</p>
  </div>

  <hr class="divider" />

  <!-- ── Base Design Doctrine ─────────────────────────────────────── -->
  <div class="section">
    <h3>Base UI/UX Doctrine</h3>
    <p class="tip">Theory ID: <code>${BASE_DESIGN_THEORY_ID}</code></p>
    <p class="tip">Theme inheritance: <code>${layerStack}</code></p>
    <p class="tip" style="margin-top:6px;">Core principles:</p>
    <ul style="margin: 4px 0 8px 18px; padding: 0; color: var(--sa-muted); font-size: 11px; line-height: 1.5;">
      ${principleList}
    </ul>
    <p class="tip" style="margin-top:6px;">Guardrails:</p>
    <ul style="margin: 4px 0 0 18px; padding: 0; color: var(--sa-muted); font-size: 11px; line-height: 1.5;">
      ${guardrailList}
    </ul>
  </div>

  <hr class="divider" />

  <!-- ── Chat quick-start ───────────────────────────────────────────── -->
  <div class="section">
    <h3>Chat Commands</h3>
    <p class="tip">Use <code>@story-agent</code> in Copilot chat:</p>
    <p class="tip"><code>/prepare STORY-####</code> — build execution brief (or pass Aha URL)</p>
    <p class="tip"><code>/status STORY-####</code> — check story status</p>
    <p class="tip"><code>/dashboard</code> — quick-open web UI</p>
  </div>

  <hr class="divider" />

  <!-- ── Settings ──────────────────────────────────────────────────── -->
  <div class="section">
    <button class="btn btn-secondary" onclick="openSettings()">
      ⚙ Story Agent Settings
    </button>
    <p class="tip">Configure <code>AHA_DOMAIN</code>, <code>ahaApiKey</code>, and dashboard URL.</p>
  </div>

  <script>
    // eslint-disable-next-line no-undef
    const vscode = acquireVsCodeApi();
    const savedState = vscode.getState() || {};
    const panelTurns = Array.isArray(savedState.turns)
      ? savedState.turns.filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string').slice(-30)
      : [];
    const panelAttachments = [];

    function persistPanelTurns() {
      vscode.setState({ turns: panelTurns.slice(-30) });
    }

    function emptyChatLog() {
      const log = document.getElementById('chatLog');
      while (log.firstChild) log.removeChild(log.firstChild);
    }

    function renderBubble(role, text, meta) {
      const log = document.getElementById('chatLog');
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble ' + role;
      bubble.textContent = text;
      if (meta) {
        const m = document.createElement('div');
        m.className = 'chat-meta';
        m.textContent = meta;
        bubble.appendChild(m);
      }
      log.appendChild(bubble);
      log.scrollTop = log.scrollHeight;
      return bubble;
    }

    function streamAssistantBubble(text, meta) {
      const bubble = renderBubble('assistant', '', meta);
      let i = 0;
      const step = () => {
        i = Math.min(text.length, i + 5);
        bubble.firstChild && bubble.firstChild.nodeType === Node.TEXT_NODE
          ? bubble.firstChild.textContent = text.slice(0, i)
          : bubble.textContent = text.slice(0, i);
        if (meta) {
          const m = document.createElement('div');
          m.className = 'chat-meta';
          m.textContent = meta;
          if (!bubble.querySelector('.chat-meta')) bubble.appendChild(m);
        }
        const log = document.getElementById('chatLog');
        log.scrollTop = log.scrollHeight;
        if (i < text.length) {
          window.setTimeout(step, 10);
        }
      };
      step();
    }

    function renderPanelHistory() {
      emptyChatLog();
      if (panelTurns.length === 0) {
        renderBubble('assistant', 'Ask anything here for an interactive crew response.', 'panel chat · canonical /chat brain');
        return;
      }
      for (const turn of panelTurns) {
        renderBubble(turn.role, turn.content);
      }
    }

    function setChatBusy(busy) {
      const sendBtn = document.getElementById('sendBtn');
      const clearBtn = document.getElementById('clearBtn');
      const input = document.getElementById('chatInput');
      sendBtn.disabled = busy;
      clearBtn.disabled = busy;
      input.disabled = busy;
      sendBtn.textContent = busy ? '...' : 'Send';
    }

    function clearPanelChat() {
      panelTurns.length = 0;
      persistPanelTurns();
      renderPanelHistory();
    }

    function chooseMedia() {
      const input = document.getElementById('mediaInput');
      input.click();
    }

    function attachmentKind(mimeType) {
      if ((mimeType || '').startsWith('image/')) return 'image';
      if ((mimeType || '').startsWith('audio/')) return 'audio';
      if ((mimeType || '').startsWith('video/')) return 'video';
      return 'file';
    }

    function renderAttachments() {
      const list = document.getElementById('attachList');
      while (list.firstChild) list.removeChild(list.firstChild);
      for (let i = 0; i < panelAttachments.length; i += 1) {
        const a = panelAttachments[i];
        const pill = document.createElement('div');
        pill.className = 'attach-pill';
        pill.title = a.mimeType;
        const label = document.createElement('span');
        label.textContent = attachmentKind(a.mimeType) + ' · ' + a.name;
        const btn = document.createElement('button');
        btn.textContent = '✕';
        btn.onclick = () => {
          panelAttachments.splice(i, 1);
          renderAttachments();
        };
        pill.appendChild(label);
        pill.appendChild(btn);
        list.appendChild(pill);
      }
    }

    async function handleMediaSelected(event) {
      const files = event.target && event.target.files ? Array.from(event.target.files) : [];
      for (const file of files.slice(0, 6)) {
        if (!(file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/'))) continue;
        if (file.size > 8 * 1024 * 1024) continue;
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }).catch(() => '');
        panelAttachments.push({ name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, dataUrl });
      }
      renderAttachments();
      event.target.value = '';
    }

    function sendPanelChat() {
      const input = document.getElementById('chatInput');
      const message = input.value.trim();
      if (!message) return;

      panelTurns.push({ role: 'user', content: message });
      persistPanelTurns();
      renderBubble('user', message);
      input.value = '';
      setChatBusy(true);

      vscode.postMessage({
        command: 'panelChat',
        message,
        history: panelTurns.slice(-8),
        attachments: panelAttachments,
      });

      panelAttachments.length = 0;
      renderAttachments();
    }

    function launchInChat() {
      const refNum = document.getElementById('refNum').value.trim();
      const repoName = document.getElementById('repoName').value.trim();
      const err = document.getElementById('err');

      if (!refNum) {
        err.textContent = 'Please enter a story reference number.';
        err.style.display = 'block';
        document.getElementById('refNum').focus();
        return;
      }
      err.style.display = 'none';

      vscode.postMessage({
        command: 'launchInChat',
        referenceNum: refNum,
        repoFullName: repoName,
      });
    }

    function openDashboard() {
      vscode.postMessage({ command: 'openDashboard' });
    }

    function openObservationLounge() {
      vscode.postMessage({ command: 'openObservationLounge' });
    }

    function openSettings() {
      vscode.postMessage({ command: 'openSettings' });
    }

    function setTheme(theme) {
      vscode.postMessage({ command: 'setTheme', theme });
    }

    // Pre-fill form fields when triggered from a command
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.command === 'prefill') {
        if (msg.referenceNum) document.getElementById('refNum').value = msg.referenceNum;
        if (msg.repoFullName) document.getElementById('repoName').value = msg.repoFullName;
      }
      if (msg.command === 'panelChatResult') {
        setChatBusy(false);
        const ok = Boolean(msg.ok);
        const answer = String(msg.answer || (ok ? '(no response)' : 'chat unavailable'));
        if (ok) {
          panelTurns.push({ role: 'assistant', content: answer });
          persistPanelTurns();
          const meta = msg.model
            ? (String(msg.model) + (msg.costUSD ? (' · $' + Number(msg.costUSD).toFixed(5)) : ''))
            : '';
          streamAssistantBubble(answer, meta);
        } else {
          panelTurns.push({ role: 'assistant', content: '⚠️ ' + answer });
          persistPanelTurns();
          streamAssistantBubble('⚠️ ' + answer);
        }
      }
    });

    renderPanelHistory();

    // Allow Enter key on inputs to launch
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (
        document.activeElement?.id === 'refNum' ||
        document.activeElement?.id === 'repoName' ||
        document.activeElement?.id === 'branch'
      )) {
        launchInChat();
      }
      if (e.key === 'Enter' && document.activeElement?.id === 'chatInput' && !e.shiftKey) {
        e.preventDefault();
        sendPanelChat();
      }
    });
  </script>
</body>
</html>`;
  }

  private _buildMultimodalPrompt(message: string, attachments: PanelAttachment[]): string {
    if (!attachments.length) return message;
    const lines: string[] = [message, '', 'MULTIMODAL CONTEXT:'];
    for (const [idx, a] of attachments.entries()) {
      const kind = a.mimeType.startsWith('image/')
        ? 'image'
        : a.mimeType.startsWith('audio/')
          ? 'audio'
          : a.mimeType.startsWith('video/')
            ? 'video'
            : 'file';
      lines.push(`- attachment ${idx + 1}: ${a.name} (${kind}, ${a.mimeType}, ${Math.round(a.size / 1024)}KB)`);

      if (kind === 'image') {
        lines.push('  media_note: image will be analyzed by backend multimodal path if supported by current model.');
      }
      if (kind === 'audio' || kind === 'video') {
        lines.push('  media_note: audio/video will be preprocessed by backend multimodal path when available.');
      }
    }
    lines.push('');
    lines.push('Use multimodal context above when drafting your response.');
    return lines.join('\n');
  }
}
