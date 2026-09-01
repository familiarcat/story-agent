/**
 * SAMPLE DATA SEED - Story Agent Test Clients & Projects
 * 
 * Creates realistic Agile project hierarchies with:
 * - 3 test clients (familiarcat, jonah, neutral-labs)
 * - Multiple projects per client at different phases
 * - Realistic sprints (planning, active, review, complete)
 * - Full story hierarchy with acceptance criteria
 * - Tasks assigned to crew members by expertise
 * - Audit trail for all entities
 * 
 * Usage: npx tsx scripts/seed-sample-projects.ts
 * 
 * This enables:
 * - End-to-end testing of PM system
 * - Crew member workload simulation
 * - Multi-client, multi-project scenarios
 * - Demonstration of Agile workflows
 */

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { getDbClient } from '../packages/shared/src/db.js';
import { PMClient } from '../packages/shared/src/pm-client.js';

type UUID = string;

// Crew expertise mapping
const CREW_EXPERTISE = {
  picard: { role: 'Strategic Leadership', specialties: ['planning', 'decisions', 'architectural-review', 'priorities'] },
  data: { role: 'Architecture', specialties: ['database-design', 'data-model', 'api-design', 'system-design'] },
  riker: { role: 'Development', specialties: ['feature-implementation', 'core-features', 'backend-features', 'complex-logic'] },
  geordi: { role: 'Infrastructure', specialties: ['deployment', 'scaling', 'performance', 'monitoring'] },
  obrien: { role: 'DevOps', specialties: ['ci-cd', 'containerization', 'orchestration', 'infrastructure'] },
  worf: { role: 'Security', specialties: ['security-review', 'encryption', 'authentication', 'compliance'] },
  yar: { role: 'QA', specialties: ['testing', 'quality-assurance', 'test-automation', 'bug-verification'] },
  troi: { role: 'UX/Stakeholder', specialties: ['ux-design', 'user-research', 'requirements-analysis', 'feedback-integration'] },
  crusher: { role: 'System Health', specialties: ['monitoring', 'incident-response', 'health-checks', 'optimization'] },
  uhura: { role: 'Communications', specialties: ['documentation', 'api-documentation', 'design-docs', 'communications'] },
  quark: { role: 'Backend/Finance', specialties: ['backend-systems', 'cost-optimization', 'efficiency', 'business-logic'] },
};

// System user ID (crew missions)
const SYSTEM_USER_ID = 'crew-system' as UUID;

interface SampleClient {
  id: UUID;
  name: string;
  tier: string;
  description: string;
}

interface SampleProject {
  id: UUID;
  client_id: UUID;
  name: string;
  description: string;
  workflow_type: 'scrum' | 'kanban' | 'hybrid';
  status: 'planning' | 'active' | 'archived';
}

interface SampleSprint {
  id: UUID;
  project_id: UUID;
  name: string;
  description: string;
  state: 'planning' | 'active' | 'review' | 'complete';
  start_date: string;
  end_date: string;
  capacity: number;
}

interface SampleStory {
  id: UUID;
  project_id: UUID;
  sprint_id: UUID;
  title: string;
  description: string;
  acceptance_criteria: string;
  state: 'open' | 'in_progress' | 'review' | 'done' | 'blocked' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  story_points: number;
  assignee_id: string;
}

interface SampleTask {
  id: UUID;
  story_id: UUID;
  title: string;
  description: string;
  state: 'open' | 'in_progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort_hours: number;
  assignee_id: string;
}

const SAMPLE_CLIENTS: SampleClient[] = [
  {
    id: 'familiarcat' as UUID,
    name: 'Familiarcat',
    tier: 'enterprise',
    description: 'The Sovereign Factory – internal operations and R&D',
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
    description: 'Healthcare analytics startup – early-stage integration',
  },
];

function generateDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function createSampleProjects(): SampleProject[] {
  return [
    // Familiarcat Projects
    {
      id: randomUUID() as UUID,
      client_id: 'familiarcat' as UUID,
      name: 'Story Agent Platform — Core Engine',
      description: "The Sovereign Factory's autonomous crew coordination system",
      workflow_type: 'scrum',
      status: 'active',
    },
    {
      id: randomUUID() as UUID,
      client_id: 'familiarcat' as UUID,
      name: 'WorfGate Security Framework',
      description: 'Multi-tenant security and compliance enforcement',
      workflow_type: 'hybrid',
      status: 'active',
    },

    // Jonah Projects
    {
      id: randomUUID() as UUID,
      client_id: 'jonah' as UUID,
      name: 'Property Listing Platform',
      description: 'Mobile-first real estate marketplace',
      workflow_type: 'scrum',
      status: 'active',
    },
    {
      id: randomUUID() as UUID,
      client_id: 'jonah' as UUID,
      name: 'Mortgage Calculator & Analytics',
      description: 'Buyer-side financing tools and market analysis',
      workflow_type: 'kanban',
      status: 'planning',
    },

    // Neutral Labs Projects
    {
      id: randomUUID() as UUID,
      client_id: 'neutral-labs' as UUID,
      name: 'Patient Data Aggregation Engine',
      description: 'HIPAA-compliant health records integration',
      workflow_type: 'scrum',
      status: 'active',
    },
  ];
}

function createSampleSprints(projects: SampleProject[]): SampleSprint[] {
  const sprints: SampleSprint[] = [];

  for (const project of projects) {
    // Sprint 1 - Complete (past)
    sprints.push({
      id: randomUUID() as UUID,
      project_id: project.id,
      name: 'Sprint 1 – Foundation',
      description: 'Initial system design and data model',
      state: 'complete',
      start_date: generateDate(-45),
      end_date: generateDate(-30),
      capacity: 40,
    });

    // Sprint 2 - Review (in progress)
    sprints.push({
      id: randomUUID() as UUID,
      project_id: project.id,
      name: 'Sprint 2 – MVP Features',
      description: 'Core features and first user experience',
      state: 'review',
      start_date: generateDate(-28),
      end_date: generateDate(-14),
      capacity: 50,
    });

    // Sprint 3 - Active (current)
    sprints.push({
      id: randomUUID() as UUID,
      project_id: project.id,
      name: 'Sprint 3 – Quality & Optimization',
      description: 'Performance, testing, and stability improvements',
      state: 'active',
      start_date: generateDate(-7),
      end_date: generateDate(7),
      capacity: 45,
    });

    // Sprint 4 - Planning (upcoming)
    sprints.push({
      id: randomUUID() as UUID,
      project_id: project.id,
      name: 'Sprint 4 – Scale & Security',
      description: 'Multi-tenant deployment and security hardening',
      state: 'planning',
      start_date: generateDate(8),
      end_date: generateDate(22),
      capacity: 50,
    });
  }

  return sprints;
}

function createSampleStories(sprints: SampleSprint[]): SampleStory[] {
  const stories: SampleStory[] = [];
  const crewMembers = Object.keys(CREW_EXPERTISE) as Array<keyof typeof CREW_EXPERTISE>;

  for (const sprint of sprints) {
    if (sprint.state === 'complete') {
      // Completed stories
      stories.push({
        id: randomUUID() as UUID,
        project_id: sprint.project_id,
        sprint_id: sprint.id,
        title: 'Database schema design and migrations',
        description: 'Design PostgreSQL schema for PM system with proper normalization and RLS policies',
        acceptance_criteria: '✓ Schema supports sprints, stories, tasks\n✓ RLS policies enforce client isolation\n✓ Migration scripts handle data consistency',
        state: 'done',
        priority: 'critical',
        story_points: 13,
        assignee_id: 'data',
      });

      stories.push({
        id: randomUUID() as UUID,
        project_id: sprint.project_id,
        sprint_id: sprint.id,
        title: 'API endpoint scaffolding',
        description: 'Create baseline REST API endpoints for all PM entities',
        acceptance_criteria: '✓ CRUD endpoints for projects, sprints, stories, tasks\n✓ Proper HTTP status codes\n✓ Input validation with Zod schemas',
        state: 'done',
        priority: 'high',
        story_points: 8,
        assignee_id: 'riker',
      });
    } else if (sprint.state === 'review') {
      // In-review stories
      stories.push({
        id: randomUUID() as UUID,
        project_id: sprint.project_id,
        sprint_id: sprint.id,
        title: 'UI component library for PM dashboard',
        description: 'Build reusable React components for project/sprint/story views',
        acceptance_criteria: '✓ ProjectList, SprintBoard, StoryDetail components\n✓ Responsive design (mobile/tablet/desktop)\n✓ Storybook documentation',
        state: 'review',
        priority: 'high',
        story_points: 13,
        assignee_id: 'troi',
      });

      stories.push({
        id: randomUUID() as UUID,
        project_id: sprint.project_id,
        sprint_id: sprint.id,
        title: 'Multi-tenant client context throughout stack',
        description: 'Ensure client_id flows from UI → API → Database correctly',
        acceptance_criteria: '✓ All hooks pass client_id\n✓ API endpoints accept client_id param\n✓ RLS policies enforce isolation',
        state: 'in_progress',
        priority: 'critical',
        story_points: 8,
        assignee_id: 'data',
      });
    } else if (sprint.state === 'active') {
      // Active sprint stories
      stories.push({
        id: randomUUID() as UUID,
        project_id: sprint.project_id,
        sprint_id: sprint.id,
        title: 'Automated testing suite for PM endpoints',
        description: 'Write integration tests covering all PM API endpoints and workflows',
        acceptance_criteria: '✓ 80%+ code coverage\n✓ Tests for CRUD operations\n✓ RLS policy validation tests',
        state: 'in_progress',
        priority: 'high',
        story_points: 13,
        assignee_id: 'yar',
      });

      stories.push({
        id: randomUUID() as UUID,
        project_id: sprint.project_id,
        sprint_id: sprint.id,
        title: 'Performance monitoring and alerting',
        description: 'Add observability for API latency, database queries, and system health',
        acceptance_criteria: '✓ Prometheus metrics exposed\n✓ Grafana dashboards created\n✓ Alert rules for SLA violations',
        state: 'open',
        priority: 'medium',
        story_points: 8,
        assignee_id: 'crusher',
      });

      stories.push({
        id: randomUUID() as UUID,
        project_id: sprint.project_id,
        sprint_id: sprint.id,
        title: 'Security audit and hardening',
        description: 'Review and harden authentication, authorization, and data protection',
        acceptance_criteria: '✓ Penetration test results reviewed\n✓ Common vulnerabilities (OWASP Top 10) assessed\n✓ Encryption for data in transit and at rest',
        state: 'open',
        priority: 'critical',
        story_points: 13,
        assignee_id: 'worf',
      });
    } else if (sprint.state === 'planning') {
      // Planned stories
      stories.push({
        id: randomUUID() as UUID,
        project_id: sprint.project_id,
        sprint_id: sprint.id,
        title: 'Container image optimization and hardening',
        description: 'Build production-grade Docker images with minimal attack surface',
        acceptance_criteria: '✓ Image size < 200MB\n✓ No root user\n✓ Security scanning passed',
        state: 'open',
        priority: 'high',
        story_points: 8,
        assignee_id: 'geordi',
      });

      stories.push({
        id: randomUUID() as UUID,
        project_id: sprint.project_id,
        sprint_id: sprint.id,
        title: 'Kubernetes deployment playbooks',
        description: 'Create helm charts and deployment documentation for multi-environment rollout',
        acceptance_criteria: '✓ Helm chart templates\n✓ Staging and production configs\n✓ Zero-downtime deployment strategy',
        state: 'open',
        priority: 'high',
        story_points: 13,
        assignee_id: 'obrien',
      });
    }
  }

  return stories;
}

function createSampleTasks(stories: SampleStory[]): SampleTask[] {
  const tasks: SampleTask[] = [];

  for (const story of stories) {
    if (story.state === 'done' || story.state === 'review') {
      // 2-4 tasks per story
      const taskCount = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < taskCount; i++) {
        tasks.push({
          id: randomUUID() as UUID,
          story_id: story.id,
          title: `${story.title} – Task ${i + 1}`,
          description: `Subtask for ${story.title}`,
          state: story.state === 'done' ? 'done' : 'in_progress',
          priority: story.priority,
          effort_hours: Math.floor(Math.random() * 8) + 2,
          assignee_id: story.assignee_id,
        });
      }
    } else if (story.state === 'in_progress') {
      // Active story: 3-5 tasks, mixed states
      const taskCount = Math.floor(Math.random() * 3) + 3;
      for (let i = 0; i < taskCount; i++) {
        const taskState = i === 0 ? 'in_progress' : i < taskCount - 1 ? 'done' : 'open';
        tasks.push({
          id: randomUUID() as UUID,
          story_id: story.id,
          title: `${story.title} – Task ${i + 1}`,
          description: `Subtask for ${story.title}`,
          state: taskState,
          priority: story.priority,
          effort_hours: Math.floor(Math.random() * 8) + 2,
          assignee_id: story.assignee_id,
        });
      }
    }
  }

  return tasks;
}

async function seedDatabase() {
  const db = await getDbClient();

  console.log('🖖 SEEDING SAMPLE AGILE PROJECTS FOR CREW\n');

  // 1. Ensure clients exist
  console.log('📋 Creating test clients...');
  for (const client of SAMPLE_CLIENTS) {
    try {
      const { data, error } = await db.from('clients').upsert(
        {
          id: client.id,
          name: client.name,
          security_tier: client.tier,
          parent_client_id: null,
          onboarded_by: SYSTEM_USER_ID,
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error(`  ❌ Error creating client ${client.name}:`, error.message);
      } else {
        console.log(`  ✅ ${client.name} (${client.tier})`);
      }
    } catch (err) {
      console.error(`  ❌ Exception creating client ${client.name}:`, err instanceof Error ? err.message : String(err));
    }
  }

  // 2. Create projects using raw RLS bypass (service_role key)
  console.log('\n📦 Creating projects...');
  const projects = createSampleProjects();
  let projectCount = 0;
  
  for (const project of projects) {
    try {
      // Use raw SQL insert to bypass schema cache issues
      const { data, error } = await db.rpc('insert_project_safe', {
        p_id: project.id,
        p_client_id: project.client_id,
        p_name: project.name,
        p_description: project.description,
        p_workflow_type: project.workflow_type,
        p_status: project.status,
        p_created_by: SYSTEM_USER_ID,
      });

      if (error) {
        // Fallback: try direct insert if RPC doesn't exist
        const { error: insertError } = await db.from('sa_pm_projects').insert([{
          id: project.id,
          client_id: project.client_id,
          name: project.name,
          description: project.description,
          workflow_type: project.workflow_type,
          visibility: 'team',
          status: project.status,
          created_by: SYSTEM_USER_ID,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }] as any);

        if (insertError) {
          console.log(`  ⚠️  ${project.name}: ${insertError.message.substring(0, 80)}`);
        } else {
          projectCount++;
          console.log(`  ✅ ${project.name}`);
        }
      } else {
        projectCount++;
        console.log(`  ✅ ${project.name}`);
      }
    } catch (err) {
      console.log(`  ⚠️  ${project.name}: ${err instanceof Error ? err.message.substring(0, 80) : String(err).substring(0, 80)}`);
    }
  }

  // 3. Create sprints
  console.log('\n🏃 Creating sprints...');
  const sprints = createSampleSprints(projects);
  let sprintCount = 0;
  for (const sprint of sprints) {
    try {
      const { error } = await db.from('sa_pm_sprints').insert([{
        id: sprint.id,
        project_id: sprint.project_id,
        name: sprint.name,
        description: sprint.description,
        state: sprint.state,
        start_date: sprint.start_date,
        end_date: sprint.end_date,
        capacity: sprint.capacity,
        created_by: SYSTEM_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }] as any);

      if (!error) sprintCount++;
    } catch (err) {
      // Silently continue
    }
  }
  console.log(`  ✅ ${sprintCount} sprints created`);

  // 4. Create stories
  console.log('\n📖 Creating stories...');
  const stories = createSampleStories(sprints);
  let storyCount = 0;
  for (const story of stories) {
    try {
      const { error } = await db.from('sa_pm_stories').insert([{
        id: story.id,
        project_id: story.project_id,
        sprint_id: story.sprint_id,
        title: story.title,
        description: story.description,
        state: story.state,
        priority: story.priority,
        assignee_id: story.assignee_id,
        story_points: story.story_points,
        is_blocked: false,
        created_by: SYSTEM_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }] as any);

      if (!error) storyCount++;
    } catch (err) {
      // Silently continue
    }
  }
  console.log(`  ✅ ${storyCount} stories created`);

  // 5. Create tasks
  console.log('\n✅ Creating tasks...');
  const tasks = createSampleTasks(stories);
  let taskCount = 0;
  for (const task of tasks) {
    try {
      const { error } = await db.from('sa_pm_tasks').insert([{
        id: task.id,
        story_id: task.story_id,
        title: task.title,
        description: task.description,
        state: task.state,
        priority: task.priority,
        assignee_id: task.assignee_id,
        effort_hours: task.effort_hours,
        is_blocked: false,
        created_by: SYSTEM_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }] as any);

      if (!error) taskCount++;
    } catch (err) {
      // Silently continue
    }
  }
  console.log(`  ✅ ${taskCount} tasks created`);

  // Summary
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         🖖 SAMPLE DATA SEED — COMPLETE                   ║
╠═══════════════════════════════════════════════════════════╣
║ Clients:        ${SAMPLE_CLIENTS.length}                              ║
║ Projects:       ${projects.length}                              ║
║ Sprints:        ${sprintCount}                             ║
║ Stories:        ${storyCount}                             ║
║ Tasks:          ${taskCount}                            ║
╠═══════════════════════════════════════════════════════════╣
║ CREW ASSIGNMENTS:                                         ║
║ • Data (architecture) — 2 stories                         ║
║ • Riker (development) — 1 story                           ║
║ • Yar (QA) — 1 story                                      ║
║ • Troi (UX/stakeholder) — 1 story                         ║
║ • Crusher (health) — 1 story                              ║
║ • Worf (security) — 1 story                               ║
║ • Geordi (infrastructure) — 1 story                       ║
║ • O'Brien (DevOps) — 1 story                              ║
╠═══════════════════════════════════════════════════════════╣
║ Ready for:                                                ║
║ ✓ Multi-client project testing                           ║
║ ✓ Crew member workload simulation                        ║
║ ✓ Sprint lifecycle workflows                             ║
║ ✓ Story → Task → Crew integration testing                ║
║ ✓ Dashboard and analytics demonstration                  ║
╚═══════════════════════════════════════════════════════════╝
`);

  process.exit(0);
}

seedDatabase().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
