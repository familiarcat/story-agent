/**
 * 5W1H Skill Theories for the crew's MCP tools / agent-core skills.
 *
 * Importing this module registers each theory (validated for who/what/when/where/why/how) into the
 * shared registry, so describe_skill / list_skill_theories surface them and tool registrations can
 * pull MCP ToolAnnotations from how.annotations. New tools SHOULD add a theory here.
 */
import { defineSkillTheory } from '@story-agent/shared/skill-theory';

// ── agent-core unified tools (local hands) ────────────────────────────────────

defineSkillTheory({
  tool: 'read_file',
  who: { owner: 'data' },
  what: { summary: 'Read a UTF-8 text file from the workspace.', capabilities: ['inspect source', 'load context before editing'] },
  when: { useWhen: ['You need a file\'s contents before reasoning or editing it'], avoidWhen: ['You only need to find which files match a pattern (use search_code)'], preconditions: ['Path is inside the workspace'] },
  where: { scope: ['local-fs'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'none' },
  why: { rationale: 'Read-before-write is the foundation of safe autonomous editing.', goalsServed: ['correctness', 'context fidelity'] },
  how: { invocation: 'read_file({ path })', annotations: { title: 'Read File', readOnlyHint: true, idempotentHint: true, openWorldHint: false }, output: 'The file contents (truncated if very large).' },
});

defineSkillTheory({
  tool: 'write_file',
  who: { owner: 'geordi' },
  what: { summary: 'Create or overwrite a file with given content.', capabilities: ['create files', 'overwrite files', 'scaffold'] },
  when: { useWhen: ['Creating a new file', 'Fully replacing a file you have read'], avoidWhen: ['Changing a small part of a large file (use edit_file)'] },
  where: { scope: ['local-fs'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'local' },
  why: { rationale: 'Materializes the crew\'s work onto disk under WorfGate path-clamping.', goalsServed: ['implementation'] },
  how: { invocation: 'write_file({ path, content })', annotations: { title: 'Write File', readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }, output: 'Bytes written + path.' },
});

defineSkillTheory({
  tool: 'edit_file',
  who: { owner: 'riker' },
  what: { summary: 'Replace an exact, unique string in a file.', capabilities: ['surgical edits', 'preserve surrounding code'] },
  when: { useWhen: ['Changing a specific span in an existing file'], preconditions: ['old_string occurs exactly once'] },
  where: { scope: ['local-fs'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'local' },
  why: { rationale: 'Minimal-diff edits keep changes reviewable and reduce blast radius.', goalsServed: ['implementation', 'reviewability'] },
  how: { invocation: 'edit_file({ path, old_string, new_string })', annotations: { title: 'Edit File', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }, output: 'Confirmation of the single replacement.' },
});

defineSkillTheory({
  tool: 'list_dir',
  who: { owner: 'data' },
  what: { summary: 'List directory entries in the workspace.', capabilities: ['discover structure'] },
  when: { useWhen: ['Exploring an unfamiliar directory'] },
  where: { scope: ['local-fs'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'none' },
  why: { rationale: 'Orientation before deeper reads/search.', goalsServed: ['discovery'] },
  how: { invocation: 'list_dir({ path? })', annotations: { title: 'List Directory', readOnlyHint: true, idempotentHint: true, openWorldHint: false }, output: 'Sorted entries (dirs marked with /).' },
});

defineSkillTheory({
  tool: 'search_code',
  who: { owner: 'data' },
  what: { summary: 'Regex search of file contents (ripgrep).', capabilities: ['find symbols', 'locate usages'] },
  when: { useWhen: ['Locating where something is defined/used across many files'], avoidWhen: ['You already know the exact file (use read_file)'] },
  where: { scope: ['local-fs'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'none' },
  why: { rationale: 'Find before you read; avoids loading whole trees.', goalsServed: ['discovery', 'efficiency'] },
  how: { invocation: 'search_code({ pattern, glob? })', annotations: { title: 'Search Code', readOnlyHint: true, idempotentHint: true, openWorldHint: false }, output: 'file:line:text matches (capped).' },
});

defineSkillTheory({
  tool: 'run_shell',
  who: { owner: 'worf', minTier: 'standard' },
  what: { summary: 'Run a shell command in the workspace.', capabilities: ['tests', 'lint', 'build', 'git', 'package managers'] },
  when: { useWhen: ['Verifying changes (tests/build)', 'Running git or tooling'], avoidWhen: ['A dedicated tool exists (prefer read_file/search_code/git_* over cat/grep/git)'], preconditions: ['Command passes WorfGate green/yellow/red gate'] },
  where: { scope: ['local-shell'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'external' },
  why: { rationale: 'Closing the loop — the agent must run what it writes; WorfGate governs blast radius.', goalsServed: ['verification', 'autonomy'] },
  how: { invocation: 'run_shell({ command })', annotations: { title: 'Run Shell', readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }, output: 'Combined stdout/stderr (+ exit code on failure).' },
});

defineSkillTheory({
  tool: 'git_status',
  who: { owner: 'obrien' },
  what: { summary: 'Show branch + working-tree status.', capabilities: ['see uncommitted changes'] },
  when: { useWhen: ['Before committing or to confirm what changed'] },
  where: { scope: ['git'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'none' },
  why: { rationale: 'Situational awareness before any commit/push.', goalsServed: ['safety'] },
  how: { invocation: 'git_status({})', annotations: { title: 'Git Status', readOnlyHint: true, idempotentHint: true, openWorldHint: false }, output: 'Current branch + short status.' },
});

defineSkillTheory({
  tool: 'git_diff',
  who: { owner: 'obrien' },
  what: { summary: 'Show the current uncommitted diff.', capabilities: ['review changes'] },
  when: { useWhen: ['Reviewing exactly what will be committed'] },
  where: { scope: ['git'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'none' },
  why: { rationale: 'Verify intent matches changes before committing.', goalsServed: ['reviewability'] },
  how: { invocation: 'git_diff({ path? })', annotations: { title: 'Git Diff', readOnlyHint: true, idempotentHint: true, openWorldHint: false }, output: 'Unified diff (or "no changes").' },
});

defineSkillTheory({
  tool: 'rag_recall',
  who: { owner: 'uhura' },
  what: { summary: 'Recall relevant crew memories / prior decisions from cloud RAG.', capabilities: ['retrieve prior context', 'avoid re-deciding'] },
  when: { useWhen: ['A task may have prior crew decisions/precedent'], preconditions: ['Cloud RAG reachable'] },
  where: { scope: ['rag', 'cloud-db'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'none' },
  why: { rationale: 'The crew should remember; recall prevents contradicting past consensus.', goalsServed: ['continuity', 'consistency'] },
  how: { invocation: 'rag_recall({ query, limit? })', annotations: { title: 'Recall Crew Memory', readOnlyHint: true, idempotentHint: true, openWorldHint: true }, output: 'Ranked memory snippets with references.' },
});

defineSkillTheory({
  tool: 'crew_deliberate',
  who: { owner: 'picard' },
  what: { summary: 'Escalate a complex/ambiguous task to the full crew mission pipeline.', capabilities: ['multi-officer deliberation', 'synthesized plan'] },
  when: { useWhen: ['Architecture/security/high-stakes or ambiguous decisions'], avoidWhen: ['Routine single-step edits (handle inline — escalation costs tokens)'] },
  where: { scope: ['crew', 'llm'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'external' },
  why: { rationale: 'Hard calls deserve the whole crew; cheap calls do not.', goalsServed: ['judgment', 'cost-discipline'] },
  how: { invocation: 'crew_deliberate({ brief })', annotations: { title: 'Escalate to Crew', readOnlyHint: true, idempotentHint: false, openWorldHint: true }, output: 'Goals + team + mission plan + crew cost.' },
});

// ── governance / lifecycle MCP tools ──────────────────────────────────────────

defineSkillTheory({
  tool: 'onboard_client',
  who: { owner: 'worf', authorizedCrew: ['worf', 'picard', 'troi'], minTier: 'enterprise' },
  what: { summary: 'Onboard a new client into the MCP crew system (persisted to Supabase).', capabilities: ['create client', 'apply WorfGate floor', 'set hierarchy parent'] },
  when: { useWhen: ['Adding a new tenant/client under an existing org'], preconditions: ['Parent client exists', 'clients table migration applied'] },
  where: { scope: ['cloud-db', 'crew'], surfaces: ['api', 'mcp'], sideEffects: 'external' },
  why: { rationale: 'Clients are data, not code; onboarding is governed + durable + audited.', goalsServed: ['multi-tenancy', 'governance'] },
  how: { invocation: 'onboard_client({ clientId, clientName, tier, githubOrg, parentClientId? })', annotations: { title: 'Onboard Client', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }, output: 'Registered policy (tier, parent, WorfGate, required env vars).' },
});

defineSkillTheory({
  tool: 'worfgate_credential_status',
  who: { owner: 'worf' },
  what: { summary: 'Report which brokered credentials WorfGate can resolve (presence only).', capabilities: ['credential inventory', 'provider chain status'] },
  when: { useWhen: ['Diagnosing a missing credential before a credentialed action'] },
  where: { scope: ['meta'], surfaces: ['api', 'mcp'], sideEffects: 'none' },
  why: { rationale: 'See what WorfGate can broker without ever exposing secret values.', goalsServed: ['security', 'observability'] },
  how: { invocation: 'worfgate_credential_status({ names? })', annotations: { title: 'Credential Status', readOnlyHint: true, idempotentHint: true, openWorldHint: false }, output: 'Per-credential availability + active provider chain (no values).' },
});

defineSkillTheory({
  tool: 'run_crew_mission_pipeline',
  who: { owner: 'picard' },
  what: { summary: 'Run the 6-stage crew cognitive pipeline on a natural-language request.', capabilities: ['intake', 'team assembly', 'cost-optimized models', 'mission plan'] },
  when: { useWhen: ['Turning a goal into an owned, costed mission plan'], avoidWhen: ['A single tool call already does the job'] },
  where: { scope: ['crew', 'llm', 'rag'], surfaces: ['api', 'mcp'], sideEffects: 'external' },
  why: { rationale: 'Picard→Riker→Quark→crew→Picard gives plans with ownership + cost transparency.', goalsServed: ['planning', 'cost-optimization'] },
  how: { invocation: 'run_crew_mission_pipeline({ input, clientId?, store? })', annotations: { title: 'Run Crew Mission Pipeline', readOnlyHint: false, idempotentHint: false, openWorldHint: true }, output: 'goals, team, contributions, efficiency, mission plan (stored to RAG).' },
});

/** Tool names that carry a registered theory (for coverage reporting). */
export const THEORIZED_TOOLS = [
  'read_file', 'write_file', 'edit_file', 'list_dir', 'search_code', 'run_shell', 'git_status', 'git_diff',
  'rag_recall', 'crew_deliberate', 'onboard_client', 'worfgate_credential_status', 'run_crew_mission_pipeline',
];
