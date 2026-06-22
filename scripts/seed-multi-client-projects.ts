import 'dotenv/config';
import { seedProject } from './seed-project.js';

async function main() {
  console.log('🚀 Seeding Multi-Client Projects for Sovereign Factory...');
  console.log('========================================================');

  // 1. Seed Client's ToDo Application
  await seedProject({
    clientId: 'client-int',
    clientName: 'Client Pharmaceuticals',
    securityTier: 'regulated',
    projectId: 'proj-client-todo',
    projectName: 'Client ToDo Application',
    epicId: 'epic-client-todo-foundation',
    epicName: 'ToDo App Foundation for Client',
    repoFullName: 'client-int/sovereign-todo',
    stories: [
      {
        ref: 'BPC-001',
        title: 'Design ToDo Table Schema (Client)',
        notes: 'Design the core tasks table for Client\'s ToDo application, enforcing multi-tenant RLS and PHI compliance.',
        acceptanceCriteria: '1. Schema includes org_id. 2. RLS policies drafted for PHI. 3. Database constraints for status and due dates.',
      },
      {
        ref: 'BPC-002',
        title: 'Implement RLS Policies for Tasks (Client)',
        notes: 'Enforce org_id isolation on the tasks table with Client\'s regulated data policies.',
        acceptanceCriteria: '1. RLS policies prevent cross-tenant access. 2. PHI fields are protected. 3. Audit trail for RLS violations.',
      },
    ],
  });

  console.log('\n');

  // 2. Seed Jonah's ToDo Application (client nested under the familiarcat main user)
  await seedProject({
    clientId: 'jonah',
    clientName: 'Jonah',
    securityTier: 'enterprise',
    projectId: 'proj-jonah-todo',
    projectName: 'Jonah ToDo Application',
    epicId: 'epic-jonah-todo-foundation',
    epicName: 'ToDo App Foundation for Jonah',
    repoFullName: 'jonah-corp/sovereign-todo',
    stories: [
      {
        ref: 'JTC-001',
        title: 'Design ToDo Table Schema (Jonah)',
        notes: 'Design the core tasks table for Jonah\'s ToDo application, enforcing multi-tenant RLS for enterprise data.',
        acceptanceCriteria: '1. Schema includes org_id. 2. RLS policies drafted for enterprise data. 3. Database constraints for status and due dates.',
      },
      {
        ref: 'JTC-002',
        title: 'Implement RLS Policies for Tasks (Jonah)',
        notes: 'Enforce org_id isolation on the tasks table with Jonah\'s enterprise data policies.',
        acceptanceCriteria: '1. RLS policies prevent cross-tenant access. 2. Enterprise data fields are protected. 3. Audit trail for RLS violations.',
      },
    ],
  });

  console.log('\n');

  // 3. Seed Jonah's Project Management Application
  await seedProject({
    clientId: 'jonah-corp',
    clientName: 'Jonah Corporation',
    securityTier: 'enterprise',
    projectId: 'proj-jonah-pm',
    projectName: 'Jonah Project Management',
    epicId: 'epic-jonah-pm-foundation',
    epicName: 'Project Management App Foundation for Jonah',
    repoFullName: 'jonah-corp/sovereign-pm',
    stories: [
      {
        ref: 'JPM-001',
        title: 'Design Project Table Schema (Jonah)',
        notes: 'Design the core projects table for Jonah\'s Project Management application, enforcing multi-tenant RLS.',
        acceptanceCriteria: '1. Schema includes org_id. 2. RLS policies drafted for project data. 3. Database constraints for status and deadlines.',
      },
      {
        ref: 'JPM-002',
        title: 'Implement RLS Policies for Projects (Jonah)',
        notes: 'Enforce org_id isolation on the projects table with Jonah\'s enterprise data policies.',
        acceptanceCriteria: '1. RLS policies prevent cross-tenant access. 2. Project data fields are protected. 3. Audit trail for RLS violations.',
      },
    ],
  });

  console.log('\n========================================================');
  console.log('✅ All multi-client projects seeded successfully.');
}

main().catch(err => {
  console.error('❌ Multi-client project seeding failed:', err);
  process.exit(1);
});