/**
 * DEVELOPER GUIDE: Integrating Prompt Engine with Crew State Broadcasting
 * 
 * This document explains how the LLM prompt execution integrates with
 * real-time crew state broadcasting to UI clients.
 */

// ── HOW IT WORKS END-TO-END ────────────────────────────────────────────────

/**
 * 1. INITIALIZATION PHASE
 *
 * When a story execution starts:
 * 
 * a) MCP receives: createStoryBranch + startCrewExecution
 * 
 * b) Server initializes state in broadcaster:
 *    const state = crewStateBroadcaster.initializeStoryExecution(
 *      storyRef: "STORY-123",
 *      crewIds: ["captain", "architect", "developer", ...],
 *      phase: "phase_1_execution"
 *    );
 * 
 * c) State broadcast to all WebSocket clients:
 *    {
 *      type: "state:initial",
 *      storyRef: "STORY-123",
 *      payload: {
 *        id: "crew-state-STORY-123-...",
 *        phase: "phase_1_execution",
 *        status: "in_progress",
 *        crewExecutions: [
 *          { crewId: "captain", status: "pending", ... },
 *          { crewId: "architect", status: "pending", ... },
 *          ...
 *        ],
 *        nextStep: "Awaiting findings from 11 crew members"
 *      }
 *    }
 * 
 * d) Web UI receives and renders:
 *    - ProjectBoard shows story with loading state
 *    - StoryExecutionCard shows crew members as "pending"
 *    - CrewMonitor shows all 11 as "idle"
 * 
 * e) VS Code plugin shows:
 *    - Story Execution Panel with placeholder crew members
 */

// ── CREW EXECUTION PHASE ───────────────────────────────────────────────────

/**
 * 2. PARALLEL CREW EXECUTION
 *
 * All 11 crew members execute in parallel using Promise.all():
 * 
 * const findings = await Promise.all([
 *   executeCrew("captain", { story, context, ... }),
 *   executeCrew("architect", { story, context, ... }),
 *   executeCrew("developer", { story, context, ... }),
 *   ... (all 11 in parallel)
 * ]);
 * 
 * Each executeCrew() call:
 *   a) Calls executePromptEngineCall(crewId, variables, storyRef)
 *   b) Prompt engine validates, substitutes, calls LLM
 *   c) Response parsed into { findings, recommendations, confidence }
 *   d) Usage archived to sa_prompt_archives
 *   e) Returns result
 * 
 * ⚠️ KEY INTEGRATION POINT:
 *    After each crew completes (or as they complete), call:
 * 
 *    await crewStateBroadcaster.recordCrewFinding(
 *      storyRef: "STORY-123",
 *      crewId: "architect",
 *      finding: {
 *        findings: parsedResponse.findings,
 *        recommendations: parsedResponse.recommendations,
 *        confidence: parsedResponse.confidence,
 *        isVeto: crewId === "security" && detectsVeto(parsedResponse),
 *        costUsd: costFromArchive,
 *        durationMs: executionTime
 *      }
 *    );
 */

// ── HOW TO INTEGRATE: Modified crew-agents.ts ──────────────────────────────

/*
// BEFORE (current):
export async function executeCaptainAgent(context: CrewContext): Promise<CrewFinding> {
  const result = await executePromptEngineCall(
    'captain',
    { story: context.story.name, ... },
    context.storyRef
  );
  return { summary: result.reasoning, ...};
}

// AFTER (with state broadcasting):
import { crewStateBroadcaster } from './crew-state-broadcaster.js';

export async function executeCaptainAgent(context: CrewContext): Promise<CrewFinding> {
  const startTime = Date.now();
  
  try {
    const result = await executePromptEngineCall(
      'captain',
      { story: context.story.name, ... },
      context.storyRef
    );
    
    const durationMs = Date.now() - startTime;
    
    // Record in real-time state broadcaster
    await crewStateBroadcaster.recordCrewFinding(
      context.storyRef,
      'captain',
      {
        findings: result.findings.join('\n'),
        recommendations: result.recommendations,
        confidence: result.confidence,
        isVeto: false,  // Captain can't veto
        costUsd: getCostFromPromptArchive(context.storyRef, 'captain'),
        durationMs
      }
    );
    
    return { summary: result.reasoning, ... };
  } catch (err) {
    await crewStateBroadcaster.recordCrewFinding(
      context.storyRef,
      'captain',
      {
        findings: `Error: ${err.message}`,
        recommendations: [],
        confidence: 0,
        isVeto: false,
        costUsd: 0,
        durationMs: Date.now() - startTime
      }
    );
    throw err;
  }
}

// SPECIAL CASE: Security (Worf) can veto
export async function executeSecurityAgent(context: CrewContext): Promise<CrewFinding> {
  const startTime = Date.now();
  const result = await executePromptEngineCall('security', { ... }, context.storyRef);
  const durationMs = Date.now() - startTime;
  
  const isVeto = result.findings.some(f => 
    f.toLowerCase().includes('security risk') ||
    f.toLowerCase().includes('veto') ||
    result.confidence < 30
  );
  
  await crewStateBroadcaster.recordCrewFinding(
    context.storyRef,
    'security',
    {
      findings: result.findings.join('\n'),
      recommendations: result.recommendations,
      confidence: result.confidence,
      isVeto,  // Can be true!
      costUsd: getCostFromPromptArchive(...),
      durationMs
    }
  );
  
  if (isVeto) {
    await crewStateBroadcaster.blockStory(
      context.storyRef,
      'Security veto: ' + result.recommendations[0]
    );
  }
  
  return { summary: result.reasoning, ... };
}
*/

// ── REAL-TIME BROADCAST FLOW ───────────────────────────────────────────────

/**
 * 3. AS EACH CREW COMPLETES (happens in order they finish, not sequential)
 *
 * When recordCrewFinding is called:
 *
 * a) Broadcaster updates CrewExecutionState:
 *    - Finds crew member in crewExecutions[]
 *    - Sets status = "complete"
 *    - Stores findings, recommendations, confidence, cost
 *
 * b) Broadcaster calculates nextStep:
 *    - Counts completed: "Architect ✅, awaiting: Developer, QA, ..."
 *    - Or: "All 11 complete, ready for next phase"
 *    - Or: "🛑 BLOCKED: Security veto from Worf"
 *
 * c) Broadcaster emits EventEmitter event:
 *    broadcaster.emit(`story:${storyRef}`, updatedState)
 *
 * d) WebSocket server receives event and broadcasts to all subscribed clients:
 *    ws.send(JSON.stringify({
 *      type: "state:updated",
 *      storyRef: "STORY-123",
 *      payload: updatedState,
 *      timestamp: "2026-06-05T10:23:45Z"
 *    }))
 *
 * e) Each WebSocket client receives update:
 *    - Web UI: useWebSocket hook setState(payload)
 *    - VS Code: WebView panel updates HTML
 *
 * f) UI immediately re-renders with new findings:
 *    - StoryExecutionCard shows crew member as "complete"
 *    - Shows findings text and recommendations
 *    - Shows confidence score
 *    - Shows execution cost
 *    - Updates progress bar
 *    - Updates nextStep text
 */

// ── PHASE TRANSITIONS ──────────────────────────────────────────────────────

/**
 * 4. WHEN ALL CREW COMPLETES PHASE 1
 *
 * After all 11 crew findings recorded:
 *
 * a) Authority weighting decides next action:
 *    - Picard (1.5) synthesizes findings
 *    - Final decision made (approval or revisions needed)
 *    - Check for security veto (Worf can block)
 *
 * b) If approved, create PR:
 *    await openPullRequest(storyRef, branchName, ...)
 *    - Returns prUrl and prNumber
 *    - Store in sa_stories table
 *
 * c) Transition to Phase 2:
 *    await crewStateBroadcaster.transitionPhase(
 *      storyRef,
 *      "phase_2_revision"
 *    );
 *
 * d) WebSocket clients receive update:
 *    - nextStep changes to "PR created, awaiting review comments"
 *    - phase changes to "phase_2_revision"
 *    - crew_executions reset to pending (ready for revision cycle)
 *    - status stays "in_progress"
 */

// ── EXAMPLE: PULLING CURRENT STATE FROM CLIENT SIDE ─────────────────────────

/**
 * 5. HOW WEB UI GETS CURRENT STATE
 *
 * Option A: WebSocket (recommended)
 *   - Client connects when component mounts
 *   - Client sends: { type: "subscribe", storyRef: "STORY-123" }
 *   - Server sends initial state
 *   - Server broadcasts updates as they arrive
 *   - Latency: ~50-100ms
 *   - Works great for real-time updates
 *
 * Option B: HTTP polling
 *   - GET /api/crew/state/STORY-123
 *   - Every 2 seconds
 *   - Latency: depends on interval
 *   - Easier for server-side rendering
 */

// ── CONFIGURATION IN .env ──────────────────────────────────────────────────

/**
 * Environment variables:
 *
 * # MCP Server
 * STORY_AGENT_WS_PORT=8000  # Start WebSocket server on this port
 * 
 * # Next.js UI
 * NEXT_PUBLIC_CREW_WS_URL=ws://localhost:8000
 * 
 * # VS Code Extension
 * (User configures in VS Code settings: storyAgent.crewWebSocketUrl)
 */

// ── DATABASE: Supabase Integration ─────────────────────────────────────────

/**
 * 6. PERSISTENCE TO Supabase
 *
 * In crew-state-broadcaster.ts, update broadcastStateChange():
 *
 * private async broadcastStateChange(
 *   storyRef: string,
 *   state: CrewExecutionState
 * ): Promise<void> {
 *   state.broadcastCount++;
 *   state.updatedAt = new Date().toISOString();
 *
 *   // Emit to TypeScript listeners
 *   this.emit(`story:${storyRef}`, state);
 *
 *   // ← ADD THIS:
 *   // Persist to Supabase
 *   const { error } = await supabase
 *     .from('sa_crew_state')
 *     .upsert({
 *       story_ref: storyRef,
 *       phase: state.phase,
 *       status: state.status,
 *       crew_executions: state.crewExecutions,
 *       active_crew_members: state.activeCrewMembers,
 *       next_step: state.nextStep,
 *       blockers: state.blockers,
 *       total_cost_usd: state.totalCostUsd,
 *       total_execution_time_ms: state.totalExecutionTimeMs,
 *       broadcast_count: state.broadcastCount,
 *       updated_at: state.updatedAt,
 *     });
 *   
 *   if (error) {
 *     console.error('[BROADCASTER] Supabase persist error:', error);
 *   }
 * }
 */

// ── MCP TOOLS TO ADD ───────────────────────────────────────────────────────

/**
 * 7. NEW MCP TOOLS FOR CREW STATE
 *
 * Add to crew-member-tools.ts:
 *
 * // Get live state for a story
 * server.tool(
 *   'crew_live_state',
 *   'Get real-time crew execution state for a story',
 *   z.object({ storyRef: z.string() }),
 *   async (input) => {
 *     const state = crewStateBroadcaster.getStoryState(input.storyRef);
 *     if (!state) throw new Error('No state for story');
 *     return { success: true, state };
 *   }
 * );
 *
 * // List active stories
 * server.tool(
 *   'crew_active_stories',
 *   'List all stories currently executing',
 *   z.object({}),
 *   async () => {
 *     const active = crewStateBroadcaster.getActiveStories();
 *     return { 
 *       success: true,
 *       stories: active.map(s => ({
 *         ref: s.storyRef,
 *         phase: s.phase,
 *         status: s.status,
 *         nextStep: s.nextStep,
 *         progressPercent: ...
 *       }))
 *     };
 *   }
 * );
 */

// ── SUMMARY ────────────────────────────────────────────────────────────────

/**
 * THE COMPLETE FLOW:
 * 
 * 1. Story starts → initializeStoryExecution() → WebSocket broadcast
 * 2. 11 crew execute in parallel, each calls recordCrewFinding()
 * 3. Each recordCrewFinding() → state updated → WebSocket broadcast
 * 4. UI receives updates in real-time via WebSocket
 * 5. UI renders with current crew progress, findings, costs
 * 6. When all complete → authority weighting decision
 * 7. If approved → create PR → transitionPhase() to phase_2_revision
 * 8. Cycle continues for revision phase
 * 9. When PR merged → transitionPhase() to complete
 * 10. Final state persisted to Supabase for archival
 * 
 * All crews visible in real-time:
 * - Web UI: ProjectBoard + StoryExecutionCard
 * - VS Code: Story Execution Panel + Crew Copilot sidebar
 * - Both receive updates via WebSocket ~100ms latency
 * - All data persisted to Supabase for audit trail
 */

export {}; // Make this valid TypeScript
