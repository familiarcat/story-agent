/**
 * SIMPLIFIED SAMPLE DATA SEED - Test Clients & Structure
 * 
 * Creates test clients and demonstrates multi-tenant readiness.
 * The sa_projects, sa_sprints, sa_stories, and sa_tasks tables need to be
 * migrated to Supabase first (via `supabase db push`).
 * 
 * This script proves:
 * - Multi-client support in the clients table
 * - Client hierarchy (parent_client_id)
 * - Ready for project seeding once PM tables exist
 * 
 * Usage: npx tsx scripts/seed-sample-clients-v2.ts
 */

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { getDbClient } from '../packages/shared/src/db.js';

type UUID = string;

const SYSTEM_USER_ID = 'crew-system' as UUID;

interface SampleClient {
  id: UUID;
  name: string;
  tier: string;
  description: string;
  parentId?: UUID;
}

const SAMPLE_CLIENTS: SampleClient[] = [
  {
    id: 'familiarcat' as UUID,
    name: 'Familiarcat',
    tier: 'enterprise',
    description: 'The Sovereign Factory – internal R&D and operations platform',
  },
  {
    id: 'jonah' as UUID,
    name: 'Jonah',
    tier: 'enterprise',
    description: 'Commercial real-estate platform – St. Louis market leader',
  },
  {
    id: 'neutral-labs' as UUID,
    name: 'Neutral Labs',
    tier: 'standard',
    description: 'Healthcare analytics startup – early-stage platform integration',
  },
];

// Sample projects that WILL be created once sa_projects table is migrated
const SAMPLE_PROJECTS = [
  // Familiarcat projects
  { name: 'Story Agent Platform — Core Engine', client: 'familiarcat', workflow: 'scrum' },
  { name: 'WorfGate Security Framework', client: 'familiarcat', workflow: 'hybrid' },
  // Jonah projects
  { name: 'Property Listing Platform', client: 'jonah', workflow: 'scrum' },
  { name: 'Mortgage Calculator & Analytics', client: 'jonah', workflow: 'kanban' },
  // Neutral Labs projects
  { name: 'Patient Data Aggregation Engine', client: 'neutral-labs', workflow: 'scrum' },
];

// Crew expertise mapping for task assignment
const CREW_MEMBERS = [
  { id: 'picard', role: 'Captain', specialty: 'Strategic Leadership' },
  { id: 'data', role: 'Officer', specialty: 'Architecture & Database Design' },
  { id: 'riker', role: 'Officer', specialty: 'Development & Implementation' },
  { id: 'geordi', role: 'Officer', specialty: 'Infrastructure & Deployment' },
  { id: 'obrien', role: 'Officer', specialty: 'DevOps & CI/CD' },
  { id: 'worf', role: 'Officer', specialty: 'Security & Compliance' },
  { id: 'yar', role: 'Officer', specialty: 'QA & Testing' },
  { id: 'troi', role: 'Counselor', specialty: 'UX & Stakeholder Relations' },
  { id: 'crusher', role: 'Officer', specialty: 'System Health & Monitoring' },
  { id: 'uhura', role: 'Officer', specialty: 'Communications & Documentation' },
  { id: 'quark', role: 'Contractor', specialty: 'Backend Systems & Optimization' },
];

async function seedClients() {
  const db = await getDbClient();

  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║  🖖  STORY AGENT — MULTI-TENANT CLIENT SEEDING                       ║
║  Preparing Test Clients for Agile Project Management                ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
`);

  console.log('📋 SEEDING TEST CLIENTS\n');
  console.log('Creating enterprise and standard test clients...\n');

  let successCount = 0;
  const createdClients: string[] = [];

  for (const client of SAMPLE_CLIENTS) {
    try {
      const { data, error } = await db
        .from('clients')
        .upsert(
          {
            id: client.id,
            name: client.name,
            security_tier: client.tier,
            parent_client_id: client.parentId || null,
            onboarded_by: SYSTEM_USER_ID,
          },
          { onConflict: 'id' }
        )
        .select();

      if (error) {
        console.log(`  ⚠️  ${client.name}: ${error.message.substring(0, 60)}`);
      } else if (data && data.length > 0) {
        successCount++;
        createdClients.push(client.name);
        console.log(
          `  ✅ ${client.name} (${client.tier})`
        );
        console.log(`      └─ ${client.description}`);
      }
    } catch (err) {
      console.log(
        `  ⚠️  ${client.name}: ${err instanceof Error ? err.message.substring(0, 60) : 'Unknown error'}`
      );
    }
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                   ✅ CLIENTS SEEDED SUCCESSFULLY                     ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Test Clients Created: ${successCount}/${SAMPLE_CLIENTS.length}                                  ║
║                                                                      ║
`);

  for (const clientName of createdClients) {
    console.log(`║    • ${clientName.padEnd(57)} ║`);
  }

  console.log(`
╠══════════════════════════════════════════════════════════════════════╣
║  PROJECTS READY FOR SEEDING (once sa_projects table is migrated):    ║
║                                                                      ║
║  FAMILIARCAT (Enterprise):                                          ║
║    • Story Agent Platform — Core Engine (scrum)                     ║
║    • WorfGate Security Framework (hybrid)                           ║
║                                                                      ║
║  JONAH (Enterprise):                                                ║
║    • Property Listing Platform (scrum)                              ║
║    • Mortgage Calculator & Analytics (kanban)                       ║
║                                                                      ║
║  NEUTRAL LABS (Standard):                                           ║
║    • Patient Data Aggregation Engine (scrum)                        ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  CREW ASSIGNMENTS BY EXPERTISE:                                      ║
║                                                                      ║
║  Architecture & Data Model:                                         ║
║    → Commander Data (architecture, database design)                 ║
║                                                                      ║
║  Development & Core Features:                                       ║
║    → Commander Riker (implementation, backend features)             ║
║                                                                      ║
║  Testing & Quality:                                                 ║
║    → Tasha Yar (QA, test automation, bug verification)              ║
║                                                                      ║
║  UX & Stakeholder Management:                                       ║
║    → Counselor Troi (UX design, user research)                      ║
║                                                                      ║
║  System Health & Monitoring:                                        ║
║    → Dr. Crusher (monitoring, incident response)                    ║
║                                                                      ║
║  Security & Compliance:                                             ║
║    → Lieutenant Worf (security review, encryption)                  ║
║                                                                      ║
║  Infrastructure & Deployment:                                       ║
║    → Geordi La Forge (deployment, scaling, performance)             ║
║                                                                      ║
║  DevOps & CI/CD:                                                    ║
║    → Chief O'Brien (containerization, orchestration)                ║
║                                                                      ║
║  Communications & Documentation:                                    ║
║    → Lt. Uhura (documentation, API docs, communications)            ║
║                                                                      ║
║  Backend Systems & Optimization:                                    ║
║    → Quark (backend systems, cost optimization)                     ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  NEXT STEPS:                                                         ║
║                                                                      ║
║  1. Apply Supabase migrations:                                      ║
║     $ supabase db push                                              ║
║                                                                      ║
║  2. Run full project seeding:                                       ║
║     $ npx tsx scripts/seed-sample-projects.ts                       ║
║                                                                      ║
║  3. Verify data in Supabase dashboard or test API endpoints         ║
║                                                                      ║
║  4. Run UI: pnpm dev                                                ║
║     Visit http://localhost:3000/projects                           ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  VALIDATION: Multi-Client API Endpoints                             ║
║                                                                      ║
║  Test with curl (once projects table is migrated):                  ║
║                                                                      ║
║  Get Familiarcat projects:                                          ║
║  curl "http://localhost:3000/api/pm/projects?client_id=familiarcat" ║
║                                                                      ║
║  Get Jonah projects:                                                ║
║  curl "http://localhost:3000/api/pm/projects?client_id=jonah"       ║
║                                                                      ║
║  Get Neutral Labs projects:                                         ║
║  curl "http://localhost:3000/api/pm/projects?client_id=neutral-labs"║
║                                                                      ║
║  Each client sees only their own projects (RLS enforced).           ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
`);

  process.exit(0);
}

seedClients().catch((err) => {
  console.error('❌ Seed failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
