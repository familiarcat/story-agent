import 'dotenv/config';
import { getDbClient } from '@story-agent/shared/db';
import { getCrewForTask } from '@story-agent/mcp-server/lib/domain-registry.js';
import { getCrewExpertise } from '@story-agent/mcp-server/lib/crew-expertise.js';
import { CREW_MISSION_ORDER } from '@story-agent/mcp-server/lib/crew-personas.js';
import { getApprovedToolsForCrew } from '@story-agent/mcp-server/lib/crew-tool-registry.js';

/**
 * Utility script to list all stories across all clients and projects,
 * ordered by creation date.
 * 
 * Conceptual Metaphor: This is the "Main Viewscreen" on the Starship Bridge,
 * providing a unified mission dashboard. This view allows the crew to see
 * which mission "consoles" (MCP skills and tools) need to be energized for
 * each story in the backlog.
 */
async function main() {
  console.log(' [BRIDGE] Station Assignments & Console Readiness:');

  const stationManifest = await Promise.all(CREW_MISSION_ORDER.map(async (crewId) => {
    const expertise = getCrewExpertise(crewId);
    const tools = await getApprovedToolsForCrew(crewId as any);
    return {
      'Crew Agent': crewId.toUpperCase(),
      'Console Station': expertise?.consoleName || 'N/A',
      'Primary Skills': (expertise?.primaryDomains || []).slice(0, 3).join(', ') + (expertise?.primaryDomains.length! > 3 ? '...' : ''),
      'Toolkit Size': tools.length
    };
  }));

  console.table(stationManifest);

  console.log('\n🖖 [BRIDGE] Energizing Viewscreen... scanning global mission backlog.');

  const db = await getDbClient();

  // Querying all stories with joined organizational data to resolve the full hierarchy
  const { data, error } = await db
    .from('stories')
    .select(`
      created_at,
      story_id,
      story_title,
      status,
      tags,
      clients ( name ),
      projects ( name )
    `)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('📭 [BRIDGE] Viewscreen is clear. No pending missions detected.');
    return;
  }

  console.log(`✅ [BRIDGE] Signal confirmed: ${data.length} mission stories in the buffer.`);
  
  const displayData = await Promise.all(data.map(async story => {
    const tags = (story.tags as string[]) || [];
    const routing = getCrewForTask(tags);
    
    const primaryExpertId = routing[0]?.crewId;
    const primaryExpertise = primaryExpertId ? getCrewExpertise(primaryExpertId) : null;
    const primaryConsole = primaryExpertise?.consoleName || 'Bridge Operations';
    
    // Identify lead tools available for this specific console's jurisdiction
    const leadTools = primaryExpertId ? await getApprovedToolsForCrew(primaryExpertId as any) : [];
    const leadSkills = routing[0]?.domains.map(d => d.domainId).join(', ') || 'Standard Ops';

    const supportConsoles = routing.slice(1, 3).map(r => {
      const expertise = getCrewExpertise(r.crewId);
      return expertise?.consoleName ? expertise.consoleName.replace(' Console', '') : r.crewId;
    }).join(', ');

    return {
      'Created': new Date(story.created_at).toISOString().slice(0, 10),
      'Mission ID': story.story_id,
      'Client': (story.clients as any)?.name || 'Internal',
      'Status': story.status.toUpperCase(),
      'Primary Console': primaryConsole,
      'Lead Skills': leadSkills,
      'Toolkit': leadTools.length,
      'Support': supportConsoles || 'Standard Ops',
      'Mission Title': story.story_title
    };
  }));

  console.table(displayData);
}

main().catch(console.error);