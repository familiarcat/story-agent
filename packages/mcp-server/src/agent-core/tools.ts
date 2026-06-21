/**
 * Unified tool registry — the single source of truth for what the autonomous assistant can do.
 *
 * Each AgentTool carries a zod schema (→ OpenRouter/OpenAI function schema) and a handler. The
 * SAME registry is consumed by every surface (CLI, API, VS Code) and can be projected onto MCP
 * server.tool() registrations. Local hands: filesystem read/write/edit, shell, code search, git;
 * plus bridges to RAG recall and full-crew escalation.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const pexec = promisify(execFile);

export interface AgentTool {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>;
}

export interface ToolContext {
  workspace: string;
  clientId: string | null;
  /** Bridge: recall from cloud RAG (injected to avoid a hard dep cycle). */
  ragRecall?: (query: string, limit: number) => Promise<string>;
  /** Bridge: escalate a hard/ambiguous task to the full crew mission pipeline. */
  crewDeliberate?: (brief: string) => Promise<string>;
}

const MAX_READ = 200_000; // chars
const MAX_OUT = 30_000;
const clip = (s: string, n = MAX_OUT) => (s.length > n ? s.slice(0, n) + `\n…[truncated ${s.length - n} chars]` : s);

// ── Tool definitions ──────────────────────────────────────────────────────────

const read_file: AgentTool = {
  name: 'read_file',
  description: 'Read a UTF-8 text file from the workspace. Returns its contents (truncated if very large).',
  schema: z.object({
    path: z.string().describe('Path to the file, relative to the workspace root or absolute within it.'),
  }),
  handler: async (a) => {
    const p = String(a.path);
    const buf = await fs.readFile(p, 'utf8');
    return clip(buf, MAX_READ);
  },
};

const write_file: AgentTool = {
  name: 'write_file',
  description: 'Create or overwrite a file with the given content. Creates parent directories as needed.',
  schema: z.object({
    path: z.string().describe('Destination path within the workspace.'),
    content: z.string().describe('Full file content to write.'),
  }),
  handler: async (a) => {
    const p = String(a.path);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, String(a.content), 'utf8');
    return `wrote ${Buffer.byteLength(String(a.content))} bytes to ${p}`;
  },
};

const edit_file: AgentTool = {
  name: 'edit_file',
  description: 'Replace an exact string in a file with a new string. The old_string must occur exactly once.',
  schema: z.object({
    path: z.string().describe('File to edit within the workspace.'),
    old_string: z.string().describe('Exact text to replace (must be unique in the file).'),
    new_string: z.string().describe('Replacement text.'),
  }),
  handler: async (a) => {
    const p = String(a.path);
    const before = await fs.readFile(p, 'utf8');
    const old = String(a.old_string);
    const count = before.split(old).length - 1;
    if (count === 0) throw new Error('old_string not found in file');
    if (count > 1) throw new Error(`old_string occurs ${count}× — must be unique`);
    const after = before.replace(old, String(a.new_string));
    await fs.writeFile(p, after, 'utf8');
    return `edited ${p} (1 replacement)`;
  },
};

const list_dir: AgentTool = {
  name: 'list_dir',
  description: 'List the entries of a directory in the workspace (files and subdirectories).',
  schema: z.object({
    path: z.string().optional().describe('Directory to list; defaults to the workspace root.'),
  }),
  handler: async (a, ctx) => {
    const p = a.path ? String(a.path) : ctx.workspace;
    const entries = await fs.readdir(p, { withFileTypes: true });
    return clip(entries.map(e => (e.isDirectory() ? `${e.name}/` : e.name)).sort().join('\n'));
  },
};

const search_code: AgentTool = {
  name: 'search_code',
  description: 'Search file contents in the workspace with a regex (ripgrep). Returns matching file:line:text.',
  schema: z.object({
    pattern: z.string().describe('Regex pattern to search for.'),
    glob: z.string().optional().describe('Optional glob filter, e.g. "*.ts".'),
  }),
  handler: async (a, ctx) => {
    const args = ['--line-number', '--no-heading', '--color', 'never', '--max-count', '50'];
    if (a.glob) args.push('--glob', String(a.glob));
    args.push(String(a.pattern), ctx.workspace);
    try {
      const { stdout } = await pexec('rg', args, { maxBuffer: 8 * 1024 * 1024 });
      return clip(stdout || '(no matches)');
    } catch (e: any) {
      if (e?.code === 1) return '(no matches)';
      throw e;
    }
  },
};

const run_shell: AgentTool = {
  name: 'run_shell',
  description: 'Run a shell command in the workspace and return combined stdout/stderr. Use for tests, lint, build, git, etc.',
  schema: z.object({
    command: z.string().describe('The shell command to execute.'),
  }),
  handler: async (a, ctx) => {
    try {
      const { stdout, stderr } = await pexec('bash', ['-lc', String(a.command)], {
        cwd: ctx.workspace, maxBuffer: 16 * 1024 * 1024, timeout: 180_000,
      });
      return clip(`$ ${a.command}\n${stdout}${stderr ? '\n[stderr]\n' + stderr : ''}`);
    } catch (e: any) {
      return clip(`$ ${a.command}\n[exit ${e?.code ?? '?'}]\n${e?.stdout ?? ''}${e?.stderr ?? ''}${e?.message ?? ''}`);
    }
  },
};

const git_status: AgentTool = {
  name: 'git_status',
  description: 'Show the working tree status (git status --short + current branch).',
  schema: z.object({}),
  handler: async (_a, ctx) => {
    const { stdout } = await pexec('bash', ['-lc', 'git rev-parse --abbrev-ref HEAD && git status --short'], { cwd: ctx.workspace });
    return clip(stdout);
  },
};

const git_diff: AgentTool = {
  name: 'git_diff',
  description: 'Show the current uncommitted diff (optionally for one path).',
  schema: z.object({ path: z.string().optional().describe('Limit the diff to this path.') }),
  handler: async (a, ctx) => {
    const cmd = a.path ? `git diff -- ${JSON.stringify(String(a.path))}` : 'git diff';
    const { stdout } = await pexec('bash', ['-lc', cmd], { cwd: ctx.workspace, maxBuffer: 16 * 1024 * 1024 });
    return clip(stdout || '(no changes)');
  },
};

const rag_recall: AgentTool = {
  name: 'rag_recall',
  description: 'Recall relevant crew memories / prior decisions from the cloud RAG system for context.',
  schema: z.object({
    query: z.string().describe('What to recall.'),
    limit: z.number().optional().default(5).describe('Max memories to return.'),
  }),
  handler: async (a, ctx) => {
    if (!ctx.ragRecall) return '(RAG recall unavailable in this context)';
    return clip(await ctx.ragRecall(String(a.query), Number(a.limit ?? 5)));
  },
};

const crew_deliberate: AgentTool = {
  name: 'crew_deliberate',
  description: 'Escalate a complex or ambiguous task to the full crew mission pipeline (Picard→Riker→Quark→crew→Picard) and return the synthesized mission plan. Use for architecture, security, or high-stakes decisions.',
  schema: z.object({
    brief: z.string().describe('The task/decision to deliberate on.'),
  }),
  handler: async (a, ctx) => {
    if (!ctx.crewDeliberate) return '(crew escalation unavailable in this context)';
    return clip(await ctx.crewDeliberate(String(a.brief)));
  },
};

export const AGENT_TOOLS: AgentTool[] = [
  read_file, write_file, edit_file, list_dir, search_code, run_shell, git_status, git_diff, rag_recall, crew_deliberate,
];

export const TOOLS_BY_NAME: Record<string, AgentTool> = Object.fromEntries(AGENT_TOOLS.map(t => [t.name, t]));

/** Project the registry into OpenRouter/OpenAI function-calling tool schemas. */
export function toOpenAITools(tools: AgentTool[] = AGENT_TOOLS) {
  return tools.map(t => {
    const params = zodToJsonSchema(t.schema, { target: 'openApi3' }) as Record<string, unknown>;
    delete (params as any).$schema;
    return { type: 'function' as const, function: { name: t.name, description: t.description, parameters: params } };
  });
}
