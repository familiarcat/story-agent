import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';
import { createHash } from 'crypto';

interface StoryDefinition {
  ref: string;
  title: string;
  notes: string;
  acceptanceCriteria: string;
  status?: string;
}

interface SeedProjectOptions {
  clientId: string;
  clientName: string;
  securityTier: string;
  projectId: string;
  projectName: string;
  epicId: string;
  epicName: string;
  repoFullName: string;
  stories: StoryDefinition[];
}

export async function seedProject(options: SeedProjectOptions) {
  const db = await getDbClient();
  const { clientId, clientName, securityTier, projectId, projectName, epicId, epicName, repoFullName, stories } = options;

  console.log(`🌱 Seeding project "${projectName}" for client "${clientName}"...`);

  // 0. Upsert Client
  const { error: clientError } = await db.from('clients').upsert({
    id: clientId,
    name: clientName,
    security_tier: securityTier
  });
  if (clientError) console.error(`❌ Client seed error for ${clientId}:`, clientError.message);

  // 1. Upsert Project
  const { error: projectError } = await db.from('projects').upsert({
    id: projectId,
    client_id: clientId,
    name: projectName,
    status: 'active',
    description: `Autonomous generation project for ${projectName} for client ${clientName}.`
  });
  if (projectError) console.error(`❌ Project seed error for ${projectId}:`, projectError.message);

  // 1.5. Upsert Epic
  const { error: epicError } = await db.from('epics').upsert({
    id: epicId,
    client_id: clientId,
    project_id: projectId,
    name: epicName,
    description: `Foundational epic for ${projectName}.`
  });
  if (epicError) console.error(`❌ Epic seed error for ${epicId}:`, epicError.message);

  // 2. Upsert Story Sequence
  for (const item of stories) {
    const deterministicId = createHash('sha256')
      .update(`${repoFullName}:${item.ref}`)
      .digest('hex')
      .substring(0, 36);

    const { error: storyError } = await db.from('stories').upsert({
      id: deterministicId,
      story_id: item.ref,
      client_id: clientId,
      project_id: projectId,
      epic_id: epicId,
      story_title: item.title,
      status: item.status || 'discovery',
      repo_full_name: repoFullName,
      branch: item.ref,
      base_branch: 'main',
      phase: 1,
      notes: item.notes,
      acceptance_criteria: item.acceptanceCriteria
    });

    if (storyError) {
      console.error(`❌ Story seed error for ${item.ref}:`, storyError.message);
    } else {
      console.log(`✅ Seeded: ${item.ref} - ${item.title}`);
    }
  }

  console.log('--------------------------------------------------------');
  console.log(`✅ Project "${projectName}" hierarchy established for client "${clientName}".`);
  console.log(`🔗 Hierarchy: ${clientId} > Proj: ${projectId} > Epic: ${epicId}`);
}