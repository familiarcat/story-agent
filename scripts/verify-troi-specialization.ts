import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Verification script to ensure Counselor Troi's skill manifest 
 * in the database includes the 'vscode:webview' specialization.
 */
async function verifyTroiSpecialization() {
  console.log('🔍 [BRIDGE] Auditing Counselor Troi\'s skill manifest...');

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_crew_skills')
    .select('domain_system_prompt, self_improvement_notes')
    .eq('crew_id', 'troi')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  const prompt = data.domain_system_prompt || '';
  const notes = (data.self_improvement_notes as string[]) || [];
  
  const hasInPrompt = prompt.includes('vscode:webview');
  const hasInNotes = notes.some(n => n.includes('vscode:webview'));

  console.log(`Crew Member: Counselor Troi`);
  console.log(`Specialization in Domain Prompt: ${hasInPrompt ? '✅ YES' : '❌ NO'}`);
  console.log(`Specialization in Improvement Notes: ${hasInNotes ? '✅ YES' : '❌ NO'}`);
  
  console.log((hasInPrompt || hasInNotes) ? "✅ [BRIDGE] Signal Verified: Troi's manifest is optimized for VS Code Webview design." : "❌ [BRIDGE] Signal Misrouted: Troi's manifest is missing Webview specializations.");
}

verifyTroiSpecialization().catch(console.error);