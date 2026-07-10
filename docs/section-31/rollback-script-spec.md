# Rollback Script Specification — scripts/rollback_dogfood.sh

**Owner:** O'Brien (DevOps)  
**Purpose:** Disable OpenRouter crew routing, revert VSCode chat to Copilot-only  
**SLA:** <5 minutes end-to-end  
**Date:** 2026-07-10

---

## 1. Input & Triggers

**Manual CLI Trigger:**
```bash
scripts/rollback_dogfood.sh
```

**Programmatic Input (optional):**
- `--direction=disable` (disable crew, use Copilot; default)
- `--direction=enable` (re-enable crew)
- `--dry-run` (show changes without applying)
- `--log-file` (log output to file instead of stdout)

**Automatic Trigger (NOT in MVP):**
- Token validation failure threshold: 3+ failures in 5 min
- Error rate spike: >0.5% failed requests in 30-sec window
- Crew infra unreachable: :3103 502 for >2 min
- *Implementation:* Yar monitors metrics, runs script via CI/CD webhook

---

## 2. Logic & Implementation

### 2.1 Settings Target
The script modifies VSCode user settings.json to toggle crew routing:
- **Windows/Linux:** `~/.config/Code/User/settings.json`
- **macOS:** `~/Library/Application Support/Code/User/settings.json`
- **Env override:** `VSCODE_SETTINGS_PATH` if set

### 2.2 Settings Flags (Mutually Redundant; Use First Match)
1. **Primary:** `storyAgent.hijack.enabled` (Boolean, Section 31 override)
   - `true` → crew routing active
   - `false` → crew routing disabled, Copilot fallback

2. **Fallback:** `storyAgent.routing.enableOpenRouterDefault` (Boolean, killswitch)
   - `true` → OpenRouter crew default
   - `false` → Copilot default

**Decision:** Script toggles `storyAgent.hijack.enabled` only (primary control).

### 2.3 Execution Steps (Idempotent)

1. **Validate settings file exists & is valid JSON**
   - If missing: create with `{ "storyAgent.hijack.enabled": false }`
   - If invalid JSON: log error, exit 1

2. **Backup current settings**
   - Copy to `settings.json.backup.$(date +%s)`
   - Retain last 5 backups (remove older)

3. **Toggle hijack.enabled flag**
   - Read current value (default: `true`)
   - Set to opposite (`false` for disable, `true` for enable)
   - Write back with `jq` to preserve other settings

4. **Log action**
   - Format: `[ISO8601_TIMESTAMP] ROLLBACK_DIRECTION user=<USER> old_value=<BOOL> new_value=<BOOL> file=<PATH>`
   - Append to `~/.story-agent/rollback-audit.log`
   - Print to stdout with same format

5. **Signal extension reload**
   - Mechanism: Write sentinel file `.story-agent/reload.signal` with timestamp
   - VSCode extension watches this file and reloads on change
   - (Alternative: `code --command story-agent.reloadExtension` if available)

6. **Verify & exit**
   - Wait 500ms
   - Read settings.json and confirm toggle was applied
   - Exit 0 if success, exit 1 if verify fails
   - Print: "Rollback complete. VSCode extension should auto-reload in 1–2 sec."

---

## 3. Tester Experience (Observable Output)

**During rollback (0–3 sec):**
- Script runs: `$ scripts/rollback_dogfood.sh`
- Output: `[2026-07-10T09:15:30Z] Rolling back crew routing → Copilot default...`
- VSCode chat input briefly shows: "Chat unavailable — extension reloading" (optional UX)

**After reload (3–5 sec):**
- VSCode extension re-registers, native chat provider unloads
- Chat now defaults to Copilot (or manual provider toggle)
- Notification: "OpenRouter rollback complete. Using Copilot as default."
- No error in debug console (clean reload)

**Chat history:** Preserved in VSCode history pane (no data loss).

---

## 4. SLA: <5 Minutes End-to-End

| Phase | Duration | Mechanism |
|-------|----------|-----------|
| Settings write | <100ms | `jq` in-place edit |
| Backup creation | <100ms | `cp` |
| Extension reload signal | <100ms | Sentinel file touch |
| VSCode extension processes signal | 1–2 sec | File watcher + reload |
| Chat defaults back to Copilot | 1–2 sec | Native provider registration order |
| **Total** | **<5 sec** | Verified with stopwatch per test |

---

## 5. Reversibility

**Re-enable crew routing:**
```bash
scripts/rollback_dogfood.sh --direction=enable
```

Changes `storyAgent.hijack.enabled` back to `true`. VSCode reloads, crew routing is default again. No data migration needed.

**Backup recovery:**
```bash
cp ~/.config/Code/User/settings.json.backup.<TIMESTAMP> ~/.config/Code/User/settings.json
```

Restores a previous known-good settings state (e.g., if toggle script fails).

---

## 6. Side Effects & Data Safety

| Concern | Impact | Mitigation |
|---------|--------|-----------|
| **Chat history loss** | None | History stored in VSCode, not in settings |
| **Extension state loss** | None | Extension data (caches, session state) persists |
| **Crew brain connection** | Severed | Script only toggles local setting, doesn't affect :3103 |
| **Copilot fallback availability** | Requires valid Copilot subscription | Script assumes Copilot is available (warning if not detected) |
| **Settings.json corruption** | Rollback stops if JSON invalid | Validation + backup on every run |
| **Concurrent settings edits** | File lock race | Use `flock` to ensure serial writes |
| **Partial write (crash)** | Settings left in bad state | Backup + atomic `jq` write prevents partial state |

---

## 7. Error Handling & Logging

**Exit codes:**
- `0`: Success (toggle applied, verified)
- `1`: Failure (invalid settings, JSON corruption, verify failed)
- `2`: Operational error (permission denied, disk full)

**Logging:**
- Every run: `~/.story-agent/rollback-audit.log` (append)
- Format: `[ISO8601] ACTION user=<USER> direction=<disable|enable> old_value=<BOOL> new_value=<BOOL> status=<OK|FAIL> elapsed_ms=<INT>`
- Retention: Keep 30 days of logs

**Dry-run verification:**
```bash
scripts/rollback_dogfood.sh --dry-run
# Output:
# Would toggle storyAgent.hijack.enabled from TRUE to FALSE
# Would write backup to: /Users/bradygeorgen/Library/Application Support/Code/User/settings.json.backup.1720601730
# (No actual changes applied)
```

---

## 8. Testing Checklist (Pre-Flight)

- [ ] Script tested on macOS (settings path)
- [ ] Script tested on Linux (settings path)
- [ ] Script tested on Windows (settings path with forward slashes)
- [ ] Idempotency: Run twice, verify same final state
- [ ] Rollback → Enable cycle: Complete <10 sec
- [ ] Backup creation & cleanup (max 5 retained)
- [ ] Corrupted JSON handling (graceful error)
- [ ] Permission denied on settings.json (clear error message)
- [ ] Dry-run mode: No changes applied
- [ ] Sentinel file & extension reload integration tested
- [ ] Audit log written correctly
- [ ] Exit code correctness (0 on success, 1 on failure)

---

## 9. Future Enhancements

- Automatic trigger via Yar's metrics watcher (token failure threshold)
- Parallel rollback across multiple testers (batch flag)
- Slack notification when rollback initiated + reason
- Dashboard visualization of rollback history
- Rollback approval gate (2-person sign-off for prod)
