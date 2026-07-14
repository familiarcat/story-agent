import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { webviewTokenStyle, type WebviewThemeId } from '@story-agent/shared/ui-tokens';
import { withDashboardTheme } from './lib/dashboardThemeLink';
import {
  BASE_DESIGN_THEORY_ID,
  BASE_DESIGN_PRINCIPLES,
  BASE_COPYRIGHT_GUARDRAILS,
  THEME_LAYER_STACK,
} from '@story-agent/shared';

function getNonce(): string {
  return randomBytes(16).toString('base64');
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

    webviewView.webview.onDidReceiveMessage((msg: Record<string, string>) => {
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
          vscode.env.clipboard.writeText(msg.text ?? '');
          vscode.window.showInformationMessage('Copied to clipboard!');
          break;
        case 'openSettings':
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'storyAgent'
          );
          break;
        case 'setTheme': {
          const nextTheme = (msg.theme ?? '').trim();
          if (!['lcars', 'dark', 'light', 'vscode'].includes(nextTheme)) break;
          vscode.workspace
            .getConfiguration('storyAgent')
            .update('uiTheme', nextTheme, vscode.ConfigurationTarget.Global)
            .then(() => {
              if (this._view) this._view.webview.html = this._buildHtml();
            });
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
    });

    // Allow Enter key on inputs to launch
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (
        document.activeElement?.id === 'refNum' ||
        document.activeElement?.id === 'repoName' ||
        document.activeElement?.id === 'branch'
      )) {
        launchInChat();
      }
    });
  </script>
</body>
</html>`;
  }
}
