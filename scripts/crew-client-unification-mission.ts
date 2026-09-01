import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';

(async () => {
const BRIEF = `Observation Lounge — CLIENT UNIFICATION MISSION

PROBLEM STATEMENT:
The system has inconsistent client terminology and structure:
- Database: clients table (multi-tenant), with entries like 'familiarcat' (firm/root) and 'jonah' (client)
- UI Components: ProjectList, SprintBoard, StoryDetail reference "clients" but terminology is unclear
- API Endpoints: /api/pm/projects, /api/pm/sprints, /api/pm/stories all use client_id in queries
- Type System: PMProject, PMSprint, PMStory have client_id field but no clear single-source-of-truth list
- Code Pattern: "familiarcat" appears as both firm-level and sometimes as a project reference

GROUND TRUTH (verified from codebase):
- Database schema (supabase/migrations/): tables are sa_projects, sa_sprints, sa_stories, sa_tasks — ALL prefixed sa_ and ALL include client_id
- Supabase RLS policies enforce client_id-based data isolation per client
- Next.js UI (/packages/ui/app): all PM components in app/components/pm/ use useProjectList(clientId, ...) hook
- Type system (/packages/shared/src/pm-types.ts): PMProject, PMSprint, PMStory all have client_id: UUID
- Onboarding flow (scripts/onboard-client.ts): creates clients in database via onboardClient() function
- Bootstrap: 'familiarcat' is created as firm/root; 'jonah' is created as onboarded client

GOAL (terse, unified):
Design and implement a SINGLE CLIENT LIST throughout the system such that:
1. Database: clients table is the single source of truth (one row per client: firm/root or child client)
2. Type System: ClientRegistry exposes clean API (getClient(id), listClients(), isChild(id, parentId))
3. UI/UX: All PM components use consistent client context (no ambiguity between firm and project)
4. API: All endpoints (projects/sprints/stories/tasks) accept client_id as first-class parameter
5. Hooks: useProjectList, useSprintList, etc. all take client_id as required first param

WORK BREAKDOWN (for Riker → crew):
1. **Picard/Data — ANALYSIS PHASE**: Review database schema, UI components, API endpoints, type definitions. Identify all client_id usages. List current inconsistencies (terminology, hierarchy, hierarchy-enforcement).
2. **Quark/Geordi — ARCHITECTURE PHASE**: Design unified client structure. Should be simple: one clients table, hierarchical (parent_client_id), RLS per client_id. Propose ClientRegistry API (what methods, what signature).
3. **Uhura/Troi — UX/DX PHASE**: Review UI component signatures. Propose consistent hook signatures (all take clientId first). Review API endpoint patterns (query params vs route params). Propose client selector for UI (how does user pick active client?).
4. **Worf/Yar — SAFETY PHASE**: Verify RLS policies enforce client isolation. Identify any hard-coded firm/project references that break multi-tenant safety. Propose remediation.
5. **Riker — EXECUTION PHASE**: Once plan is approved, execute: (a) minimal schema migration if needed, (b) update hooks/API (b) update UI components, (c) test end-to-end. Auto-execute using agent-core loop with zero human interaction.

DECISION POINT:
Crew should propose the SINGLE unifying idea (one principle that solves all inconsistencies). Examples: "all client_id is in path param", "all client context comes from ClientRegistry", "UI always starts with client picker". Picard decides which.

Make it so. Then execute.`;

const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T-]/g,'');
const md = ['# Observation Lounge — Client Unification Mission','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Problem','Client terminology and structure inconsistency (familiarcat/firm vs jonah/clients).','','## Goals',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — Unified Plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/client-unification-${stamp}.md`; 
writeFileSync(p,md); 
console.log('TRANSCRIPT '+p);

const obs=await storeObservationMemory({
  storyId:'client-unification',
  source:'crew-mission',
  transcript:{
    rounds:[{
      title:'client unification analysis',
      entries:r.contributions.map(c=>({
        speakerId:c.crewId,
        position:'analysis',
        statement:c.text,
        evidence:[c.model]
      }))
    }],
    consensusSummary:r.missionPlan,
    unresolvedRisks:['must verify RLS policies after schema changes','must test multi-client isolation','must update all UI screens'],
    finalDecision:'approved-for-execution',
    actionItems:['execute schema migrations if needed','update ClientRegistry API','update all hook signatures','update API endpoints','update UI components','end-to-end testing']
  },
  tags:['client','unification','multi-tenant','database','ui','api','autonomy']
});
console.log('OBS '+obs.id+' emb='+embeddingSource());

const m=await storeCrewPersonalMemory({
  crew_id:'picard',
  memory_type:'decision_note',
  title:'Client unification — unified architecture for consistent client handling across DB/API/UI',
  content:r.missionPlan,
  tags:['client','unification','architecture','autonomy'],
  relates_to_crew:['data','quark','geordi','uhura','troi','worf','yar','riker']
});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
console.log('NEXT: run crew-client-unification-execute.ts to autonomously execute the plan');
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
