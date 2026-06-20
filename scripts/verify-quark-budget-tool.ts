import 'dotenv/config';
import { getDbClient } from '@story-agent/shared/db';
import type { ToolRecord } from '@story-agent/shared/crew-db';

/**
 * Targeted verification script to check the LCARS UI metadata 
 * for Quark's budget audit tool.
 */
async function verifyQuarkBudgetTool() {
  const toolName = 'quark:audit-tool-costs';
  console.log(`🔍 [BRIDGE] Auditing station metadata for tool: ${toolName}...`);

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_tool_registry')
    .select('name, ui_metadata')
    .eq('name', toolName)
    .single();

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  const uiMetadata = (data.ui_metadata as ToolRecord['uiMetadata']);
  
  console.log('--------------------------------------------------------');
  console.log(`Tool:      ${data.name}`);
  console.log(`Icon:      ${uiMetadata?.icon || '⚠️ MISSING'}`);
  console.log(`Color:     ${uiMetadata?.color || '⚠️ MISSING'}`);
  console.log(`Component: ${uiMetadata?.component || '⚠️ MISSING'}`);
  console.log('--------------------------------------------------------');

  const isCorrect = uiMetadata?.color === 'purple' && uiMetadata?.icon === 'pie-chart';
  
  if (isCorrect) {
    console.log('✅ [BRIDGE] Signal Verified: Quark\'s budget console is correctly energized with purple pie-chart metadata.');
  } else {
    console.log('❌ [BRIDGE] Signal Mismatch: UI metadata does not match the financial station standards.');
  }
}

verifyQuarkBudgetTool().catch(console.error);