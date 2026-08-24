# @crew/validate-system — Integration Guide

Quick reference for integrating `@crew/validate-system` into MCP tools, Story Agent, and crew workflows.

## 1. Zsh/Bash Scripts (MCP Tools)

### Source the module

```bash
#!/usr/bin/env zsh
source "${CREW_VALIDATE_SYSTEM_ROOT}/src/main.zsh"

# Or from monorepo
VALIDATE_ROOT="$(pnpm ls -r @crew/validate-system --depth 0 | grep validate-system | awk '{print $2}')"
source "${VALIDATE_ROOT}/src/main.zsh"
```

### Validate before filesystem access

```bash
# Example: Safe file read in MCP tool
read_file_safe() {
  local requested_path="$1"
  
  if ! SAFE_PATH="$(validate_path "$requested_path")"; then
    echo "Error: Access denied by security policy" >&2
    return 1
  fi
  
  cat "$SAFE_PATH"
}

# Example: Safe write
write_file_safe() {
  local target_path="$1"
  local content="$2"
  
  if ! SAFE_PATH="$(validate_path "$target_path")"; then
    echo "Error: Path validation failed" >&2
    return 1
  fi
  
  mkdir -p "$(dirname "$SAFE_PATH")"
  echo "$content" > "$SAFE_PATH"
}
```

## 2. TypeScript/Node.js (Story Agent Extension)

### Integration via child_process

```typescript
// src/utils/validatePath.ts
import { spawnSync } from 'child_process';

export function validatePath(userPath: string): string {
  const validateRootEnv = process.env.CREW_VALIDATE_SYSTEM_ROOT;
  
  if (!validateRootEnv) {
    throw new Error('CREW_VALIDATE_SYSTEM_ROOT not set');
  }
  
  const result = spawnSync('zsh', [
    '-c',
    `source "${validateRootEnv}/src/main.zsh" && validate_path "${userPath}"`,
  ], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  
  if (result.status !== 0) {
    throw new Error(`Path validation failed: ${result.stderr}`);
  }
  
  return result.stdout.trim();
}
```

### Usage in fileSystem.ts

```typescript
// src/fileSystem.ts
import * as vscode from 'vscode';
import { validatePath } from './utils/validatePath';

export async function readWorkspaceFileSafe(relativePath: string): Promise<string> {
  try {
    const safePath = validatePath(relativePath);
    // Now safe to read
    const uri = vscode.Uri.file(safePath);
    const fileData = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(fileData).toString('utf8');
  } catch (error) {
    throw new Error(`Security check failed: ${error.message}`);
  }
}
```

## 3. MCP Tool Registration (Story Agent MCP Server)

### Define a tool with validation

```typescript
// packages/mcp-server/src/tools/file-operations.ts
import { tool } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { validatePath } from '../utils/validatePath';

export const readFileTool = tool(
  'read_file_validated',
  'Read a file with security validation',
  z.object({
    path: z.string().describe('File path to read'),
  }),
  async ({ path }) => {
    // Validate path before accessing
    const safePath = validatePath(path);
    
    // Proceed with safe access
    const content = fs.readFileSync(safePath, 'utf8');
    return { content };
  }
);
```

## 4. Crew Workflow (OpenRouter Integration)

### Crew member calling validator

```bash
# Within a crew mission, e.g., Chief O'Brien's task
crew_safe_write() {
  local target="$1"
  local content="$2"
  
  # Load validator
  source "${CREW_VALIDATE_SYSTEM_ROOT}/src/main.zsh"
  
  # Validate & write
  if SAFE_TARGET="$(validate_path "$target")"; then
    mkdir -p "$(dirname "$SAFE_TARGET")"
    echo "$content" > "$SAFE_TARGET"
    echo "✅ File written: $SAFE_TARGET"
  else
    echo "❌ Security violation: cannot write to $target" >&2
    return 1
  fi
}
```

## 5. Configuration / Policy

### Override ALLOWED_BASE at runtime

```bash
# Default: /tmp
export ALLOWED_BASE="/tmp"
source "${CREW_VALIDATE_SYSTEM_ROOT}/src/main.zsh"
validate_path "/tmp/file.txt"  # ✅ Allowed

# Override for a specific operation
ALLOWED_BASE="/home/user/safe-workspace"
validate_path "/home/user/safe-workspace/project"  # ✅ Allowed
validate_path "/tmp/file.txt"  # ❌ Denied
```

### Enable debug logging

```bash
export VALIDATE_SYSTEM_DEBUG=1
source "${CREW_VALIDATE_SYSTEM_ROOT}/src/main.zsh"
validate_path "/tmp/test"  # Logs normalization steps on stderr
```

## 6. Testing Your Integration

### Unit test example (for MCP tools)

```bash
# scripts/test-my-tool-safety.zsh
#!/usr/bin/env zsh
set -euo pipefail

source "${CREW_VALIDATE_SYSTEM_ROOT}/src/main.zsh"

echo "Testing my tool's path safety..."

# Test 1: Valid path
if validate_path "/tmp/test-file.txt" >/dev/null 2>&1; then
  echo "✅ Test 1: Valid path accepted"
else
  echo "❌ Test 1 FAILED"
  exit 1
fi

# Test 2: Traversal attempt
if ! validate_path "/tmp/../../../etc/passwd" >/dev/null 2>&1; then
  echo "✅ Test 2: Traversal rejected"
else
  echo "❌ Test 2 FAILED"
  exit 1
fi

echo "✅ All safety tests passed"
```

## 7. Error Handling

### Graceful degradation

```typescript
// If validation is unavailable, fail safely
function validatePathSafely(userPath: string): string {
  try {
    return validatePath(userPath);
  } catch (error) {
    // If validator is unreachable, default to DENY
    console.error('Validator unavailable, denying access:', error);
    throw new Error('Security service unavailable');
  }
}
```

## 8. Audit & Monitoring

### Log validated operations

```bash
# Log successful validation to audit trail
validate_path_and_audit() {
  local target="$1"
  
  if RESULT="$(validate_path "$target")"; then
    echo "[$(date -Iseconds)] VALIDATED path=$target safe_path=$RESULT" >> /var/log/crew-audit.log
    echo "$RESULT"
    return 0
  else
    echo "[$(date -Iseconds)] DENIED path=$target reason='validation_failed'" >> /var/log/crew-audit.log
    return 1
  fi
}
```

## 9. Environment Setup

### In VS Code Extension launch

```json
{
  "env": {
    "CREW_VALIDATE_SYSTEM_ROOT": "/Users/user/Developer/story-agent/packages/validate-system",
    "ALLOWED_BASE": "/tmp"
  }
}
```

### In GitHub Actions

```yaml
- name: Run MCP tool with validation
  env:
    CREW_VALIDATE_SYSTEM_ROOT: ${{ github.workspace }}/packages/validate-system
    ALLOWED_BASE: /tmp
  run: ./packages/mcp-server/bin/my-tool.sh /tmp/input.txt
```

## 10. Troubleshooting

### "CREW_VALIDATE_SYSTEM_ROOT not found"

```bash
# Set manually
export CREW_VALIDATE_SYSTEM_ROOT="$(find ~/Developer -type d -name validate-system 2>/dev/null | head -1)"

# Or discover via pnpm
export CREW_VALIDATE_SYSTEM_ROOT="$(pnpm ls -r @crew/validate-system --depth 0 | grep validate-system | awk '{print $2}')"
```

### Paths unexpectedly rejected

```bash
# Enable debug to see why
export VALIDATE_SYSTEM_DEBUG=1
validate_path "/tmp/test"  # Check stderr for details
```

### Symlink issues

```bash
# If symlinks are incorrectly rejected
# Check that symlink targets resolve within ALLOWED_BASE
readlink -f /tmp/my-symlink  # Should be /tmp/...
```

---

**For comprehensive documentation, see:** [packages/validate-system/docs/RAG_REFERENCE.md](../docs/RAG_REFERENCE.md)
