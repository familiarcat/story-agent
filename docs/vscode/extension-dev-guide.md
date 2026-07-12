# VSCode Extension Development Guide — Hot-Reload System

## Quick Start

### Setup (One-time)

```bash
# 1. Open the Story Agent VSCode Extension in its own VSCode window
code /Users/bradygeorgen/Developer/story-agent/packages/vscode-extension

# 2. In VSCode, press F5 or select "Run → Start Debugging"
#    This opens an "Extension Development Host" (a special VSCode instance)
#    where your extension runs in real-time
```

### Development Workflow

**Terminal 1: Watch & Rebuild**
```bash
cd packages/vscode-extension
pnpm watch
# or for auto-reload (see below):
pnpm dev:hot
```

**Terminal 2: Run your VSCode instance**
```bash
# Use the Extension Development Host (F5 in VSCode)
# Or run from CLI:
code --extensionDevelopmentPath=/path/to/vscode-extension --enable-proposed-api
```

---

## Hot-Reload System

### How It Works

The hot-reload system:
1. **esbuild watches** `src/**/*.ts` for changes
2. **Rebuilds** `dist/extension.js` when files change (takes ~500ms)
3. **Detects** the rebuild and sends reload signal
4. **VSCode reloads** the extension host automatically (no manual restart needed)

### Commands

| Command | Purpose | Use Case |
|---------|---------|----------|
| `pnpm watch` | Just rebuild on changes | Default dev workflow |
| `pnpm dev:hot` | Watch + auto-reload VSCode | Active development (newer approach) |
| `pnpm dev` | Old name for watch | (deprecated, use `pnpm watch`) |
| `pnpm build` | Single production build | CI/deployment |

### The Manual Workflow (If Auto-Reload Fails)

If auto-reload doesn't work, you can manually reload:

1. **In Extension Development Host VSCode**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type: **Restart Extension Host**
   - Press Enter

2. **Or reload the window**:
   - `Ctrl+R` / `Cmd+R`
   - This reloads everything

### Debugging

**Set Breakpoints**:
1. Open a `.ts` file in the editor
2. Click in the left margin to set a breakpoint (red dot)
3. Trigger the extension command (e.g., chat with `@story-agent`)
4. Execution will pause at your breakpoint

**View Logs**:
```
VSCode Menu → View → Output → Select "Story Agent" from dropdown
```

**Console**:
```
F5 → Debug Console tab (shows console.log output from extension)
```

---

## Architecture: Why Hot-Reload Matters

### Without Hot-Reload (Old Workflow)
```
Edit src/extension.ts
  ↓ (need to remember to rebuild)
Run: pnpm build  
  ↓ (manually wait)
Close extension in VSCode
  ↓ (manual step)
Restart VSCode
  ↓ (manual step, ~5-10 seconds)
Test changes
```
**Total time: 30-60 seconds per iteration**

### With Hot-Reload (New Workflow)
```
Edit src/extension.ts
  ↓ (auto-rebuild ~500ms)
esbuild detects change
  ↓ (auto-detected ~100ms)
VSCode reloads
  ↓ (auto-reload ~1 second)
Test changes
```
**Total time: ~2 seconds per iteration** ⚡

---

## Integration with Crew Updates

The VSCode extension now reflects:

✅ **Crew auto-organization**: Chat participant receives complexity score context
✅ **Outcome tracking**: Can surface past mission outcomes in chat UI
✅ **Picard unification**: Shows single unified plan when consensus reached
✅ **Plan → Build → Observe**: Navigation commands route to each phase

When crew capabilities change:
1. Backend updates crew mission pipeline
2. Extension receives updated responses in chat participant
3. Hot-reload ensures new UI logic is live immediately

---

## Troubleshooting

### Hot-reload not working?

**Problem**: Files rebuild but VSCode doesn't reload
**Solution**: Manually restart (Cmd+Shift+P → "Restart Extension Host")

**Problem**: esbuild shows errors but extension doesn't rebuild
**Solution**: Check the esbuild output. Common issues:
- TypeScript errors in src files (fix them)
- Import errors (verify module paths)
- Missing dependencies (run `pnpm install`)

**Problem**: Extension changes don't appear in chat
**Solution**: 
- Close and reopen the chat panel
- Or reload the entire VSCode window (Cmd+R)

### Performance issues?

**Slow rebuild?**
- Check: `pnpm typecheck` (make sure TypeScript compiles)
- Try: Increase esbuild parallelism if CPU-bound

**High CPU?**
- esbuild watch is normal (idle ~1% CPU)
- If stuck above 20%, there's likely an infinite loop in file watching
- Kill and restart: `pnpm watch`

---

## Development Tips

### 1. Keep Sourcemp Enabled
Sourcemaps let you debug `.ts` code directly (not minified `.js`).
The `watch` command includes `--sourcemap` automatically.

### 2. Test in the Extension Development Host
The EH (Extension Development Host) is a real VSCode instance where your extension runs.
It's separate from your main VSCode, so you can keep working while developing.

### 3. Leverage Quick Commands
- Press `Cmd+Shift+P` → type partial command name
- `> story-agent: ...` shows all extension commands
- `> test: ...` runs test suite
- `> ext: ...` (if you add them)

### 4. Use Crew Memory During Development
```typescript
// In your extension code, you can call crew tools:
import { getRelevantObservationMemories } from '@story-agent/shared/db';

// Fetch past deliberations during development
const memories = await getRelevantObservationMemories({
  queryText: "complexity estimation",
  limit: 5
});
```

This lets you test how the extension interacts with crew knowledge.

### 5. Git Diff for Changes
```bash
# Always know what you're changing:
git status                           # What files changed?
git diff src/extension.ts            # What changed in this file?
git diff packages/vscode-extension   # All extension changes
```

---

## Integration Checklist

- ✅ Extension receives crew mission plans from `/chat` API
- ✅ Chat participant uses complexity score for context
- ✅ Observation Lounge link in sidebar shows past outcomes
- ✅ Navigation tree shows Plan/Build/Observe entry points
- ✅ Commands trigger crew:record-memory-outcome for outcomes
- ✅ Sidebar surfaces crew deliberation status in real-time

**Testing the integration**:
1. Open Extension Development Host (F5)
2. Start a chat with `@story-agent ask "design the auth flow"`
3. Observe:
   - Complexity score in response context
   - 3 alternatives (or 1 unified plan if consensus)
   - Variance flag (if crew disagreed)
4. Try: `@story-agent plan "... "` for plan-only mode
5. Click: Observation Lounge link to see past outcomes

---

## Performance Metrics

Expected rebuild times with hot-reload:

| Component | Time |
|-----------|------|
| File save → esbuild rebuild | ~500ms |
| esbuild → reload signal | ~100ms |
| VSCode extension host reload | ~1s |
| **Total** | **~1.6s** |

Compare to manual restart: ~30-60s saved per iteration! 🎉

---

## Future Improvements

- [ ] Reload only changed modules (faster feedback)
- [ ] Hot-replace webview content without full reload
- [ ] Persist debug state across reloads
- [ ] Integration tests that verify crew ↔ extension contract
