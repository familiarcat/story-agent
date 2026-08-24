# @crew/validate-system

A security-first path validation utility for MCP operations and crew infrastructure. Designed to be the canonical filesystem boundary enforcement component across Story Agent, the OpenRouter crew, and MCP tools.

## Purpose

`@crew/validate-system` enforces a strict security boundary: MCP operations and agent-initiated filesystem work **must** target only whitelisted base paths (e.g., `/tmp`). This prevents path traversal, symlink escapes, and out-of-boundary writes.

## Architecture

```
OpenRouter Crew / MCP
        │
        ▼
MCP Tool (filesystem operation)
        │
        ▼
@crew/validate-system
        │
        ├── normalize (realpath + resolve symlinks)
        ├── whitelist (check against ALLOWED_BASE)
        ├── depth (prevent directory traversal)
        ├── symlink (detect/prevent symlink escapes)
        └── policy (enforce access control)
        │
        ▼
Filesystem operation (allowed or denied)
```

## Components

### `src/main.zsh`
Entry point. Orchestrates normalize → whitelist → symlink checks.

### `src/validate_path.zsh`
Core validation logic: path normalization, boundary checking, symlink resolution.

### `src/components/`
- `normalize.zsh` — Resolve `.`, `..`, symlinks to real paths
- `whitelist.zsh` — Check resolved path against `ALLOWED_BASE`
- `symlink.zsh` — Detect symlink traversal attacks
- `errors.zsh` — Structured error reporting (for RAG/audit)

### `tests/`
Adversarial test suite run in CI:
- `traversal.zsh` — `../../../` and homoglyph variants
- `symlink.zsh` — Symlink chains and crossing boundaries
- `boundaries.zsh` — `/tmp` boundary validation
- `adversarial.zsh` — Injection, encoding, edge cases

### `docs/RAG_REFERENCE.md`
RAG specification: threat model, validation rules, integration examples.

## Installation

As an npm package:
```bash
pnpm add -D @crew/validate-system
```

From the monorepo in CI/MCP:
```bash
source "$(pnpm ls -r @crew/validate-system --depth 0 | grep validate-system | awk '{print $2}')/src/main.zsh"
```

## Quick Start

```bash
#!/usr/bin/env zsh
source "${CREW_VALIDATE_SYSTEM_ROOT:-$(dirname "$0")}/src/main.zsh"

# Validate a path before operation
if validate_path "/tmp/user-data"; then
  echo "✅ Path approved"
else
  echo "❌ Security boundary violation"
  exit 1
fi
```

## Testing

Run the full adversarial suite:
```bash
pnpm --filter @crew/validate-system test
```

Single test file:
```bash
zsh packages/validate-system/tests/symlink.zsh
```

CI enforces all tests pass before merge.

## RAG Integration

For crew memory and documentation:
- See `docs/RAG_REFERENCE.md` for threat model and specification
- Crew can search RAG for "validate-system security policy" to recall this component
- Changes to security rules must be documented in `docs/RAG_REFERENCE.md` before merge

## Versioning

Follows monorepo semver. Security updates go to patch; policy changes to minor; API changes to major.

## Security Policy

**No traversal.** `../`, homoglyphs, encoding tricks rejected.  
**No symlink escape.** Symlinks must resolve within ALLOWED_BASE.  
**No injection.** NUL bytes, spaces, quotes handled safely.  
**No boundary confusion.** /tmp/… must stay in /tmp.

See `docs/RAG_REFERENCE.md` for full threat model.

## License

Story Agent internal infrastructure. See repository LICENSE.
