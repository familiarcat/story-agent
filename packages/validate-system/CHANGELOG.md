# Changelog

All notable changes to `@crew/validate-system` are documented here.

## [1.0.0] — 2026-08-24

### Added
- **Core validation engine** (`src/validate_path.zsh`)
  - Path normalization (realpath, symlink resolution)
  - Boundary enforcement (`ALLOWED_BASE` containment)
  - Symlink escape detection (chain traversal prevention)
  - Injection attack detection (NUL bytes, control chars)

- **Orchestrator module** (`src/main.zsh`)
  - Component loader and initialization
  - Public API exports

- **CLI tool** (`bin/validate-system.zsh`)
  - Command-line interface with `--base`, `--debug` options
  - Help documentation

- **Comprehensive test suite**
  - `tests/boundaries.zsh` — /tmp boundary enforcement
  - `tests/traversal.zsh` — Path traversal attack prevention
  - `tests/symlink.zsh` — Symlink escape prevention
  - `tests/adversarial.zsh` — Encoding, injection, edge cases
  - `tests/run-all.zsh` — Master test runner

- **Documentation**
  - `README.md` — Package overview and quick start
  - `docs/RAG_REFERENCE.md` — Threat model, architecture, integration examples
  - `INTEGRATION.md` — Step-by-step integration guide for all layers
  - `CHANGELOG.md` — Version history

- **CI/CD Integration**
  - `.github/workflows/validate-system.yml` — Automated test runner
  - Security audit checks
  - Package integrity verification

- **Package metadata**
  - `package.json` with npm scripts and workspace registration
  - Full monorepo integration via `@crew/validate-system`

### Security Features
- ✅ Path traversal prevention (`../` rejection)
- ✅ Symlink escape detection (chain walking + depth limit)
- ✅ Encoding trick detection (URL, Unicode, octal)
- ✅ Injection prevention (NUL bytes, control chars)
- ✅ Boundary confusion prevention (exact prefix matching)
- ✅ Configurable `ALLOWED_BASE` (default `/tmp`)
- ✅ Symmetric security model (validated by both source and validator)

### Known Limitations
- Relative symlinks not yet resolved relative to symlink directory
- No dynamic policy file support (hardcoded `ALLOWED_BASE` env var)
- No namespace/container boundary support (filesystem-only)

### Testing
- All 4 test suites pass (boundaries, traversal, symlink, adversarial)
- CI/CD integrated: tests run on every PR
- Merge blocks on test failure

### Version Policy
Follows monorepo semver:
- **Patch:** Bug fixes, test improvements
- **Minor:** Policy changes (e.g., new attack vector defense)
- **Major:** API changes (function signatures, environment vars)

---

**Status:** Production-ready  
**Owners:** Worf (Security), O'Brien (Infrastructure)  
**Review Cycle:** Quarterly security audit
