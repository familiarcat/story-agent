import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAgileProvider } from '../providers/index.js';
import { executeAutonomousCrewMission } from '../lib/crew-coordinator.js';
import { getRelevantObservationMemories, storeObservationMemory } from '@story-agent/shared/db';
import { enforceWorfGateOutbound } from '../lib/worfgate.js';

export function registerStoryTools(server: McpServer) {
  server.tool(
    'list_projects',
    'List available projects from the configured agile provider (Aha, Jira, Linear, etc.) for use in story import and sprint planning.',
    {
      page: z.number().optional().default(1).describe('Page number for pagination'),
    },
    async ({ page }) => {
      const projects = await getAgileProvider().listProjects(page);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(projects, null, 2),
        }],
      };
    }
  );

  server.tool(
    'get_story',
    'Fetch a story/issue by reference number from the configured agile provider (e.g. STORY-123 for Aha, PROJ-456 for Jira). Returns title, description, acceptance criteria, and workflow status.',
    { referenceNum: z.string().describe('Story reference number (format depends on provider: STORY-123, PROJ-456, etc.) or full issue URL') },
    async ({ referenceNum }) => {
      const story = await getAgileProvider().getStory(referenceNum);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(story, null, 2),
        }],
      };
    }
  );

  server.tool(
    'list_stories',
    'List stories/issues for a project from the configured agile provider.',
    {
      projectId: z.string().describe('Aha product/project ID or subdomain reference'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
    },
    async ({ projectId, page }) => {
      const stories = await getAgileProvider().listStoriesForProject(projectId, page);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(stories, null, 2),
        }],
      };
    }
  );

  server.tool(
    'update_aha_story_status',
    'Update the workflow status of a story/issue via the configured agile provider.',
    {
      storyId: z.string().describe('Story/issue ID (from get_story result, field: id)'),
      statusName: z.string().describe('Workflow status name as it appears in the provider (e.g. "In Progress", "Done", "Complete")'),
      clientId: z.string().optional().describe('Optional client ID for multi-tenant auditing'),
    },
    async ({ storyId, statusName, clientId }) => {
      enforceWorfGateOutbound({
        target: 'aha',
        payloadText: `${storyId} ${statusName}`,
        clientId: clientId ?? null,
        operation: 'update_aha_story_status',
      });

      await getAgileProvider().updateStoryStatus(storyId, statusName);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, storyId, statusName }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'link_aha_story_to_pr',
    'Post a comment on a story/issue linking it to the GitHub PR. Call immediately after open_pull_request for traceability.',
    {
      storyId: z.string().describe('Story/issue ID (from get_story result, field: id)'),
      prUrl: z.string().describe('Full GitHub PR URL'),
      prTitle: z.string().describe('PR title starting with the story ID, e.g. [STORY-123] ...'),
      clientId: z.string().optional().describe('Optional client ID for multi-tenant auditing'),
    },
    async ({ storyId, prUrl, prTitle, clientId }) => {
      const commentBody = `Pull Request opened: [${prTitle}](${prUrl})`;
      enforceWorfGateOutbound({
        target: 'aha',
        payloadText: `${storyId} ${commentBody}`,
        clientId: clientId ?? null,
        operation: 'link_aha_story_to_pr',
      });

      await getAgileProvider().addStoryComment(storyId, commentBody);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, storyId, prUrl }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'prepare_story_for_execution',
    [
      'Fetch an Aha story and populate the story-execution-master-template with its context.',
      'Returns a structured "Observation Lounge" brief: the template populated with all available Aha fields',
      'so a human can review, approve, and fill remaining inputs before agentic Phase 1 execution begins.',
    ].join(' '),
    {
      referenceNum: z.string().describe('Aha story reference number (e.g. STORY-123)'),
      repoFullName: z.string().optional().describe('GitHub owner/name if already known (e.g. bayer-int/product-profile-ui)'),
      targetBranch: z.string().optional().describe('PR target branch if already known (e.g. dev)'),
      techStack: z.string().optional().describe('Tech stack hints (e.g. React, Redux, Express, Postgres)'),
      testPolicy: z.string().optional().describe('Test policy override (defaults to: run tests for changed files)'),
      reviewers: z.string().optional().describe('Reviewer team or individuals'),
    },
    async ({ referenceNum, repoFullName, targetBranch, techStack, testPolicy, reviewers }) => {
      const story = await getAgileProvider().getStory(referenceNum);

      const fill = (provided: string | undefined, fallback: string) =>
        provided ? provided : `{{${fallback}}} *(specify before executing)*`;

      const brief = `# Observation Lounge — Story Execution Brief

> **Status:** Awaiting human review and approval before agentic Phase 1 execution.
> Review the populated fields below, complete any remaining \`{{PLACEHOLDER}}\` entries, then approve.

---

## Story Context (from Aha)

| Field | Value |
|---|---|
| **Story ID** | ${story.referenceNum} |
| **Title** | ${story.name} |
| **Aha URL** | ${story.url} |
| **Workflow Status** | ${story.workflowStatus} |
| **Internal Feature ID** | ${story.id} |

## Description

${story.description || '*(No description in Aha — add before executing)*'}

## Acceptance Criteria

${story.acceptanceCriteria || '*(No requirements defined in Aha — define before executing)*'}

---

## Execution Inputs

| Input | Value |
|---|---|
| **Repositories in Scope** | ${fill(repoFullName, 'REPO_PATHS')} |
| **Primary Repo** | ${fill(repoFullName, 'PRIMARY_REPO')} |
| **PR Target Branch** | ${fill(targetBranch, 'TARGET_BRANCH')} |
| **Tech Stack** | ${fill(techStack, 'TECH_STACK')} |
| **Test Policy** | ${testPolicy ?? 'Run targeted tests for changed files; run full suite if test policy requires it'} |
| **Reviewers** | ${fill(reviewers, 'REVIEWERS')} |
| **Non-goals** | {{NON_GOALS}} *(specify before executing)* |
| **Risk Areas** | {{RISK_AREAS}} *(identify during discovery)* |
| **CI Constraints** | {{CI_CONSTRAINTS}} *(specify before executing)* |
| **Security Constraints** | {{SECURITY_CONSTRAINTS}} *(specify before executing)* |
| **Release Notes Required** | {{RELEASE_NOTES_REQUIRED}} |
| **Screenshot Required** | {{SCREENSHOT_REQUIRED}} |

---

## Next Steps

1. **Human: Review the table above.** Fill in all remaining \`{{PLACEHOLDER}}\` values.
2. **Human: Approve or revise** the story description and acceptance criteria.
3. **Human: Confirm target repo and branch** are correct for this story.
4. **Proceed:** Once approved, instruct the agent to execute Phase 1 using this brief.
   - Agent will discover codebase, plan, implement, test, and open a PR.
   - After PR opens: switch to Phase 2 (pr-revision-template) for review cycles.

---

## Suggested Phase 1 Kickoff Prompt

Once you approve, paste this to start execution:

\`\`\`
Execute Phase 1 for ${story.referenceNum}: ${story.name}

- Primary repo: ${repoFullName ?? '<your-repo>'}
- Target branch: ${targetBranch ?? 'dev'}
- Aha story ID: ${story.id}
- Story URL: ${story.url}

Follow the story-execution-master-template workflow.
\`\`\`
`;

      return {
        content: [{
          type: 'text',
          text: brief,
        }],
      };
    }
  );

  server.tool(
    'list_aha_sprints',
    'List sprints/iterations/releases for a project via the configured agile provider.',
    {
      projectId: z.string().describe('Project ID (from list_projects)'),
    },
    async ({ projectId }) => {
      const sprints = await getAgileProvider().listSprints(projectId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(sprints, null, 2) }] };
    }
  );

  server.tool(
    'get_sprint_details',
    'Get full details for a sprint/iteration including story point capacity and progress.',
    {
      sprintId: z.string().describe('Sprint/release/iteration ID (from list_aha_sprints)'),
    },
    async ({ sprintId }) => {
      const sprint = await getAgileProvider().getSprint(sprintId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(sprint, null, 2) }] };
    }
  );

  server.tool(
    'get_sprint_stories',
    'List all stories/issues assigned to a sprint with story points and status.',
    {
      sprintId: z.string().describe('Sprint/release/iteration ID (from list_aha_sprints)'),
    },
    async ({ sprintId }) => {
      const stories = await getAgileProvider().getSprintStories(sprintId);
      const totalPoints = stories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);
      const donePoints = stories
        .filter(s => s.workflowStatus.toLowerCase().includes('done') || s.workflowStatus.toLowerCase().includes('complete'))
        .reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ stories, summary: { total: stories.length, totalPoints, donePoints, remainingPoints: totalPoints - donePoints } }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'launch_crew_mission',
    'Launch the full crew-agent workflow for a story. Crew personas independently generate findings via approved LLM provider and assignments, then produce an execution-ready autonomous plan.',
    {
      referenceNum: z.string().describe('Story/issue reference, e.g. STORY-123, PROJ-456, or full issue URL'),
      repoFullName: z.string().describe('Primary repository in owner/name format'),
      targetBranch: z.string().optional().default('dev').describe('Target branch for PRs'),
      executionMode: z.enum(['autonomous', 'guided']).optional().default('autonomous').describe('Execution mode for this mission'),
      techStack: z.string().optional().describe('Optional tech stack context for engineering and operations agents'),
      testPolicy: z.string().optional().describe('Optional testing policy override'),
      reviewers: z.string().optional().describe('Optional reviewer group or users'),
      includeDebate: z.boolean().optional().default(true).describe('If true, run Observation Lounge debate automatically'),
      clientId: z.string().optional().describe(
        'Client org ID (e.g. "bayer-int", "familiarcat"). Scopes memory retrieval and storage to this client. ' +
        'If omitted, inferred from repoFullName owner. Bayer = regulated tier, familiarcat = enterprise tier.'
      ),
    },
    async ({ referenceNum, repoFullName, targetBranch, executionMode, techStack, testPolicy, reviewers, includeDebate, clientId }) => {
      try {
        const story = await getAgileProvider().getStory(referenceNum);

        // Infer clientId from repoFullName owner if not explicitly provided
        const resolvedClientId = clientId ?? repoFullName.split('/')[0] ?? null;

        // Memories are now auto-loaded inside buildAutonomousMissionPlan via resolvedClientId.
        // We still pre-load here so the plan has full context from the top.
        const sharedMemories = await getRelevantObservationMemories({
          queryText: `${story.referenceNum} ${story.name} ${story.description} ${story.acceptanceCriteria}`,
          clientId: resolvedClientId,
          limit: 6,
        });

        // Execute autonomous crew mission with LLM-backed agents
        const { plan, debate } = await executeAutonomousCrewMission({
          story,
          repoFullName,
          targetBranch,
          executionMode,
          acceptanceCriteria: story.acceptanceCriteria,
          clientId: resolvedClientId,
          sharedMemories,
          techStack,
          testPolicy,
          reviewers,
        });

        // Store debate transcript to client-scoped crew memory
        if (includeDebate && debate) {
          await storeObservationMemory({
            storyId: story.referenceNum,
            clientId: resolvedClientId,
            source: 'mcp',
            transcript: debate,
            missionPlan: plan,
            missionReference: story.referenceNum,
            tags: [executionMode, 'observation-lounge', 'crew-debate', 'autonomous', resolvedClientId ?? 'global'],
          });
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ plan, debate, status: 'success', clientId: resolvedClientId }, null, 2),
          }],
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: errorMsg, status: 'failed' }, null, 2),
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'run_observation_lounge_debate',
    'Run structured crew discourse in the Observation Lounge for a previously generated crew mission plan and return consensus, unresolved risks, and next actions.',
    {
      missionPlanJson: z.string().describe('JSON stringified CrewMissionPlan from launch_crew_mission'),
    },
    async ({ missionPlanJson }) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(missionPlanJson);
      } catch {
        throw new Error('missionPlanJson must be valid JSON.');
      }

      const missionData = parsed as any;
      
      // Trigger the debate logic by re-executing the mission in a 'debate-only' simulation mode
      // or retrieving the existing debate context if it exists.
      const { debate } = await executeAutonomousCrewMission({
        story: missionData.story,
        repoFullName: missionData.repoFullName,
        targetBranch: missionData.targetBranch || 'main',
        acceptanceCriteria: missionData.story.acceptanceCriteria,
        executionMode: 'autonomous',
        sharedMemories: [], // Logic inside coordinator will fetch fresh memories if empty
      });
      
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            status: 'success',
            debate,
          }, null, 2),
        }],
      };
    }
  );
}
