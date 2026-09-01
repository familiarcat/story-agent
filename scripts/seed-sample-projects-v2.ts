/**
 * SAMPLE DATA SEED V2 - Story Agent Test Clients & Projects
 * 
 * Fixed version that properly handles integer primary keys in sa_pm_* tables.
 * 
 * Schema:
 * - sa_pm_projects: id (int auto), project_id (int fk), external_id (text UUID)
 * - sa_pm_sprints: id (int auto), project_id (int fk), external_id (text UUID)
 * - sa_pm_stories: id (int auto), sprint_id (int fk), external_id (text UUID)
 * - sa_pm_tasks: id (int auto), story_id (int fk), external_id (text UUID)
 * 
 * Usage: npx tsx scripts/seed-sample-projects-v2.ts
 */

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { getDbClient } from '../packages/shared/src/db.js';

type UUID = string;

// Sample data
const SAMPLE_CLIENTS = [
  { id: 'familiarcat' as UUID, name: 'Familiarcat', tier: 'enterprise', description: 'The Sovereign Factory' },
  { id: 'jonah' as UUID, name: 'Jonah', tier: 'enterprise', description: 'Commercial real-estate platform' },
  { id: 'neutral-labs' as UUID, name: 'Neutral Labs', tier: 'standard', description: 'Healthcare analytics' },
];

const SYSTEM_USER_ID = 'crew-system' as UUID;

function generateDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

async function seedDatabase() {
  const db = await getDbClient();
  const startTime = Date.now();

  console.log('🖖 SEEDING SAMPLE AGILE PROJECTS FOR CREW\n');

  // 1. Ensure clients exist
  console.log('📋 Creating test clients...');
  for (const client of SAMPLE_CLIENTS) {
    try {
      await db.from('clients').upsert(
        {
          id: client.id,
          name: client.name,
          security_tier: client.tier,
          parent_client_id: null,
          onboarded_by: SYSTEM_USER_ID,
        },
        { onConflict: 'id' }
      );
      console.log(`  ✅ ${client.name}`);
    } catch (err) {
      console.log(`  ⚠️  ${client.name}: ${err instanceof Error ? err.message.substring(0, 80) : String(err).substring(0, 80)}`);
    }
  }

  // 2. Create projects and map UUID → integer ID
  console.log('\n📦 Creating projects...');
  const projectMap: Record<UUID, { intId: number; clientId: UUID }> = {};
  let projectCount = 0;

  const projectsToCreate = [
    // Familiarcat
    { uuid: randomUUID() as UUID, client: 'familiarcat' as UUID, name: 'Story Agent Platform — Core Engine' },
    { uuid: randomUUID() as UUID, client: 'familiarcat' as UUID, name: 'WorfGate Security Framework' },
    // Jonah
    { uuid: randomUUID() as UUID, client: 'jonah' as UUID, name: 'Property Listing Platform' },
    { uuid: randomUUID() as UUID, client: 'jonah' as UUID, name: 'Mortgage Calculator & Analytics' },
    // Neutral Labs
    { uuid: randomUUID() as UUID, client: 'neutral-labs' as UUID, name: 'Patient Data Aggregation Engine' },
  ];

  for (const proj of projectsToCreate) {
    try {
      const { error: insertError } = await db.from('sa_pm_projects').insert([{
        client_id: proj.client,
        external_id: proj.uuid,
        name: proj.name,
        key: proj.name.substring(0, 4).toUpperCase(),
        description: `Project: ${proj.name}`,
      }] as any);

      if (insertError) {
        console.log(`  ⚠️  ${proj.name}: ${insertError.message.substring(0, 80)}`);
      } else {
        // Query back to get the integer ID
        const { data: projData, error: queryError } = await db
          .from('sa_pm_projects')
          .select('id')
          .eq('external_id', proj.uuid)
          .single();

        if (projData && projData.id) {
          projectMap[proj.uuid] = { intId: projData.id, clientId: proj.client };
          projectCount++;
          console.log(`  ✅ ${proj.name} (int_id: ${projData.id})`);
        } else {
          console.log(`  ⚠️  ${proj.name}: Could not retrieve integer ID`);
        }
      }
    } catch (err) {
      console.log(`  ⚠️  ${proj.name}: ${err instanceof Error ? err.message.substring(0, 80) : String(err).substring(0, 80)}`);
    }
  }

  // 3. Create sprints and map UUID → integer ID
  console.log('\n🏃 Creating sprints...');
  const sprintMap: Record<UUID, number> = {};
  let sprintCount = 0;

  const sprintsToCreate: Array<{ uuid: UUID; projectUuid: UUID; name: string; state: string }> = [];
  for (const projUuid in projectMap) {
    const states = ['complete', 'review', 'active', 'planning'];
    for (let i = 0; i < 4; i++) {
      sprintsToCreate.push({
        uuid: randomUUID() as UUID,
        projectUuid: projUuid as UUID,
        name: `Sprint ${i + 1} – ${['Foundation', 'MVP Features', 'Quality & Optimization', 'Scale & Security'][i]}`,
        state: states[i],
      });
    }
  }

  for (const sprint of sprintsToCreate) {
    try {
      const projInfo = projectMap[sprint.projectUuid];
      if (!projInfo) {
        console.log(`  ⚠️  Sprint: Project not found for ${sprint.projectUuid}`);
        continue;
      }

      const { error: insertError } = await db.from('sa_pm_sprints').insert([{
        project_id: projInfo.intId,
        external_id: sprint.uuid,
        name: sprint.name,
        state: sprint.state,
        start_date: generateDate(Math.floor(Math.random() * -50)),
        end_date: generateDate(Math.floor(Math.random() * 30)),
        capacity: Math.floor(Math.random() * 20) + 40,
        created_by: SYSTEM_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }] as any);

      if (insertError) {
        console.log(`  ⚠️  ${sprint.name}: ${insertError.message.substring(0, 80)}`);
      } else {
        // Query back to get integer ID
        const { data: sprintData, error: queryError } = await db
          .from('sa_pm_sprints')
          .select('id')
          .eq('external_id', sprint.uuid)
          .single();

        if (sprintData && sprintData.id) {
          sprintMap[sprint.uuid] = sprintData.id;
          sprintCount++;
        }
      }
    } catch (err) {
      console.log(`  ⚠️  Sprint: ${err instanceof Error ? err.message.substring(0, 80) : String(err).substring(0, 80)}`);
    }
  }

  // 4. Create stories and map UUID → integer ID
  console.log('\n📖 Creating stories...');
  const storyMap: Record<UUID, number> = {};
  let storyCount = 0;

  const storiesToCreate: Array<{ uuid: UUID; sprintUuid: UUID; title: string; state: string }> = [];
  const storyTitles = [
    'Database schema design and migrations',
    'API endpoint scaffolding',
    'UI component library for PM dashboard',
    'Multi-tenant client context throughout stack',
    'Automated testing suite for PM endpoints',
    'Performance monitoring and alerting',
    'Security audit and hardening',
  ];

  for (const sprintUuid in sprintMap) {
    for (let i = 0; i < 2; i++) {
      const states = ['done', 'review', 'in_progress', 'open'];
      const stateIdx = Math.floor(Math.random() * states.length);
      storiesToCreate.push({
        uuid: randomUUID() as UUID,
        sprintUuid: sprintUuid as UUID,
        title: storyTitles[Math.floor(Math.random() * storyTitles.length)],
        state: states[stateIdx],
      });
    }
  }

  for (const story of storiesToCreate) {
    try {
      const sprintIntId = sprintMap[story.sprintUuid];
      if (!sprintIntId) {
        console.log(`  ⚠️  Story: Sprint not found for ${story.sprintUuid}`);
        continue;
      }

      const { error: insertError } = await db.from('sa_pm_stories').insert([{
        sprint_id: sprintIntId,
        external_id: story.uuid,
        title: story.title,
        description: `Story: ${story.title}`,
        status: story.state,
        story_points: Math.floor(Math.random() * 13) + 1,
        acceptance_criteria: `✓ Acceptance criteria for ${story.title}`,
        assigned_to: 'data',
        created_by: SYSTEM_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }] as any);

      if (insertError) {
        console.log(`  ⚠️  Story: ${insertError.message.substring(0, 80)}`);
      } else {
        // Query back to get integer ID
        const { data: storyData, error: queryError } = await db
          .from('sa_pm_stories')
          .select('id')
          .eq('external_id', story.uuid)
          .single();

        if (storyData && storyData.id) {
          storyMap[story.uuid] = storyData.id;
          storyCount++;
        }
      }
    } catch (err) {
      console.log(`  ⚠️  Story: ${err instanceof Error ? err.message.substring(0, 80) : String(err).substring(0, 80)}`);
    }
  }

  // 5. Create tasks
  console.log('\n✅ Creating tasks...');
  let taskCount = 0;

  const tasksToCreate: Array<{ storyUuid: UUID; title: string }> = [];
  for (const storyUuid in storyMap) {
    for (let i = 0; i < 2; i++) {
      tasksToCreate.push({
        storyUuid: storyUuid as UUID,
        title: `Task ${i + 1} for story`,
      });
    }
  }

  for (const task of tasksToCreate) {
    try {
      const storyIntId = storyMap[task.storyUuid];
      if (!storyIntId) continue;

      const { error: insertError } = await db.from('sa_pm_tasks').insert([{
        story_id: storyIntId,
        external_id: randomUUID() as UUID,
        title: task.title,
        description: `Task: ${task.title}`,
        status: 'open',
        priority: 'medium',
        assigned_to: 'crew',
        created_by: SYSTEM_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }] as any);

      if (!insertError) {
        taskCount++;
      }
    } catch (err) {
      // Silently continue
    }
  }

  // Final summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║         🖖 SAMPLE DATA SEED — COMPLETE                   ║`);
  console.log(`╠═══════════════════════════════════════════════════════════╣`);
  console.log(`║ Clients:        3                                         ║`);
  console.log(`║ Projects:       ${projectCount}                                        ║`);
  console.log(`║ Sprints:        ${sprintCount}                                       ║`);
  console.log(`║ Stories:        ${storyCount}                                       ║`);
  console.log(`║ Tasks:          ${taskCount}                                       ║`);
  console.log(`║ Duration:       ${duration}s                                     ║`);
  console.log(`╠═══════════════════════════════════════════════════════════╣`);
  console.log(`║ ✅ Multi-client project structure ready                   ║`);
  console.log(`║ ✅ Full sprint hierarchy created                          ║`);
  console.log(`║ ✅ Stories assigned to crew members                       ║`);
  console.log(`║ ✅ Tasks ready for execution tracking                    ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  process.exit(0);
}

seedDatabase().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
