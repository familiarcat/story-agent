/**
 * Unified Story Agent interface modes — the shared contract for the extension panel + the agent-core
 * loop (extension-parity roadmap, RAG MEM 56 + plan-aha-mode). One toggle, three modes, all on the
 * OpenRouter crew:
 *
 *   ASK   → /chat, no tools (pure Q&A).
 *   PLAN  → /agent read-only + the Aha! PM lane: browse firm→client→project→story AND propose
 *           stories/branches/PR-links as GATED dry-runs the user confirms. (PM folded into the IDE.)
 *   AGENT → /agent full loop (read/edit/run/git + Aha lifecycle), WorfGate-gated, approvals in-panel.
 */
export type AgentMode = 'ask' | 'plan' | 'agent';
export type ToolPolicy = 'none' | 'read-only' | 'full';

export interface ModeSpec {
  id: AgentMode;
  label: string;
  endpoint: '/chat' | '/agent';
  toolPolicy: ToolPolicy;
  /** Whether the Aha! PM toolset is surfaced in this mode. */
  ahaEnabled: boolean;
  description: string;
}

export const AGENT_MODES: Record<AgentMode, ModeSpec> = {
  ask: {
    id: 'ask', label: 'Ask', endpoint: '/chat', toolPolicy: 'none', ahaEnabled: false,
    description: 'Chat with the crew — no tools, no writes. Pure Q&A on the OpenRouter crew.',
  },
  plan: {
    id: 'plan', label: 'Plan', endpoint: '/agent', toolPolicy: 'read-only', ahaEnabled: true,
    description: 'Read-only code exploration + Aha! PM: browse firm→client→project→story, and PROPOSE stories / branches / PR-links as gated dry-runs you confirm. The project-management lane.',
  },
  agent: {
    id: 'agent', label: 'Agent', endpoint: '/agent', toolPolicy: 'full', ahaEnabled: true,
    description: 'Full agentic loop — read/edit/run/git + the Aha! story lifecycle. WorfGate-gated; approvals surfaced in the panel.',
  },
};

/** The Aha! PM tools that power Plan mode: read the hierarchy + gated planning writes (dry-run first). */
export const PLAN_AHA_TOOLS = [
  'aha:list-products', 'aha:list-epics', 'aha:list-features', 'aha:list-releases', 'aha:get-record',
  'crew_sync_to_aha', 'crew_start_story', 'aha_branch_for_story', 'crew_link_story_pr', 'crew_complete_story',
] as const;

/** Resolve a (possibly untrusted) mode string to its spec; defaults to Ask. */
export function resolveMode(mode: string | undefined | null): ModeSpec {
  return AGENT_MODES[(mode ?? '') as AgentMode] ?? AGENT_MODES.ask;
}

/** Only Agent (full) EXECUTES writes; Plan PROPOSES (dry-run) and Ask never writes. */
export function modeAllowsWrite(mode: AgentMode): boolean {
  return AGENT_MODES[mode].toolPolicy === 'full';
}

/** Tools a mode may surface: none for Ask; read-only code + Aha for Plan; everything for Agent. */
export function toolsForMode(mode: AgentMode): { codeTools: ToolPolicy; ahaTools: readonly string[] } {
  const spec = AGENT_MODES[mode];
  return { codeTools: spec.toolPolicy, ahaTools: spec.ahaEnabled ? PLAN_AHA_TOOLS : [] };
}
