/**
 * Git branching ↔ Aha! story structure (crew git-aha-branching mission). Derives deterministic git
 * branch names from Aha references so branches mirror the backlog: Project (ref prefix) → Story
 * (Feature, e.g. PROD-17) → Task (Requirement). Pure name derivation here (no LLM, no I/O); branch
 * CREATE/DELETE is a separate WorfGate-gated op (never force-push, never touch main destructively).
 */
export type BranchKind = 'story' | 'task' | 'epic';

/** kebab-case a title for a branch slug: lowercase, hyphen-separated, punctuation stripped, bounded. */
export function slugify(s: string, max = 40): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '');
}

/**
 * Derive a branch name from an Aha reference + title.
 *   story → story/PROD-17-redis-tls-approval-tests
 *   task  → task/PROD-17.1-add-fixtures
 *   epic  → epic/PROD-E-1-infra
 * Falls back to just kind/REF when no title is given.
 */
export function ahaRefToBranchName(input: { ref: string; name?: string; kind?: BranchKind }): string {
  const kind = input.kind ?? 'story';
  const ref = input.ref.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '');
  if (!ref) throw new Error('ahaRefToBranchName: ref is required');
  const slug = input.name ? slugify(input.name) : '';
  return slug ? `${kind}/${ref}-${slug}` : `${kind}/${ref}`;
}

/** The git command to create a story/task branch from main (returned for dry-run; never force). */
export function branchCreateCommand(branch: string, base = 'main'): string {
  return `git checkout ${base} && git pull --ff-only && git checkout -b ${branch}`;
}
