import type { AhaStory } from './aha';

const fill = (v: string | undefined, placeholder: string): string =>
  v?.trim() ? v.trim() : `{{${placeholder}}} *(specify before executing)*`;

export function buildObservationLoungeBrief(
  story: AhaStory,
  opts: {
    repoFullName?: string;
    targetBranch?: string;
    techStack?: string;
    reviewers?: string;
  }
): string {
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
| **Primary Repo** | ${fill(opts.repoFullName, 'PRIMARY_REPO')} |
| **PR Target Branch** | ${fill(opts.targetBranch, 'TARGET_BRANCH')} |
| **Tech Stack** | ${fill(opts.techStack, 'TECH_STACK')} |
| **Reviewers** | ${fill(opts.reviewers, 'REVIEWERS')} |
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
4. **Proceed:** Once approved, instruct the agent to execute Phase 1.

---

## Suggested Phase 1 Kickoff Prompt

Once approved, paste this to start execution:

\`\`\`
Execute Phase 1 for ${story.referenceNum}: ${story.name}

- Primary repo: ${opts.repoFullName ?? '<your-repo>'}
- Target branch: ${opts.targetBranch ?? 'dev'}
- Aha story ID: ${story.id}
- Story URL: ${story.url}

Follow the story-execution-master-template workflow.
\`\`\`
`;
}
