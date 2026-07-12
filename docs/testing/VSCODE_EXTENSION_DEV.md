# VSCode Extension Development Guide

## Quick Start

```bash
# Terminal 1: Start MCP server (backend)
pnpm mcp

# Terminal 2: Build extension in watch mode
cd packages/vscode-extension
pnpm watch

# Terminal 3 (VSCode): Open "Run and Debug" view (Cmd+Shift+D)
#   → Select "Launch Extension Host"
#   → Press F5
#   → New VSCode window opens with your extension running
```

## Development Flow

### Making Changes to Extension Code

1. **Source files** are in `packages/vscode-extension/src/`
2. **Changes auto-compile** (pnpm watch)
3. **Extension auto-reloads** in Extension Host
4. **No manual rebuild needed** (hot reload works)

### Key Extension Files

| File | Purpose |
|------|---------|
| `extension.ts` | Main activation & command registration |
| `chatEngine.ts` | MCP communication, chat UI rendering |
| `crew-status-display.ts` | Real-time crew status formatting |
| `package.json` | Extension metadata, commands, keybindings |

### Common Changes

**Add a new chat command:**
```typescript
// extension.ts
context.subscriptions.push(
  vscode.commands.registerCommand('story-agent.newCommand', async () => {
    // implementation
  })
);
```

**Update chat display:**
- Edit `chatEngine.ts` → `streamCrewStatusUpdates()` function
- Changes to markdown formatting appear instantly in chat

**Modify crew status widget:**
- Edit `crew-status-display.ts` → formatting functions
- Rebuild, reload extension, chat will show updated format

## Debugging Extension

### Method 1: VS Code Debug View (Recommended)

```
F5 (Launch Extension Host)
  ↓
Extension Host window opens
  ↓
Open Chrome DevTools in THAT VSCode window:
  Cmd+Shift+I (or View → Toggle Developer Tools)
  ↓
Set breakpoints in sources, use console
```

### Method 2: Remote Debugging

```bash
# Start extension with remote debugging
node --inspect-brk=9333 ./node_modules/.bin/esbuild \
  src/extension.ts --bundle --platform=node ...
```

Then visit `chrome://inspect` in Chrome.

### Method 3: Console Logging

```typescript
const log = vscode.window.createOutputChannel("Story Agent");
log.appendLine(`Debug: ${JSON.stringify(value)}`);
log.show();
```

View in VSCode: Command Palette → "Output: Story Agent"

## Testing the Integration

### Test 1: MCP Connection

1. Start `pnpm mcp` (Terminal 1)
2. Open Extension Host (F5 in VSCode)
3. Open Chat Sidebar (Cmd+Shift+L)
4. Type a message
5. Should see response from crew

**If broken:**
```bash
# Check MCP is running
curl http://localhost:3103/health

# Check extension console
Cmd+Shift+U → "Story Agent" tab → look for errors
```

### Test 2: Dynamic Teams Display

1. Open Extension Host with MCP running
2. Type in chat: "Deploy microservice to AWS"
3. Look at crew preflight output
4. Should see **N teams** (not hardcoded 3) with different domains

**Expected output in chat:**
```
CREW SELF-ORGANIZATION PRELUDE:
...
PARALLEL TEAMS:
- Security Team [team-security-1]: worf, picard
- Infrastructure Team [team-infrastructure-2]: geordi, obrien
- Implementation Team [team-implementation-3]: riker, data
```

### Test 3: Real-Time Status Updates

1. In chat, use "engage" or "make-it-so" to start execution
2. Watch chat for live crew status cards updating every ~2s
3. Each crew member shows: task, iteration, elapsed time, status

**If status not updating:**
- Check `crew-status-display.ts` → `formatCrewStatusHeader()` 
- Verify `streamCrewStatusUpdates()` is being called
- Check console for MCP tool call errors

## Packaging Extension

```bash
# Build production version
pnpm --filter story-agent-vscode build

# Package as .vsix
pnpm ext:package

# Install locally for testing
pnpm ext:install-local

# Install on others' machines
# Send: packages/vscode-extension/story-agent-vscode-1.0.0.vsix
# They run: code --install-extension story-agent-vscode-1.0.0.vsix
```

## Useful VSCode APIs

```typescript
// Show message
await vscode.window.showInformationMessage("Hello!");

// Ask user for input
const input = await vscode.window.showInputBox({ prompt: "Enter name" });

// Show quick pick
const choice = await vscode.window.showQuickPick(["Option A", "Option B"]);

// Get chat
const chat = vscode.lm.createChatSession(vscode.LanguageModelChatSelector);

// Add to chat history
await chat.sendRequest([
  vscode.LanguageModelChatMessage.User("What is your name?")
]);
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Extension won't load | Check `package.json` syntax, rebuild |
| MCP connection fails | Verify `localhost:3103` is reachable, check firewall |
| Chat frozen | Kill Extension Host (F5 again), restart |
| Hot reload not working | Stop `pnpm watch`, run again |
| TypeScript errors | Run `pnpm typecheck`, fix before building |

---

**Tip**: Keep two terminal windows side-by-side — one for `pnpm watch` (left) and one for test commands (right).
