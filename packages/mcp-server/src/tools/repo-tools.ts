import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveRepository, createBranch, branchExists, createPullRequest, getPullRequest, getPRReviewComments, postPRComment } from '../lib/github.js';
import { upsertStory, getStory, listStories, upsertPRComments, getCommentsForStory } from '@story-agent/shared/db';

export function registerRepoTools(server: McpServer) {

  server.tool(
    'resolve_repository',
    'Resolve a GitHub repository, detect whether it uses dev or main as base branch, and return repo metadata.',
    { repoFullName: z.string().describe('GitHub repository in owner/name format e.g. client-int/product-profile-ui') },
    async ({ repoFullName }) => {
      const repo = await resolveRepository(repoFullName);
      return { content: [{ type: 'text' as const, text: JSON.stringify(repo, null, 2) }] };
    }
  );

  server.tool(
    'create_story_branch',
    'Create a feature branch from dev (or main if dev does not exist) for a given story ID. Stores the story record in local DB.',
    {
      storyId: z.string().describe('Story reference number e.g. STORY-123'),
      storyTitle: z.string().describe('Short story title for documentation'),
      storyUrl: z.string().describe('Full Aha story URL'),
      repoFullName: z.string().describe('GitHub owner/name'),
      clientId: z.string().describe('Client ID for multi-tenant context'),
    },
    async ({ storyId, storyTitle, storyUrl, repoFullName, clientId }) => {
      const repo = await resolveRepository(repoFullName);
      // Implementation: Scoped branching for monorepo isolation
      const branchName = `client/${clientId}/${repo.name}/${storyId.toUpperCase()}`;

      const exists = await branchExists(repo, branchName);
      if (!exists) {
        await createBranch(repo, branchName);
      }

      // Generate a deterministic UUID based on repo and story reference for idempotent upserts
      const deterministicId = createHash('sha256').update(`${repoFullName}:${storyId}`).digest('hex').substring(0, 36);

      await upsertStory(clientId, {
        id: deterministicId,
        storyId,
        storyTitle,
        storyUrl,
        repoFullName: repo.fullName,
        branch: branchName,
        baseBranch: repo.defaultBranch,
        status: 'discovery',
        prNumber: null,
        prUrl: null,
        prStatus: null,
        clientId,
        phase: 1,
        acceptanceCriteria: '',
        notes: null,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ branch: branchName, baseBranch: repo.defaultBranch, repoUrl: repo.url, existed: exists }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'open_pull_request',
    'Open a pull request for a story branch. Records PR number and URL in local DB and transitions story to pr_open status.',
    {
      storyId: z.string().describe('Story reference number e.g. STORY-123'),
      clientId: z.string().describe('Client ID for multi-tenant context'),
      title: z.string().describe('PR title — should start with [STORY_ID]'),
      body: z.string().describe('Full PR body markdown'),
    },
    async ({ storyId, clientId, title, body }) => {
      const record = await getStory(storyId, clientId);
      if (!record) throw new Error(`Story ${storyId} not found in local DB. Run create_story_branch first.`);

      const repo = await resolveRepository(record.repoFullName);
      const pr = await createPullRequest({ repo, title, body, head: record.branch, base: record.baseBranch });

      // Use the existing deterministic ID for upsert
      await upsertStory(record.clientId ?? clientId, {
        ...record, clientId: record.clientId ?? clientId, prNumber: pr.number, prUrl: pr.url, prStatus: 'open', status: 'pr_open', phase: 1
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ prNumber: pr.number, prUrl: pr.url }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'sync_pr_comments',
    'Fetch latest PR review comments and issue comments from GitHub, store them in local DB, and return unresolved items.',
    {
      storyId: z.string().describe('Story reference number e.g. STORY-123'),
      clientId: z.string().describe('Client ID for multi-tenant context'),
    },
    async ({ storyId, clientId }) => {
      const record = await getStory(storyId, clientId);
      if (!record?.prNumber) throw new Error(`Story ${storyId} has no open PR. Run open_pull_request first.`);

      const comments = await getPRReviewComments(storyId, record.repoFullName, record.prNumber);
      await upsertPRComments(comments);

      // Transition to revision phase if any comments exist
      if (comments.length > 0 && record.status === 'pr_open') {
        // Use the existing deterministic ID for upsert
        await upsertStory(record.clientId ?? clientId, {
          ...record, clientId: record.clientId ?? clientId, status: 'pr_revision', phase: 2
        });
      }

      // Fetch updated PR status
      const pr = await getPullRequest(record.repoFullName, record.prNumber);
      const prState = pr.state as string;
      const merged = pr.merged as boolean;
      const approvals = (pr.requested_reviewers as unknown[])?.length === 0;

      let prStatus = record.prStatus;
      if (merged) prStatus = 'merged';
      else if (prState === 'closed') prStatus = 'closed';

      // Use the existing deterministic ID for upsert
      await upsertStory(record.clientId ?? clientId, {
        ...record, clientId: record.clientId ?? clientId, prStatus: prStatus ?? 'open'
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalComments: comments.length,
            prState,
            merged,
            approvals,
            comments,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'get_story_status',
    'Get the full status of a story including PR state, phase, open comments, and revision history from local DB.',
    {
      storyId: z.string().describe('Story reference number e.g. STORY-123'),
      clientId: z.string().describe('Client ID for multi-tenant context'),
    },
    async ({ storyId, clientId }) => {
      const record = await getStory(storyId, clientId);
      if (!record) throw new Error(`Story ${storyId} not found.`);
      const comments = await getCommentsForStory(storyId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ record, openComments: comments.filter(c => c.state === 'SUBMITTED') }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'update_story_status',
    'Update the status of a story in local DB (e.g. after implementing changes or merging).',
    {
      storyId: z.string().describe('Story reference number'),
      clientId: z.string().describe('Client ID for multi-tenant context'),
      status: z.enum(['pending', 'discovery', 'implementing', 'pr_open', 'pr_revision', 'pr_approved', 'merged', 'blocked']),
      notes: z.string().optional().describe('Optional notes to record'),
    },
    async ({ storyId, clientId, status, notes }) => {
      const record = await getStory(storyId, clientId);
      if (!record) throw new Error(`Story ${storyId} not found.`);
      // Use the existing deterministic ID for upsert
      await upsertStory(record.clientId ?? clientId, {
        ...record, clientId: record.clientId ?? clientId, status, notes: notes ?? record.notes
      });
      return { content: [{ type: 'text', text: `Story ${storyId} updated to status: ${status}` }] };
    }
  );

  server.tool(
    'list_active_stories',
    'List all stories tracked in local DB with their current status, PR number, and phase.',
    {},
    async () => {
      const stories = await listStories();
      return { content: [{ type: 'text' as const, text: JSON.stringify(stories, null, 2) }] };
    }
  );

  server.tool(
    'post_pr_comment',
    'Post a comment on a pull request (e.g. revision summary, reviewer response).',
    {
      storyId: z.string().describe('Story reference number'),
      clientId: z.string().describe('Client ID for multi-tenant context'),
      body: z.string().describe('Comment body in markdown'),
    },
    async ({ storyId, clientId, body }) => {
      const record = await getStory(storyId, clientId);
      if (!record?.prNumber) throw new Error(`Story ${storyId} has no open PR.`);
      const url = await postPRComment(record.repoFullName, record.prNumber, body);
      return { content: [{ type: 'text', text: `Comment posted: ${url}` }] };
    }
  );
}
