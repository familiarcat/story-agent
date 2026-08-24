# @crew/validate-system — RAG Reference

**Component:** Path Validation & Security Boundary Enforcement  
**Version:** 1.0.0  
**Status:** Infrastructure (Crew-shared)  
**Owners:** Worf (Security), O'Brien (Infrastructure)  

---

## Purpose

`@crew/validate-system` is the canonical security subsystem enforcing filesystem boundaries for MCP tools, Story Agent, and the OpenRouter crew. It prevents:

- **Path Traversal:** `../`, `../../`, etc. cannot escape `/tmp`
- **Symlink Escape:** Symlink chains cannot resolve outside `/tmp`
- **Encoding Tricks:** URL encoding, Unicode homoglyphs, octal escapes
- **Injection:** NUL bytes, control characters, newline injection
- **Boundary Confusion:** Paths like `/tmp2`, `/tmpX`, `/var/tmp` are rejected

## Architecture

```
┌──────────────────────────────────────────┐
│  MCP Tool / OpenRouter Crew               │
│  (filesystem operation request)           │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│  @crew/validate-system/main.zsh           │
│  (orchestrator)                           │
└──────────────────┬───────────────────────┘
                   │
      ┌────────────┼────────────┐
      ▼            ▼            ▼
  normalize    whitelist    symlink_escape
  (realpath)  (boundary)    (chain check)
      │            │            │
      └────────────┼────────────┘
                   │
                   ▼
      ┌─────────────────────────┐
      │  ALLOW / DENY           │
      │  + Real path            │
      └─────────────────────────┘
```

## Public API

### Function: `validate_path <path>`

Validate a path for safe filesystem access.

**Input:**  
- `$1` — path to validate (absolute or relative)

**Output:**  
- `stdout` — Real (normalized) path if valid
- `return 0` — Path is valid and safe
- `return 1` — Validation failed (details on stderr)

**Example:**
```bash
#!/usr/bin/env zsh
source "${CREW_VALIDATE_SYSTEM_ROOT}/src/main.zsh"

if SAFE_PATH="$(validate_path /tmp/user-data)"; then
  echo "✅ Access granted: $SAFE_PATH"
  # Safe to proceed with filesystem operations
else
  echo "❌ Security violation"
  exit 1
fi
```

### Function: `validate_path_or_die <path>`

Like `validate_path`, but exits the process if validation fails.

**Example:**
```bash
SAFE_PATH="$(validate_path_or_die /tmp/critical-data)"
```

### Environment Variables

- **`ALLOWED_BASE`** (default: `/tmp`)  
  The filesystem root within which all paths must resolve.

- **`VALIDATE_SYSTEM_DEBUG`** (default: `0`)  
  Set to `1` for debug logging on stderr.

- **`CREW_VALIDATE_SYSTEM_ROOT`**  
  Automatically detected; the absolute path to the package directory.

## Threat Model

### Attack 1: Path Traversal

**Threat:** Use `../` sequences to escape the boundary.

**Examples:**
- `/tmp/../../../etc/passwd` → normalized to `/etc/passwd` → DENIED
- `/tmp/file/../../etc` → normalized to `/etc` → DENIED

**Defense:** Normalize the path using `realpath` and check that the result starts with `$ALLOWED_BASE`.

---

### Attack 2: Symlink Escape

**Threat:** Create symlinks that chain outside the boundary.

**Example:**
```bash
ln -s /etc/passwd /tmp/link
validate_path /tmp/link  # Should DENY
```

**Defense:** Walk the path component-by-component. For each symlink encountered:
1. Resolve its target
2. Check that the target also stays within `$ALLOWED_BASE`
3. Detect loops (depth limit)

---

### Attack 3: Encoding / Homoglyph Tricks

**Threat:** Use URL encoding, Unicode combining chars, or octal escapes to hide traversal.

**Examples:**
- `/tmp/%2e%2e/passwd` (URL: `..`)
- `/tmp/．．/passwd` (Unicode dot U+FF0E)
- `/tmp/\056\056/passwd` (Octal `..`)

**Defense:** Reject paths with:
- NUL bytes (`\0`)
- Control characters (`\x01`–`\x1f` except newline)
- Unusual Unicode (detected at call time; actual expansion happens during realpath)

---

### Attack 4: Boundary Confusion

**Threat:** Exploit similar-sounding paths.

**Examples:**
- `/tmpfoo/file` (similar to `/tmp` but different)
- `/tmp2/file` (looks like `/tmp` variant)
- `/var/tmp/file` (real directory, but outside boundary)

**Defense:** Exact prefix matching after normalization. Path must be **exactly** `$ALLOWED_BASE` or start with `$ALLOWED_BASE/`.

---

### Attack 5: Injection into Downstream Tools

**Threat:** Use spaces, quotes, newlines to confuse downstream tools.

**Example:**
```bash
# Attacker crafts
path="/tmp/file.txt\n/etc/passwd"

# Downstream tool naively splits on newline
```

**Defense:** Reject paths with control characters (including newline, CR) at validation time.

## Validation Rules (in order)

1. **Reject Injection:** NUL bytes, control characters
2. **Normalize:** Resolve symlinks, flatten `.` and `..`
3. **Check Boundary:** Verify result is within `$ALLOWED_BASE`
4. **Detect Symlink Escape:** Walk path for symlink chains crossing boundary
5. **Return Result:** Real path (normalized) or failure

## Integration Examples

### MCP Tool Example

```zsh
# MCP server tool: `read_file_safe`
read_file_safe() {
  local user_path="$1"
  
  # Load validator
  source "${CREW_VALIDATE_SYSTEM_ROOT}/src/main.zsh"
  
  # Validate before access
  if ! SAFE_PATH="$(validate_path "$user_path")"; then
    echo "Error: Path validation failed" >&2
    return 1
  fi
  
  # Safe to read
  cat "$SAFE_PATH"
}
```

### Story Agent Extension Example

```typescript
// src/fileSystem.ts
import { spawnSync } from 'child_process';

export async function readWorkspaceFileSafe(relativePath: string): Promise<string> {
  const { CREW_VALIDATE_SYSTEM_ROOT } = process.env;
  
  // Call the validator via zsh
  const result = spawnSync('zsh', [
    '-c',
    `source ${CREW_VALIDATE_SYSTEM_ROOT}/src/main.zsh && validate_path "${relativePath}"`,
  ], { encoding: 'utf8' });
  
  if (result.status !== 0) {
    throw new Error(`Path validation failed: ${result.stderr}`);
  }
  
  const safePath = result.stdout.trim();
  // Now safe to read
  return fs.readFileSync(safePath, 'utf8');
}
```

### OpenRouter Crew Example

```bash
# crew-core.ts bridge (MCP tool implementation)
crew_validate_path() {
  local target="$1"
  
  # Crew member calls the validator
  source "${CREW_VALIDATE_SYSTEM_ROOT}/src/main.zsh"
  validate_path "$target"
}
```

## Testing

### Run All Tests

```bash
pnpm --filter @crew/validate-system test
```

### Run Single Suite

```bash
zsh packages/validate-system/tests/boundaries.zsh
zsh packages/validate-system/tests/traversal.zsh
zsh packages/validate-system/tests/symlink.zsh
zsh packages/validate-system/tests/adversarial.zsh
```

### CI Integration

GitHub Actions runs the full test suite on every PR to `main`:

```yaml
# .github/workflows/validate-system.yml
- name: Run validate-system tests
  run: pnpm --filter @crew/validate-system test
```

Merge is blocked if tests fail.

## Known Limitations

1. **Relative symlinks:** Not yet resolved relative to the symlink's directory (on roadmap).
2. **Case sensitivity:** Tests assume Unix filesystem (case-sensitive). macOS may differ.
3. **No chroot/namespace support:** Does not handle containerized boundaries (only filesystem).

## Future Roadmap

- [ ] Modular components (`components/*.zsh`)
- [ ] TypeScript wrapper for Node.js integration
- [ ] Policy file support (dynamic `ALLOWED_BASE`)
- [ ] Audit logging (JSON audit trail)
- [ ] Performance benchmarking (realpath cost for large paths)

## Related Documentation

- **Security Policy:** See `docs/security/filesystem-boundaries.md`
- **Crew Handbook:** Section "Infrastructure → Filesystem Safety"
- **MCP Integration:** `docs/crew/mcp-tool-template.md`

## Contacts

- **Security Lead:** Worf (Lt. Commander)
- **Infrastructure:** O'Brien (Chief)
- **Code Owner:** `@crew/validate-system` maintainers

---

**Last Updated:** 2026-08-24  
**Status:** Active, Production  
**Review Cycle:** Quarterly security audit
