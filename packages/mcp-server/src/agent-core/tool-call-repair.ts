/**
 * This module exists because tier-3 models often malform `apply_patch` and other tool calls.
 * The validate/repair step here allows cheap-model multi-file editing to succeed without escalation.
 */

/**
 * Escape raw control characters that appear INSIDE JSON string literals.
 *
 * This is the dominant real-world failure when a cheap model writes a whole source file: it emits
 * `{"path":"x.ts","content":"line one<actual newline>line two"}`. A literal newline inside a string
 * literal is invalid JSON, so JSON.parse throws and the call is lost — observed as four consecutive
 * failed write_file attempts, which is exactly the multi-file-edit unreliability that keeps forcing a
 * premium orchestrator to finish the job.
 *
 * We walk the text tracking whether we are inside a string literal (honouring backslash escapes) and
 * escape only the control characters found there. Structural whitespace outside literals is untouched.
 */
export function escapeControlCharsInStrings(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (const ch of text) {
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString) {
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
      // Any other C0 control char is also illegal inside a JSON string.
      if (ch < ' ') { out += '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'); continue; }
    }
    out += ch;
  }
  return out;
}

/**
 * Last-resort salvage for a write_file call whose JSON is beyond repair: pull `path` and `content`
 * out positionally. Only attempted for write_file, where content is free-form text and a partial
 * recovery is strictly better than discarding the model's whole turn.
 */
export function salvageWriteFileArgs(text: string): { path: string; content: string } | null {
  const pathMatch = /"path"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(text);
  if (!pathMatch) return null;
  const contentIdx = text.search(/"content"\s*:\s*"/);
  if (contentIdx === -1) return null;
  const start = text.indexOf('"', text.indexOf(':', contentIdx) ) + 1;
  // Take everything to the last closing quote before the final brace — content may contain quotes.
  const lastQuote = text.lastIndexOf('"');
  if (lastQuote <= start) return null;
  const rawContent = text.slice(start, lastQuote);
  const unescape = (s: string) => s
    .replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
    .replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  try {
    return { path: unescape(pathMatch[1]), content: unescape(rawContent) };
  } catch {
    return null;
  }
}

export function repairToolCallArgs(
  toolName: string,
  rawArgs: unknown
): { ok: true; args: Record<string, unknown> } | { ok: false; error: string } {
  // Case 1: rawArgs is a JSON string
  if (typeof rawArgs === 'string') {
    try {
      const parsed = JSON.parse(rawArgs);
      return repairToolCallArgs(toolName, parsed);
    } catch {
      // Repair attempt 1: the payload is usually valid apart from raw newlines inside a string.
      try {
        const parsed = JSON.parse(escapeControlCharsInStrings(rawArgs));
        return repairToolCallArgs(toolName, parsed);
      } catch {
        // Repair attempt 2: positional salvage, write_file only.
        if (toolName === 'write_file') {
          const salvaged = salvageWriteFileArgs(rawArgs);
          if (salvaged) return repairToolCallArgs(toolName, salvaged);
        }
        return { ok: false, error: "Tool arguments must be a valid JSON object, not a string." };
      }
    }
  }

  // Case 2: rawArgs is already an object
  if (typeof rawArgs !== 'object' || rawArgs === null) {
    return { ok: false, error: "Tool arguments must be an object." };
  }

  const args = rawArgs as Record<string, unknown>;

  // Special handling for apply_patch
  if (toolName === 'apply_patch') {
    if ('edits' in args) {
      // Canonical form: { edits: [...] }
      return { ok: true, args };
    } else if ('path' in args && 'old_string' in args && 'new_string' in args) {
      // Flat form: { path, old_string, new_string }
      return { ok: true, args: { edits: [args] } };
    } else {
      return { ok: false, error: "apply_patch requires either 'edits' or 'path', 'old_string', and 'new_string'." };
    }
  }

  // Common validation for file operations
  if (['write_file', 'edit_file', 'read_file'].includes(toolName)) {
    if (typeof args.path !== 'string' || args.path.trim() === '') {
      return { ok: false, error: "'path' must be a non-empty string." };
    }

    if (toolName === 'write_file') {
      args.content = typeof args.content === 'string' ? args.content : "";
    } else if (toolName === 'edit_file') {
      if (typeof args.old_string !== 'string' || typeof args.new_string !== 'string') {
        return { ok: false, error: "'old_string' and 'new_string' must be strings." };
      }
    }
  }

  return { ok: true, args };
}