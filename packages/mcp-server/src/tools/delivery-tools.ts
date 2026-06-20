import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createHash } from 'crypto';
import { resolveRepository, createBranch, branchExists, createPullRequest } from '../lib/github.js';
import { upsertStory, getStory } from '@story-agent/shared/db';
import { enforceWorfGateOutbound } from '../lib/worfgate.js';

const MAX_FILES_PER_MISSION = 20;
const MAX_FILE_SIZE_BYTES = 500000; // 500KB limit per file

/**
 * deliver_mission_output — Phase 2 integration tool.
 *
 * Called by ai-enterprise-os at the end of a run_factory_mission execution.
 * Accepts scaffolded file contents + story context, creates the feature branch,
 * writes files to the repo via GitHub Contents API, commits them, and opens the PR.
 *
 * This closes the factory → delivery loop:
 *   ai-enterprise-os: run_factory_mission → deliver_mission_output → story-agent: open_pull_request
 */
export function registerDeliveryTools(server: McpServer) {
  server.tool(
    'deliver_mission_output',
    'Called by ai-enterprise-os after a factory mission completes. Creates a branch, commits scaffolded files via GitHub API, and opens the PR. Closes the factory→delivery loop.',
    {
      storyId:      z.string().describe('Aha story reference number e.g. STORY-123'),
      storyTitle:   z.string().describe('Story title for PR and tracking'),
      storyUrl:     z.string().describe('Full Aha story URL'),
      repoFullName: z.string().describe('GitHub owner/name e.g. bayer-int/product-profile-ui'),
      prTitle:      z.string().describe('PR title — should start with [STORY_ID]'),
      prBody:       z.string().describe('Full PR body markdown using the project PR template'),
      files: z.array(z.object({
        path:    z.string().describe('Repo-relative file path e.g. src/components/Foo.tsx'),
        content: z.string().describe('Full UTF-8 file content'),
        message: z.string().optional().describe('Optional per-file commit message override'),
      })).describe('Files to commit to the branch'),
      clientId: z.string().optional().describe('Optional client ID for multi-tenant auditing'),
    },
    async ({ storyId, storyTitle, storyUrl, repoFullName, prTitle, prBody, files, clientId }) => {
      // Hardening: Prevent payload bloat
      if (files.length > MAX_FILES_PER_MISSION) {
        throw new Error(`Mission delivery exceeds maximum file limit of ${MAX_FILES_PER_MISSION}.`);
      }

      for (const file of files) {
        if (Buffer.byteLength(file.content, 'utf8') > MAX_FILE_SIZE_BYTES) {
          throw new Error(`File ${file.path} exceeds safety limit of ${MAX_FILE_SIZE_BYTES} bytes.`);
        }
      }

      const outboundPayload = [
        storyId,
        storyTitle,
        storyUrl,
        repoFullName,
        prTitle,
        prBody,
        ...files.map(f => `${f.path}\n${f.content}`),
      ].join('\n\n');

      enforceWorfGateOutbound({
        target: 'github',
        payloadText: outboundPayload,
        repoFullName,
      clientId: clientId ?? null,
        operation: 'deliver_mission_output',
      });

      const repo = await resolveRepository(repoFullName);
      
      // Implementation: Scoped branching for monorepo isolation
      const branchName = clientId 
        ? `client/${clientId}/${repo.name}/${storyId.toUpperCase()}`
        : storyId.toUpperCase();

      // Create branch if not already present
      const exists = await branchExists(repo, branchName);
      if (!exists) await createBranch(repo, branchName);

      // Commit each file via GitHub Contents API
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? '';
      const committedPaths: string[] = [];

      for (const file of files) {
        const url = `https://api.github.com/repos/${repo.fullName}/contents/${encodeURIComponent(file.path)}`;

        // Get existing file SHA if present (required for updates)
        const existing = await fetch(url, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });
        const existingSha = existing.ok ? ((await existing.json() as Record<string, unknown>).sha as string | undefined) : undefined;

        const body: Record<string, unknown> = {
          message: file.message ?? `${storyId}: scaffold ${file.path}`,
          content: Buffer.from(file.content, 'utf-8').toString('base64'),
          branch:  branchName,
        };
        if (existingSha) body.sha = existingSha;

        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`Failed to commit ${file.path}: ${res.status} ${await res.text()}`);
        }
        committedPaths.push(file.path);
      }

      // Open the PR
      const pr = await createPullRequest({
        repo,
        title: prTitle,
        body:  prBody,
        head:  branchName,
        base:  repo.defaultBranch,
      });

      // Record in Supabase
      // Generate a deterministic UUID based on repo and story reference for idempotent upserts
      const deterministicId = createHash('sha256').update(`${repo.fullName}:${storyId}`).digest('hex').substring(0, 36);

      await upsertStory(clientId ?? '', {
        id:           deterministicId,
        storyId,
        storyTitle,
        storyUrl,
        repoFullName: repo.fullName,
        branch:       branchName,
        baseBranch:   repo.defaultBranch,
        status:       'pr_open',
        prNumber:     pr.number,
        prUrl:        pr.url,
        prStatus:     'open',
        phase:        1,
        acceptanceCriteria: '',
        notes:        `Delivered by ai-enterprise-os factory mission. Files: ${committedPaths.join(', ')}`,
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            branch:         branchName,
            filesCommitted: committedPaths,
            prNumber:       pr.number,
            prUrl:          pr.url,
          }, null, 2),
        }],
      };
    }
  );
}
