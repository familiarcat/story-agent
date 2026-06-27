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

/** Firm (familiarcat) → Client → Project (=Aha product) → Epic → Story (=Feature) → Task (=Requirement). */
export type NodeLevel = 'firm' | 'client' | 'project' | 'epic' | 'story' | 'task';

export const NODE_LEVELS: readonly NodeLevel[] = ['firm', 'client', 'project', 'epic', 'story', 'task'];

export interface HierarchyNode {
  level: NodeLevel;
  /** Stable id (Aha numeric id, client id, or refPrefix). */
  id: string;
  /** Aha reference — a prefix for projects (e.g. "PROD") or a reference num for stories/tasks (e.g. "PROD-17"). */
  ref?: string;
  name: string;
  /** Parent node id, for tree reconstruction. */
  parentId?: string;
  /** Deep link (Aha URL / dashboard route) for the "open" action. */
  url?: string;
}

/** The child level for progressive disclosure — select a node, load this level next. `null` = leaf. */
export const CHILD_LEVEL: Record<NodeLevel, NodeLevel | null> = {
  firm: 'client', client: 'project', project: 'epic', epic: 'story', story: 'task', task: null,
};

export function childLevel(level: NodeLevel): NodeLevel | null {
  return CHILD_LEVEL[level];
}

/**
 * Actions a selected node can trigger. `read` actions are free; `write` actions map to the existing
 * WorfGate-gated lifecycle tools (dry-run unless confirmed, audited) and must show the dry-run before
 * executing. `intent` is the surface-agnostic verb each adapter binds to its native control
 * (VS Code command / web button) and the mode/endpoint it drives.
 */
export type ActionIntent =
  | 'open'         // open the node's url (read)
  | 'plan'         // /plan against this node — read-only, PM-aware (read)
  | 'agent'        // /agent execute work on this node (read tools + gated writes)
  | 'prepare'      // load the Aha story → Observation Lounge brief (read)
  | 'start-story'  // crew_start_story — create story + matching git branch (WRITE, gated)
  | 'branch'       // aha_branch_for_story — branch from the story ref (WRITE, gated)
  | 'link-pr'      // crew_link_story_pr — link a PR to the story (WRITE, gated)
  | 'complete';    // crew_complete_story — close the story lifecycle (WRITE, gated)

export interface NodeAction {
  intent: ActionIntent;
  label: string;
  /** True = mutates Aha/git → WorfGate-gated dry-run → confirm. False = free read. */
  write: boolean;
  /** The gated tool this action invokes (write actions only). */
  tool?: string;
}

const A = {
  open: { intent: 'open', label: 'Open', write: false } as NodeAction,
  plan: { intent: 'plan', label: 'Plan (read-only)', write: false } as NodeAction,
  agent: { intent: 'agent', label: 'Execute with Agent', write: false } as NodeAction,
  prepare: { intent: 'prepare', label: 'Prepare brief', write: false } as NodeAction,
  startStory: { intent: 'start-story', label: 'Start story + branch', write: true, tool: 'crew_start_story' } as NodeAction,
  branch: { intent: 'branch', label: 'Create branch', write: true, tool: 'aha_branch_for_story' } as NodeAction,
  linkPr: { intent: 'link-pr', label: 'Link PR', write: true, tool: 'crew_link_story_pr' } as NodeAction,
  complete: { intent: 'complete', label: 'Complete story', write: true, tool: 'crew_complete_story' } as NodeAction,
};

/** Actions available per level. Reads everywhere; the gated lifecycle writes live on story (+ task). */
const ACTIONS_BY_LEVEL: Record<NodeLevel, NodeAction[]> = {
  firm: [A.open],
  client: [A.open],
  project: [A.plan, A.open],
  epic: [A.plan, A.open],
  story: [A.plan, A.agent, A.prepare, A.startStory, A.branch, A.linkPr, A.complete, A.open],
  task: [A.plan, A.agent, A.open],
};

export function actionsForLevel(level: NodeLevel): NodeAction[] {
  return ACTIONS_BY_LEVEL[level];
}

/** Whether selecting a node + this action requires a WorfGate-gated confirm (any write). */
export function actionRequiresConfirm(action: NodeAction): boolean {
  return action.write;
}

/**
 * The two user personas the single codebase serves (crew mission `persona-workflow-strategy`,
 * OBS 73757052 — Troi MEM 61 + Data MEM 62). The SAME select→act→crew→Aha workflow, rendered
 * differently: MANAGEMENT (web dashboard) = portfolio oversight + approval-style writes (start /
 * complete a story); DEVELOPER (VS Code + web story workspace) = the full code lifecycle (plan /
 * execute / branch / link-PR). Both see all reads. This persona filter lives in the contract so
 * every surface reuses one source of truth.
 */
export type Persona = 'management' | 'developer';

/** Dev-only intents — low-level code/lifecycle ops a manager does not drive directly. */
const DEVELOPER_ONLY: ReadonlySet<ActionIntent> = new Set(['agent', 'branch', 'link-pr']);

export function actionsForPersona(level: NodeLevel, persona: Persona): NodeAction[] {
  const all = actionsForLevel(level);
  if (persona === 'developer') return all;
  // management: all reads + approval-style writes (start-story / complete), minus dev-only ops.
  return all.filter(a => !DEVELOPER_ONLY.has(a.intent));
}
