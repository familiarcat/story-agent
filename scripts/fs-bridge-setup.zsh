#!/usr/bin/env zsh
# Story Agent File System Bridge Setup
# Idempotent IPC bridge file generator for Electron-based R/W access
# Run from ./scripts/: ./fs-bridge-setup.zsh

set -euo pipefail

# --- CONFIGURATION ---
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MAIN_IPC_FILE="$REPO_ROOT/src/main/ipc-handlers.ts"
RENDERER_BRIDGE_FILE="$REPO_ROOT/src/renderer/fs-bridge.ts"
TYPES_FILE="$REPO_ROOT/src/types/fs-bridge.d.ts"

# --- SAFETY CHECKS ---
function confirm_or_create_dir() {
  local dir="$(dirname "$1")"
  if [[ ! -d "$dir" ]]; then
    mkdir -p "$dir" || { echo "❌ Failed to create directory: $dir"; exit 1; }
    echo "📂 Created directory: $dir"
  fi
}

# --- FILE GENERATORS ---
function write_main_ipc() {
  cat > "$1" << 'EOF'
import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

ipcMain.handle('fs:write', async (_event, filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  return { success: true, path: filePath };
});

ipcMain.handle('fs:read', async (_event, filePath: string) => {
  return fs.readFile(filePath, 'utf8');
});

ipcMain.handle('fs:exists', async (_event, filePath: string) => {
  return fs.access(filePath).then(() => true).catch(() => false);
});
EOF
}

function write_renderer_bridge() {
  cat > "$1" << 'EOF'
import { FileWriteResult } from '../types/fs-bridge';

export async function writeFile(path: string, content: string): Promise<FileWriteResult> {
  return window.electronAPI.invoke('fs:write', path, content);
}

export async function readFile(path: string): Promise<string> {
  return window.electronAPI.invoke('fs:read', path);
}

export async function fileExists(path: string): Promise<boolean> {
  return window.electronAPI.invoke('fs:exists', path);
}
EOF
}

function write_types() {
  cat > "$1" << 'EOF'
export interface FileWriteResult {
  success: boolean;
  path: string;
  error?: string;
}
EOF
}

# --- EXECUTION ---
echo "🛠️  Building Story Agent FS Bridge..."

confirm_or_create_dir "$MAIN_IPC_FILE"
confirm_or_create_dir "$RENDERER_BRIDGE_FILE"
confirm_or_create_dir "$TYPES_FILE"

write_main_ipc "$MAIN_IPC_FILE"
write_renderer_bridge "$RENDERER_BRIDGE_FILE"
write_types "$TYPES_FILE"

echo "✅ FS Bridge setup complete! Files:"
echo "   - Main Process: $MAIN_IPC_FILE"
echo "   - Renderer: $RENDERER_BRIDGE_FILE"
echo "   - Types: $TYPES_FILE"
```

### Key Features:  
1. **Idempotent** – Safe to rerun (won’t fail if files/dirs exist).  
2. **Relative Paths** – Works from `./scripts/` via `git rev-parse` (falls back to `pwd`).  
3. **Full Type Safety** – Includes TypeScript declarations.  

### Post-Run Validation