import type { Repository, PRComment } from '@story-agent/shared';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? '';
const GH_API = 'https://api.github.com';

function ghHeaders() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function ghFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: { ...ghHeaders(), ...(options?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status} on ${path}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function ghFetchRaw(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: { ...ghHeaders(), ...(options?.headers ?? {}) },
  });
  return res;
}

// ── Repository ────────────────────────────────────────────────────────────────

export async function resolveRepository(ownerAndName: string): Promise<Repository> {
  const [owner, name] = ownerAndName.split('/');
  const repo = await ghFetch(`/repos/${owner}/${name}`);

  // Prefer dev branch, fall back to repo default (typically main)
  let defaultBranch = repo.default_branch as string;
  const branchCheck = await ghFetchRaw(`/repos/${owner}/${name}/branches/dev`);
  if (branchCheck.ok) defaultBranch = 'dev';

  return {
    owner,
    name,
    fullName: `${owner}/${name}`,
    defaultBranch,
    url: repo.html_url as string,
  };
}

// ── Branches ─────────────────────────────────────────────────────────────────

export async function createBranch(repo: Repository, branchName: string): Promise<string> {
  // Get SHA of base branch HEAD
  const base = await ghFetch(`/repos/${repo.fullName}/git/ref/heads/${repo.defaultBranch}`);
  const sha = (base.object as Record<string, unknown>).sha as string;

  // Create new branch
  await ghFetch(`/repos/${repo.fullName}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha }),
    headers: { 'Content-Type': 'application/json' },
  });

  return sha;
}

export async function branchExists(repo: Repository, branchName: string): Promise<boolean> {
  const res = await ghFetchRaw(`/repos/${repo.fullName}/branches/${encodeURIComponent(branchName)}`);
  return res.ok;
}

// ── Pull Requests ─────────────────────────────────────────────────────────────

export async function createPullRequest(params: {
  repo: Repository;
  title: string;
  body: string;
  head: string;
  base: string;
}): Promise<{ number: number; url: string }> {
  const pr = await ghFetch(`/repos/${params.repo.fullName}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
  return { number: pr.number as number, url: pr.html_url as string };
}

export async function getPullRequest(repoFullName: string, prNumber: number) {
  return ghFetch(`/repos/${repoFullName}/pulls/${prNumber}`);
}

export async function getPRReviewComments(storyId: string, repoFullName: string, prNumber: number): Promise<PRComment[]> {
  const [reviewCommentsRaw, issueCommentsRaw] = await Promise.all([
    ghFetch(`/repos/${repoFullName}/pulls/${prNumber}/comments?per_page=100`),
    ghFetch(`/repos/${repoFullName}/issues/${prNumber}/comments?per_page=100`),
  ]);
  const reviewComments = reviewCommentsRaw as unknown as Record<string, unknown>[];
  const issueComments = issueCommentsRaw as unknown as Record<string, unknown>[];

  const mapComment = (c: Record<string, unknown>, inline: boolean): PRComment => ({
    id: String(c.id),
    storyId,
    prNumber,
    author: (c.user as Record<string, unknown>).login as string,
    body: c.body as string,
    path: inline ? (c.path as string | null) : null,
    line: inline ? (c.line as number | null) : null,
    state: 'SUBMITTED',
    createdAt: c.created_at as string,
    url: c.html_url as string,
  });

  return [
    ...(reviewComments as Record<string, unknown>[]).map(c => mapComment(c, true)),
    ...(issueComments as Record<string, unknown>[]).map(c => mapComment(c, false)),
  ];
}

export async function postPRComment(repoFullName: string, prNumber: number, body: string): Promise<string> {
  const comment = await ghFetch(`/repos/${repoFullName}/issues/${prNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
    headers: { 'Content-Type': 'application/json' },
  });
  return comment.html_url as string;
}
