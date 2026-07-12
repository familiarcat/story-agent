/**
 * Selection-first UI/UX contract — the SINGLE shared model both surfaces render (web Next.js tree +
 * VS Code TreeView/QuickPick). The goal: a user SELECTS firm → client → project → epic → story →
 * task from a structured tree, and each node surfaces its available ACTIONS as buttons/menu items —
 * so manual natural-language prompting is the FALLBACK, not the default entry point.
 *
 * Universal contract, optimized presentation per platform. Reads (the whole tree) are free + cached
 * via the agent server's /aha proxy; any action that WRITES (start story, branch, link PR, complete)
 * stays WorfGate-gated dry-run → confirm in whichever surface invoked it. (Crew mission
 * `universal-selection-ux`, OBS b7d37dce + Geordi MEM 59.) Pairs with [agent-modes.ts](./agent-modes.ts).
 */
export const NODE_LEVELS = ['firm', 'client', 'project', 'epic', 'story', 'task'];
/** The child level for progressive disclosure — select a node, load this level next. `null` = leaf. */
export const CHILD_LEVEL = {
    firm: 'client', client: 'project', project: 'epic', epic: 'story', story: 'task', task: null,
};
export function childLevel(level) {
    return CHILD_LEVEL[level];
}
const A = {
    open: { intent: 'open', label: 'Open', write: false },
    plan: { intent: 'plan', label: 'Plan (read-only)', write: false },
    agent: { intent: 'agent', label: 'Execute with Agent', write: false },
    prepare: { intent: 'prepare', label: 'Prepare brief', write: false },
    startStory: { intent: 'start-story', label: 'Start story + branch', write: true, tool: 'crew_start_story' },
    branch: { intent: 'branch', label: 'Create branch', write: true, tool: 'aha_branch_for_story' },
    linkPr: { intent: 'link-pr', label: 'Link PR', write: true, tool: 'crew_link_story_pr' },
    complete: { intent: 'complete', label: 'Complete story', write: true, tool: 'crew_complete_story' },
};
/** Actions available per level. Reads everywhere; the gated lifecycle writes live on story (+ task). */
const ACTIONS_BY_LEVEL = {
    firm: [A.open],
    client: [A.open],
    project: [A.plan, A.open],
    epic: [A.plan, A.open],
    story: [A.plan, A.agent, A.prepare, A.startStory, A.branch, A.linkPr, A.complete, A.open],
    task: [A.plan, A.agent, A.open],
};
export function actionsForLevel(level) {
    return ACTIONS_BY_LEVEL[level];
}
/** Whether selecting a node + this action requires a WorfGate-gated confirm (any write). */
export function actionRequiresConfirm(action) {
    return action.write;
}
/** Dev-only intents — low-level code/lifecycle ops a manager does not drive directly. */
const DEVELOPER_ONLY = new Set(['agent', 'branch', 'link-pr']);
export function actionsForPersona(level, persona) {
    const all = actionsForLevel(level);
    if (persona === 'developer')
        return all;
    // management: all reads + approval-style writes (start-story / complete), minus dev-only ops.
    return all.filter(a => !DEVELOPER_ONLY.has(a.intent));
}
