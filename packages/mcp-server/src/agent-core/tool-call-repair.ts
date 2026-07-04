/**
 * This module exists because tier-3 models often malform `apply_patch` and other tool calls.
 * The validate/repair step here allows cheap-model multi-file editing to succeed without escalation.
 */

export function repairToolCallArgs(
  toolName: string,
  rawArgs: unknown
): { ok: true; args: Record<string, unknown> } | { ok: false; error: string } {
  // Case 1: rawArgs is a JSON string
  if (typeof rawArgs === 'string') {
    try {
      const parsed = JSON.parse(rawArgs);
      return repairToolCallArgs(toolName, parsed);
    } catch (e) {
      return { ok: false, error: "Tool arguments must be a valid JSON object, not a string." };
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