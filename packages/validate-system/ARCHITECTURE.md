```
@crew/validate-system — Package Architecture
=============================================

STRUCTURE:
  packages/validate-system/
  │
  ├── bin/
  │   └── validate-system.zsh          CLI entry point
  │
  ├── src/
  │   ├── main.zsh                     Module orchestrator
  │   └── validate_path.zsh            Core validation logic
  │
  ├── tests/
  │   ├── run-all.zsh                  Test runner
  │   ├── boundaries.zsh               /tmp boundary tests
  │   ├── traversal.zsh                ../ escape tests
  │   ├── symlink.zsh                  Symlink escape tests
  │   └── adversarial.zsh              Encoding & injection tests
  │
  ├── docs/
  │   └── RAG_REFERENCE.md             Threat model + architecture
  │
  ├── README.md                        Quick start
  ├── INTEGRATION.md                   Integration guide (all layers)
  ├── DEPLOYMENT.md                    Deployment checklist
  ├── CHANGELOG.md                     Version history
  └── package.json                     npm metadata

DEPENDENCIES:
  - Zsh 5.x+ (standard macOS)
  - No external dependencies (pure shell)
  - Optional: shellcheck (linting, CI)

PUBLIC API:
  - validate_path(path)                Check path, return normalized version
  - validate_path_or_die(path)         Check path, exit if failed

ENVIRONMENT:
  - ALLOWED_BASE                       Boundary to enforce (default: /tmp)
  - VALIDATE_SYSTEM_DEBUG              Enable debug logging (0 or 1)
  - CREW_VALIDATE_SYSTEM_ROOT          Auto-detected package root

THREAT MODEL:
  ✓ Path Traversal Protection          Prevents ../ escapes
  ✓ Symlink Escape Detection           Blocks symlink chains out of boundary
  ✓ Encoding Attack Prevention         Rejects URL/Unicode/octal tricks
  ✓ Injection Prevention               Stops NUL bytes & control chars
  ✓ Boundary Confusion Defense         Exact prefix matching, no homoglyphs

INTEGRATION PATHS:
  1. Zsh/Bash (MCP tools)              Source main.zsh, call validate_path()
  2. TypeScript/Node.js                Spawn zsh via spawnSync() or exec()
  3. OpenRouter Crew                   Load in crew task, use validate_path()
  4. Story Agent Extension             Call from fileSystem.ts
  5. CI/CD (GitHub Actions)            Tests run automatically on PR

CI/CD INTEGRATION:
  - Workflow: .github/workflows/validate-system.yml
  - Triggers: push/PR to main/dev, path filtering
  - Jobs: test, security-audit, package-integrity
  - Merge gated: All tests must pass

TESTING:
  Unit: 4 test suites (boundaries, traversal, symlink, adversarial)
  Integration: CLI tool + sourcing
  Security: Hardcoded secrets check, boundary enforcement
  CI: Automated on every PR

OWNERSHIP:
  Security Lead: Worf (Lt. Commander)
  Infrastructure: O'Brien (Chief)
  Maintenance: @crew/validate-system maintainers

VERSION: 1.0.0 (2026-08-24)
STATUS: Production-ready
REVIEW: Quarterly security audit

═══════════════════════════════════════════════════════════════════
```
