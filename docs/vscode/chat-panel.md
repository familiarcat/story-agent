# Chat Panel Integration — VS Code Extension

## Overview

The Story Agent VS Code Extension now includes a **native chat interface docked at the bottom of the editor**. This provides:

- **Direct crew access** with full file system context
- **Conversation history** maintained per session  
- **Cost/model transparency** — see which model answered and how much it cost
- **File attachment support** — reference workspace files in chat
- **OpenRouter-optimized routing** — Quark tier selection automatically chooses the cheapest adequate model

## Usage

### Opening the Chat Panel

**Three ways to access:**

1. **Keyboard Shortcut:** `Ctrl+Shift+K` (Windows/Linux) or `Cmd+Shift+K` (Mac)
2. **Command Palette:** `Story Agent: Open Chat (at bottom)`
3. **Programmatically:** Extension commands can launch it

### Chat Interface Features

#### Message Composition
- Type a question or request and press **Enter** (or `Ctrl+Enter`)
- Chat maintains **multi-turn conversation history** (last 8 turns sent to crew)
- Auto-scroll to latest message

#### File Attachment
- Click **📎 Attach** button to select a file from your workspace
- File content (up to 2KB) is included in the next message
- Useful for code reviews, debugging, or context

#### Response Metadata
Each assistant response shows:
- **Model**: Which LLM answered (e.g., `deepseek/deepseek-chat`)
- **Cost**: Actual USD cost of this response (e.g., `$0.00012`)
- **Sources**: RAG context sources used (e.g., `crew-memory:STORY-123`, `docs:Phase 3 Guide`)

#### Controls
- **🗑️ Clear** — Reset conversation history
- **📎 Attach** — Add a file to the conversation
- **⚙️ Settings** — Open Story Agent extension settings

## Architecture

### Backend Flow

```
User Input in Chat Panel
    ↓
VS Code webview → dashboard /api/chat endpoint
    ↓
Dashboard tries crew brain first: POST localhost:3103/chat
    ↓
If crew reachable: Quark tier selection + RAG recall (cost-optimized)
If crew unreachable: Fall back to local OpenRouter routing
    ↓
Response: answer + model + cost + sources metadata
    ↓
VS Code renders in webview with formatting
```

### Panel Architecture

**File:** `packages/vscode-extension/src/panels/ChatPanel.ts`

The `ChatPanel` class:
- Uses VS Code WebviewPanel API for docking at ViewColumn.Bottom
- Singleton pattern (only one instance per session)
- Maintains conversation history in memory (survives panel hide/show via `retainContextWhenHidden`)
- Communicates with dashboard via message relay

## Configuration

### Settings

Configure these in VS Code settings or `.vscode/settings.json`:

```json
{
  "storyAgent.agentUrl": "http://localhost:3103",
  "storyAgent.dashboardUrl": "http://localhost:3000",
  "storyAgent.chat.provider": "auto"
}
```

- `agentUrl`: The crew brain's HTTP endpoint (default: localhost:3103)
- `dashboardUrl`: The Story Agent dashboard (default: localhost:3000)
- `chat.provider`: "auto" (crew-first), "openrouter" (crew only), or "copilot" (VS Code Copilot)

### Environment Variables

The extension uses these from the shell environment:
- `CREW_LLM_APPROVED_KEY` — OpenRouter API key (required for crew routing)
- `STORY_AGENT_AGENT_URL` — Override agent endpoint
- `STORY_AGENT_RAG_URL` — RAG service endpoint (default: localhost:3102)

## Development Notes

### Testing the Chat Panel

1. **Start the full stack:**
   ```bash
   pnpm dev
   ```

2. **Open VS Code with the extension enabled:**
   - Debug extension: Press `F5` in `packages/vscode-extension`
   - Or reload the already-installed extension

3. **Open chat:**
   - Press `Ctrl+Shift+K` (or `Cmd+Shift+K` on Mac)
   - Type a message and press Enter

4. **Verify crew connection:**
   - Check that responses include model metadata
   - Confirm cost is non-zero (indicates real crew API call)
   - Verify sources are populated from RAG

### Troubleshooting

**"Chat API error: 502"**
- Dashboard URL is wrong or unreachable
- Check `storyAgent.dashboardUrl` setting
- Verify `pnpm dev` is running

**"Chat API error: 503"**
- Dashboard is running but crew brain is not reachable
- Check that `pnpm run mcp` or agent server is running on port 3103
- Verify `CREW_LLM_APPROVED_KEY` is set in the environment

**No model/cost metadata showing**
- Crew brain returned successfully, but dashboard /api/chat failed to call it
- Check dashboard logs for errors
- Verify OpenRouter API key is valid

**File attachment not working**
- Only files in the workspace can be selected
- File size is limited to 2KB in the prompt (safety measure)
- Check that VSCode has workspace folder open

## UI/UX Details

### Theme Support

The chat panel respects the configured UI theme:
- **LCARS** (default) — Matches dashboard LCARS tokens
- **Dark** — Dark mode theme
- **Light** — Light mode theme
- **VSCode** — Uses native VS Code theme variables

Configure via:
```json
{
  "storyAgent.uiTheme": "lcars"
}
```

### Styling

- Message bubbles: User (right-aligned, primary color), Assistant (left-aligned, card background)
- Code/bold formatting: Simple Markdown-to-HTML conversion for readability
- Responsive: Adapts to VS Code's webview width and theme
- No CSP issues: Uses nonce-based token injection for any inline styles

## Future Enhancements

Possible improvements to the chat panel:

1. **File preview** — Show syntax-highlighted snippets for attached files
2. **Command suggestions** — Autocomplete for crew commands like `/agent`, `/plan`, etc.
3. **Session save** — Export chat transcript to file
4. **Multi-turn file edits** — "Would you like me to apply this diff?" with accept/reject UI
5. **Code block actions** — "Copy", "Insert at cursor", "Create new file"
6. **Markdown rendering** — Full markdown support including tables and callouts
7. **Image support** — Vision capability for screenshots/diagrams

## Integration Points

### With Other Extension Features

- **Sidebar chat** — Sidebar has chat capability but uses different UX; consider consolidating
- **Inline chat** (`Ctrl+I`) — For inline code questions; chat panel is for multi-turn conversations
- **Participant chat** (`@story-agent`) — Uses VS Code's native chat; chat panel is Story Agent-native
- **Review changes** — Chat panel can help explain/justify diffs

### With Web Dashboard

- Both use the same `/api/chat` endpoint
- Both maintain separate conversation histories
- Environment/config is shared (CREW_LLM_APPROVED_KEY, agentUrl, etc.)

## Security Notes

- **File content** — Only files explicitly selected by user are included
- **Secrets** — Never log/transmit OpenRouter key (brokered via env)
- **History** — Conversation history is ephemeral (in-memory only, cleared on extension reload)
- **RAG sources** — Limited to first 5000 chars per call (size safety)

## Examples

### Example 1: Ask the crew about a file

1. Click **📎 Attach**
2. Select `src/utils/helpers.ts`
3. Ask: "Review this code for security issues"
4. Crew responds with analysis, model shown as `deepseek/deepseek-chat`

### Example 2: Multi-turn debugging

1. **User:** "Why is my build failing?"
2. **Crew:** "Need to see the error. Can you attach the build log?"
3. **User:** Attach `dist/build.log`
4. **Crew:** Analyzes and suggests fix
5. **User:** "How do I implement that?"
6. **Crew:** Provides code example (model switches to `openai/gpt-4o-mini` if complex)

### Example 3: Check crew status

1. Open chat panel
2. Ask: "What's the current status of STORY-123?"
3. Crew queries memory and returns latest update with cost/model metadata

---

**File:** [packages/vscode-extension/src/panels/ChatPanel.ts](../../packages/vscode-extension/src/panels/ChatPanel.ts)

**Command:** `story-agent.openChat`

**Keyboard:** `Ctrl+Shift+K` / `Cmd+Shift+K`
