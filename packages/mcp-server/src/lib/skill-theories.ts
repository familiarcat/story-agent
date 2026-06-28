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
  tool: 'apply_patch',
  who: { owner: 'riker' },
  what: { summary: 'Apply multiple edits across one or more files atomically (all-or-nothing).', capabilities: ['coherent multi-file refactor', 'atomic batch edit', 'create + edit in one shot'] },
  when: { useWhen: ['A change spans several files and must land together', 'Refactors touching multiple modules'], avoidWhen: ['A single-file change (use edit_file)'], preconditions: ['Each old_string is unique in its file', 'All paths inside the workspace'] },
  where: { scope: ['local-fs'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'local' },
  why: { rationale: 'Validate everything in memory, then write — so a multi-file change never half-applies.', goalsServed: ['implementation', 'atomicity', 'reviewability'] },
  how: { invocation: 'apply_patch({ edits: [{ path, old_string, new_string }] })', annotations: { title: 'Apply Patch', readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }, output: 'Count of edits + files written (or an error with nothing written).' },
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

defineSkillTheory({
  tool: 'run_innovation_lounge',
  who: { owner: 'picard' },
  what: { summary: 'Crew creative jam: 11 persona-driven project pitches, a debate, and a resolved portfolio.', capabilities: ['ideation', 'persona creativity', 'debate', 'portfolio synthesis'] },
  when: { useWhen: ['Generating fresh project/product ideas from the crew', 'Asserting the platform end-to-end (create + debate + resolve)'], avoidWhen: ['Executing a known plan (use run_crew_mission_pipeline)'] },
  where: { scope: ['crew', 'llm', 'rag'], surfaces: ['mcp'], sideEffects: 'external' },
  why: { rationale: 'Each member invents in their canonical persona, the crew debates the slate, Picard resolves — generative + deliberative, stored to RAG so ideas compound.', goalsServed: ['ideation', 'dogfooding', 'portfolio-planning'] },
  how: { invocation: 'run_innovation_lounge({ theme?, store? })', annotations: { title: 'Run Innovation Lounge', readOnlyHint: false, idempotentHint: false, openWorldHint: true }, output: 'pitches, debate, portfolio (pursue now/next/park), dissent, synthesis, markdown — stored to RAG.' },
});

// ── dynamic MCP discovery + crew tool-teaching ────────────────────────────────

defineSkillTheory({
  tool: 'discover_mcp_tools',
  who: { owner: 'data' },
  what: { summary: 'A crew member discovers role-relevant MCP servers from the official registry, evaluates them through the crew pipeline, and teaches approved ones crew-wide.', capabilities: ['search the official MCP registry by role', 'run Worf→Quark→specialist→Picard evaluation', 'write a crew-wide tool-card to RAG'] },
  when: { useWhen: ['A task needs a capability the crew lacks', 'Expanding a role\'s toolset'], avoidWhen: ['A peer may already have taught this tool — recall_taught_tools first'], preconditions: ['Network reachable to the MCP registry'] },
  where: { scope: ['rag', 'crew', 'llm'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'external' },
  why: { rationale: 'The crew self-extends capability instead of waiting for static tool additions; discovery is catalog-only and execution stays human-gated.', goalsServed: ['capability growth', 'shared understanding'] },
  how: { invocation: 'discover_mcp_tools({ crewId, task, limit?, evaluateTop? })', annotations: { title: 'Discover MCP Tools', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }, output: 'Evaluated candidates + names taught crew-wide. Approved servers are NOT auto-executed.' },
});

defineSkillTheory({
  tool: 'recall_taught_tools',
  who: { owner: 'uhura' },
  what: { summary: 'Recall peer-taught MCP tool-cards relevant to a task from crew-wide RAG.', capabilities: ['embedding recall over the tool-card corpus', 'learn what a peer already found'] },
  when: { useWhen: ['Before discovering, to reuse a peer\'s find', 'Picking a tool for a task'] },
  where: { scope: ['rag'], surfaces: ['cli', 'api', 'vscode', 'mcp'], sideEffects: 'none' },
  why: { rationale: 'Shared crew understanding — a tool one member found is usable by all without re-discovery.', goalsServed: ['shared understanding', 'cost efficiency'] },
  how: { invocation: 'recall_taught_tools({ query, limit? })', annotations: { title: 'Recall Taught Tools', readOnlyHint: true, idempotentHint: true, openWorldHint: false }, output: 'Tool-card summaries (execution remains human-gated).' },
});

defineSkillTheory({
  tool: 'crew_research_stalls',
  who: { owner: 'data' },
  what: { summary: 'Recall agent-core stall cards and convene the crew to research the pattern + propose a loop fix.', capabilities: ['recall stall cards from RAG', 'crew deliberation on the failure pattern', 'store a loop-fix proposal to RAG'] },
  when: { useWhen: ['Stalls have been recorded and recur', 'Periodic self-healing review'], avoidWhen: ['No stall cards exist yet'] },
  where: { scope: ['rag', 'crew', 'llm'], surfaces: ['cli', 'api', 'mcp'], sideEffects: 'external' },
  why: { rationale: 'Closes the self-healing loop — the crew investigates and fixes its own finish/iterate stalls instead of waiting for a human.', goalsServed: ['reliability', 'autonomy', 'self-improvement'] },
  how: { invocation: 'crew_research_stalls({ limit? })', annotations: { title: 'Crew Research Stalls', readOnlyHint: false, idempotentHint: false, openWorldHint: true }, output: 'Stall count + the crew-proposed loop fix (also stored to RAG).' },
});

defineSkillTheory({
  tool: 'crew_sync_to_aha',
  who: { owner: 'riker' },
  what: { summary: 'Turn a stored crew mission result into an Aha! story so the crew auto-maintains its backlog.', capabilities: ['recall a crew mission from RAG', 'draft an Aha story from it', 'gated Aha create (dry-run unless confirmed)'] },
  when: { useWhen: ['A crew mission/decision should become a tracked Aha story', 'Auto-maintaining the backlog from crew activity'], avoidWhen: ['No release (sprint) to target'], preconditions: ['A RAG mission memory exists for the storyId', 'AHA credentials resolve'] },
  where: { scope: ['rag', 'aha', 'crew'], surfaces: ['api', 'mcp'], sideEffects: 'external' },
  why: { rationale: 'Closes the loop from crew status/feedback to the PM system — the crew proposes stories from its own work; a human confirms the write.', goalsServed: ['traceability', 'autonomy', 'backlog hygiene'] },
  how: { invocation: 'crew_sync_to_aha({ storyId, releaseId, executor?, confirm? })', annotations: { title: 'Crew Sync to Aha', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }, output: 'Dry-run draft (default) or the created Aha story; always recorded to RAG.' },
});

defineSkillTheory({
  tool: 'crew_link_story_pr',
  who: { owner: 'riker' },
  what: { summary: 'Link an Aha story to its PR and move it to code review.', capabilities: ['linkAhaStoryToPR', 'advance story status to In code review'] },
  when: { useWhen: ['A PR has been opened for a story branch'], avoidWhen: ['No PR yet'] },
  where: { scope: ['aha', 'git', 'crew'], surfaces: ['api', 'mcp'], sideEffects: 'external' },
  why: { rationale: 'Keeps the Aha story in lockstep with the PR — traceability from branch → PR → backlog.', goalsServed: ['traceability', 'sync'] },
  how: { invocation: 'crew_link_story_pr({ ref, prUrl, prTitle, confirm? })', annotations: { title: 'Crew Link Story PR', readOnlyHint: false, idempotentHint: true, openWorldHint: true }, output: 'Link result (dry-run unless confirm:true).' },
});

defineSkillTheory({
  tool: 'crew_complete_story',
  who: { owner: 'riker' },
  what: { summary: 'On merge, mark an Aha story shipped and delete its branch.', capabilities: ['updateAhaStoryStatus Shipped', 'delete local + remote branch (never main)'] },
  when: { useWhen: ['A story PR has merged'], avoidWhen: ['Work still in progress'], preconditions: ['branch is not main'] },
  where: { scope: ['aha', 'git', 'crew'], surfaces: ['api', 'mcp'], sideEffects: 'external' },
  why: { rationale: 'Closes the lifecycle — the backlog and the repo both reflect that the work shipped.', goalsServed: ['traceability', 'hygiene'] },
  how: { invocation: 'crew_complete_story({ ref, branch, confirm? })', annotations: { title: 'Crew Complete Story', readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }, output: 'Completion result (dry-run unless confirm:true; refuses main).' },
});

defineSkillTheory({
  tool: 'crew_start_story',
  who: { owner: 'riker' },
  what: { summary: 'Create an Aha story AND its matching git branch in one gated step (keeps git ↔ backlog in sync).', capabilities: ['gated Aha story create', 'matching story/<REF>-<slug> branch from main (no switch, never force)', 'optional push'] },
  when: { useWhen: ['Starting a new unit of work that should be tracked + branched'], avoidWhen: ['Work that should stay on main'], preconditions: ['A target release', 'AHA credentials resolve'] },
  where: { scope: ['aha', 'git', 'crew'], surfaces: ['api', 'mcp'], sideEffects: 'external' },
  why: { rationale: 'One action keeps the Aha story and the git branch in lockstep from the start — no drift between the PM system and the repo.', goalsServed: ['traceability', 'automation', 'sync'] },
  how: { invocation: 'crew_start_story({ name, releaseId, description?, executor?, push?, confirm? })', annotations: { title: 'Crew Start Story', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }, output: 'The created Aha ref + branch (dry-run unless confirm:true).' },
});

defineSkillTheory({
  tool: 'aha_branch_for_story',
  who: { owner: 'riker' },
  what: { summary: 'Derive a git branch name from an Aha story/task so branches mirror the backlog.', capabilities: ['story/<REF>-<slug> branch naming', 'from-main create command (never force)'] },
  when: { useWhen: ['Starting work on an Aha story/task', 'Automating branch creation alongside Aha'], avoidWhen: ['Working directly on main'] },
  where: { scope: ['aha', 'git'], surfaces: ['api', 'mcp'], sideEffects: 'none' },
  why: { rationale: 'One deterministic mapping from the Aha hierarchy to git branches keeps work traceable end-to-end (story ↔ branch ↔ PR).', goalsServed: ['traceability', 'automation'] },
  how: { invocation: 'aha_branch_for_story({ ref, name?, kind?, base? })', annotations: { title: 'Aha Branch For Story', readOnlyHint: true, idempotentHint: true, openWorldHint: false }, output: 'branch name + the from-main create command (the agent runs it via WorfGate-gated git).' },
});

/** Tool names that carry a registered theory (for coverage reporting). */
export const THEORIZED_TOOLS = [
  'read_file', 'write_file', 'edit_file', 'apply_patch', 'list_dir', 'search_code', 'run_shell', 'git_status', 'git_diff',
  'rag_recall', 'crew_deliberate', 'onboard_client', 'worfgate_credential_status', 'run_crew_mission_pipeline',
  'discover_mcp_tools', 'recall_taught_tools', 'crew_research_stalls', 'crew_sync_to_aha', 'aha_branch_for_story', 'crew_start_story',
  'crew_link_story_pr', 'crew_complete_story',
];
