import { NextResponse } from 'next/server';
import { getStory } from '@/lib/agile';
import { buildCrewMissionPlan, runObservationLoungeDebate } from '@/lib/crew';
import { getRelevantObservationMemories, storeObservationMemory } from '@/lib/db';
import type { AgileStory, CrewMissionPlan, ObservationDebateResult, ObservationMemoryRecord } from '@story-agent/shared';

export const dynamic = 'force-dynamic';

function fill(value: string | null | undefined, placeholder: string): string {
  return value ? value : `{{${placeholder}}}`;
}

function buildObservationLoungeBrief(
  story: AgileStory,
  opts: {
    repoFullName?: string;
    targetBranch?: string;
    techStack?: string;
    testPolicy?: string;
    reviewers?: string;
  }
): string {
  const { repoFullName, targetBranch, techStack, testPolicy, reviewers } = opts;

  return `# Observation Lounge — Story Execution Brief

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
}

export type ObservationLoungePayload = {
  referenceNum: string;
  story: AgileStory;
  brief: string;
  missionPlan: CrewMissionPlan;
  debate: ObservationDebateResult;
  sharedMemories: ObservationMemoryRecord[];
};

export async function prepareObservationLoungePayload(input: {
  referenceNum: string;
  repoFullName?: string;
  targetBranch?: string;
  techStack?: string;
  testPolicy?: string;
  reviewers?: string;
  executionMode: 'autonomous' | 'guided';
}): Promise<ObservationLoungePayload> {
  const {
    referenceNum,
    repoFullName,
    targetBranch,
    techStack,
    testPolicy,
    reviewers,
    executionMode,
  } = input;

  const story = await getStory(referenceNum);
  const sharedMemories = await getRelevantObservationMemories({
    queryText: `${story.referenceNum} ${story.name} ${story.description} ${story.acceptanceCriteria}`,
    limit: 6,
  });
  const brief = buildObservationLoungeBrief(story, {
    repoFullName,
    targetBranch,
    techStack,
    testPolicy,
    reviewers,
  });

  const missionPlan = buildCrewMissionPlan({
    story,
    repoFullName: repoFullName ?? '<your-repo>',
    targetBranch: targetBranch ?? 'dev',
    executionMode,
    sharedMemories,
    techStack,
    testPolicy,
    reviewers,
  });
  const debate = runObservationLoungeDebate(missionPlan);
  await storeObservationMemory({
    storyId: story.referenceNum,
    source: 'ui',
    transcript: debate,
    missionPlan,
    missionReference: story.referenceNum,
    tags: ['observation-lounge', executionMode, 'ui-debate'],
  });

  return {
    referenceNum: story.referenceNum,
    story,
    brief,
    missionPlan,
    debate,
    sharedMemories,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const referenceNum = searchParams.get('referenceNum');
    if (!referenceNum) {
      return NextResponse.json({ error: 'referenceNum query parameter required' }, { status: 400 });
    }

    const repoFullName = searchParams.get('repoFullName') ?? undefined;
    const targetBranch = searchParams.get('targetBranch') ?? undefined;
    const techStack = searchParams.get('techStack') ?? undefined;
    const testPolicy = searchParams.get('testPolicy') ?? undefined;
    const reviewers = searchParams.get('reviewers') ?? undefined;
    const executionMode = (searchParams.get('executionMode') === 'guided' ? 'guided' : 'autonomous') as 'autonomous' | 'guided';

    const payload = await prepareObservationLoungePayload({
      referenceNum,
      repoFullName,
      targetBranch,
      techStack,
      testPolicy,
      reviewers,
      executionMode,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to prepare observation lounge brief',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
