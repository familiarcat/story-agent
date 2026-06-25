import * as vscode from 'vscode';

/**
 * Lightweight context providers (v1 — grep + file-tree only, NO embeddings, per the crew's scope
 * decision). Two sources, both stable VS Code APIs:
 *   1. Attached file references (the chat #file / drag-in) → request.references
 *   2. `codebase: <query>` directive in the prompt → workspace grep over source files
 * Returns a CONTEXT block to prepend to the agent/ask turn, plus the prompt with the directive removed.
 */

const SOURCE_GLOB = '**/*.{ts,tsx,js,jsx,mjs,cjs,json,md,py,go,java,rs,sh,sql,yml,yaml,tf}';
const EXCLUDE_GLOB = '**/{node_modules,dist,.git,.next,out,build,.terraform}/**';
const MAX_FILES = 300;
const MAX_MATCHES = 24;
const MAX_FILE_BYTES = 12_000;

async function readTruncated(uri: vscode.Uri): Promise<string> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  const slice = bytes.length > MAX_FILE_BYTES ? bytes.slice(0, MAX_FILE_BYTES) : bytes;
  return Buffer.from(slice).toString('utf8');
}

/** Grep source files for a query, returning up to MAX_MATCHES `path:line: text` snippets. */
async function grepCodebase(query: string, token: vscode.CancellationToken): Promise<string[]> {
  const q = query.toLowerCase();
  const files = await vscode.workspace.findFiles(SOURCE_GLOB, EXCLUDE_GLOB, MAX_FILES, token);
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  const hits: string[] = [];
  for (const f of files) {
    if (token.isCancellationRequested || hits.length >= MAX_MATCHES) break;
    let text: string;
    try { text = await readTruncated(f); } catch { continue; }
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length && hits.length < MAX_MATCHES; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        const rel = f.fsPath.startsWith(root) ? f.fsPath.slice(root.length + 1) : f.fsPath;
        hits.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 200)}`);
      }
    }
  }
  return hits;
}

export interface GatheredContext {
  /** CONTEXT block to prepend, or '' if none. */
  contextBlock: string;
  /** The prompt with any `codebase:` directive stripped. */
  prompt: string;
  /** Short human note of what was attached, for the stream. */
  note?: string;
}

export async function gatherChatContext(
  request: vscode.ChatRequest,
  token: vscode.CancellationToken
): Promise<GatheredContext> {
  const parts: string[] = [];
  const notes: string[] = [];
  let prompt = request.prompt;

  // 1. Attached file references (#file / drag-in).
  for (const ref of request.references ?? []) {
    const val: any = (ref as any).value;
    const uri: vscode.Uri | undefined = val instanceof vscode.Uri ? val : val?.uri;
    if (!uri) continue;
    try {
      const content = await readTruncated(uri);
      const name = uri.path.split('/').pop() ?? uri.path;
      parts.push(`# Attached file: ${name}\n\`\`\`\n${content}\n\`\`\``);
      notes.push(name);
    } catch { /* ignore unreadable refs */ }
  }

  // 2. `codebase: <query>` directive → workspace grep.
  const m = prompt.match(/codebase:\s*("([^"]+)"|(\S[^\n]*))/i);
  if (m) {
    const query = (m[2] ?? m[3] ?? '').trim();
    prompt = prompt.replace(m[0], '').trim();
    if (query) {
      const hits = await grepCodebase(query, token);
      if (hits.length) {
        parts.push(`# Codebase matches for "${query}" (grep):\n${hits.map(h => `- ${h}`).join('\n')}`);
        notes.push(`codebase:"${query}" (${hits.length} matches)`);
      } else {
        notes.push(`codebase:"${query}" (no matches)`);
      }
    }
  }

  return {
    contextBlock: parts.length ? `CONTEXT (provided by the editor):\n\n${parts.join('\n\n')}\n\n---\n\n` : '',
    prompt,
    note: notes.length ? `📎 Context: ${notes.join(', ')}` : undefined,
  };
}
