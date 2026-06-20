import 'dotenv/config';
import { getDbClient } from '@story-agent/shared/db';
import type { ToolRecord } from '@story-agent/shared/crew-db';

/**
 * Verification script to check the sa_tool_registry table for
 * correctly populated uiMetadata, especially the 'color' property.
 */
async function verifyToolUiMetadata() {
  console.log('🔍 [BRIDGE] Auditing sa_tool_registry for LCARS UI metadata...');

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_tool_registry')
    .select('name, ui_metadata')
    .order('name', { ascending: true });

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('📭 [BRIDGE] No tools found in the registry. Ensure tools have been evaluated and approved.');
    return;
  }

  const validColors = ['gold', 'blue', 'red', 'purple'];
  const displayData = data.map((tool) => {
    const uiMetadata = (tool.ui_metadata as ToolRecord['uiMetadata']);
    const color = uiMetadata?.color?.toLowerCase() || '';
    return {
      'Tool Name': tool.name,
      'Icon': uiMetadata?.icon || 'N/A',
      'LCARS Color': color || '⚠️ MISSING',
      'Component': uiMetadata?.component || 'N/A',
      'Color Valid': validColors.includes(color) ? '✅' : '❌'
    };
  });

  console.log(`✅ [BRIDGE] Found ${data.length} tools. UI metadata audit complete:`);
  console.table(displayData);
}

verifyToolUiMetadata().catch(console.error);