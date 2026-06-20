import 'dotenv/config';
import { getDbClient } from '@story-agent/shared/db';

/**
 * Updates the sa_tool_registry with LCARS UI metadata for specific tools.
 */
async function updateToolUiMetadata() {
  console.log('🖖 [BRIDGE] Updating LCARS UI Metadata for registered tools...');

  const db = await getDbClient();

  const updates = [
    // Universal Crew Tools
    { name: 'crew:get-personal-profile', uiMetadata: { icon: 'user', color: 'gold', component: 'CrewProfile' } },
    { name: 'crew:get-console-status', uiMetadata: { icon: 'monitor', color: 'gold', component: 'ConsoleStatus' } },
    { name: 'crew:assume-station', uiMetadata: { icon: 'power', color: 'gold', component: 'StationToggle' } },
    { name: 'crew:get-station-briefing', uiMetadata: { icon: 'file-text', color: 'gold', component: 'StationBriefing' } },
    { name: 'crew:get-campaign-summary', uiMetadata: { icon: 'layers', color: 'gold', component: 'CampaignSummary' } },
    { name: 'crew:request-station-support', uiMetadata: { icon: 'help-circle', color: 'gold', component: 'SupportRequest' } },
    { name: 'crew:request-tool-access', uiMetadata: { icon: 'key', color: 'gold', component: 'ToolAccess' } },
    { name: 'crew:list-clients', uiMetadata: { icon: 'users', color: 'gold', component: 'ClientList' } },
    { name: 'crew:list-active-projects', uiMetadata: { icon: 'folder', color: 'gold', component: 'ProjectList' } },
    { name: 'crew:list-epics', uiMetadata: { icon: 'bookmark', color: 'gold', component: 'EpicList' } },
    { name: 'crew:list-active-sprints', uiMetadata: { icon: 'clock', color: 'gold', component: 'SprintList' } },
    { name: 'crew:query-stories', uiMetadata: { icon: 'search', color: 'gold', component: 'StoryQuery' } },
    { name: 'crew:get-relevant-memories', uiMetadata: { icon: 'database', color: 'gold', component: 'MemoryRecall' } },
    { name: 'crew:store-learning', uiMetadata: { icon: 'save', color: 'gold', component: 'MemoryPersistence' } },

    // Domain Specific Tools
    { name: 'picard:assess-readiness', uiMetadata: { icon: 'activity', color: 'red', component: 'ReadinessGauges' } },
    { name: 'data:review-architecture', uiMetadata: { icon: 'cpu', color: 'gold', component: 'ArchitectureReview' } },
    { name: 'data:analyze-type-safety', uiMetadata: { icon: 'check-square', color: 'gold', component: 'TypeSafetyAnalysis' } },
    { name: 'riker:plan-execution', uiMetadata: { icon: 'play', color: 'red', component: 'ExecutionPlan' } },
    { name: 'geordi:scaffold-vscode-tool', uiMetadata: { icon: 'box', color: 'gold', component: 'ScaffoldingConsole' } },
    { name: 'obrien:integrate-mcp-transport', uiMetadata: { icon: 'share-2', color: 'gold', component: 'TransportConfig' } },
    { name: 'geordi:assess-infrastructure', uiMetadata: { icon: 'settings', color: 'gold', component: 'InfrastructureGauge' } },
    { name: 'obrien:plan-deployment', uiMetadata: { icon: 'upload', color: 'gold', component: 'DeploymentPlanner' } },
    { name: 'obrien:audit-workspace', uiMetadata: { icon: 'briefcase', color: 'gold', component: 'WorkspaceHealth' } },
    { name: 'geordi:verify-build-references', uiMetadata: { icon: 'link', color: 'gold', component: 'BuildLinkAudit' } },
    { name: 'obrien:sync-dependencies', uiMetadata: { icon: 'refresh-cw', color: 'gold', component: 'DependencySync' } },
    { name: 'worf:security-audit', uiMetadata: { icon: 'shield', color: 'red', component: 'SecurityAuditWidget' } },
    { name: 'yar:assess-test-coverage', uiMetadata: { icon: 'bar-chart', color: 'red', component: 'CoverageStats' } },
    { name: 'troi:assess-stakeholder-impact', uiMetadata: { icon: 'heart', color: 'blue', component: 'EmpathyRead' } },
    { name: 'crusher:diagnose-system-health', uiMetadata: { icon: 'thermometer', color: 'blue', component: 'SystemVitals' } },
    { name: 'uhura:draft-communication', uiMetadata: { icon: 'message-square', color: 'red', component: 'CommsDraft' } },
    { name: 'quark:analyze-costs', uiMetadata: { icon: 'dollar-sign', color: 'purple', component: 'CostAnalysis' } },
    { name: 'quark:audit-tool-costs', uiMetadata: { icon: 'pie-chart', color: 'purple', component: 'BudgetAudit' } },
    { name: 'troi:analyze-ux-alignment', uiMetadata: { icon: 'eye', color: 'blue', component: 'UXAudit' } },
    { name: 'yar:audit-scaffolding', uiMetadata: { icon: 'clipboard', color: 'red', component: 'QAAudit' } },
    { name: 'worf:veto-scaffolding', uiMetadata: { icon: 'slash', color: 'red', component: 'SecurityVeto' } },
  ];

  for (const update of updates) {
    const { error } = await db
      .from('sa_tool_registry')
      .update({ ui_metadata: update.uiMetadata })
      .eq('name', update.name);

    if (error) {
      console.error(`❌ [BRIDGE] Failed to update ${update.name}:`, error.message);
    } else {
      console.log(`✅ [BRIDGE] Updated metadata for ${update.name}.`);
    }
  }

  console.log('🖖 [BRIDGE] LCARS UI synchronization complete.');
}

updateToolUiMetadata().catch(console.error);