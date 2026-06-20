import { getSupabaseConnectivityDiagnostics, storeObservationMemory, flushObservationMemoryQueue } from '../packages/shared/src/db.js';
async function main() {
  const diag = await getSupabaseConnectivityDiagnostics();
  console.log(`[diagnostics] mode=${diag.mode} activeSource=${diag.activeSource} reachable=${diag.reachable}`);
  const storyId = `verify-cloud-rag-${Date.now()}`;
  const transcript: any = { storyRef: storyId, summary: 'Cloud RAG verify', participants: ['picard'], rounds: [], consensus: 'ok', decisions: [] };
  const rec = await storeObservationMemory({ storyId, source: 'mcp', transcript, tags: ['verify'] });
  console.log(`[store] id=${rec.id}`);
  const flush = await flushObservationMemoryQueue();
  console.log(`[flush->cloud] synced=${flush.synced} remaining=${flush.remaining}`);
  const url = process.env.SUPABASE_CLOUD_URL!, key = process.env.SUPABASE_CLOUD_KEY!;
  const resp = await fetch(`${url}/rest/v1/sa_observation_memories?story_id=eq.${storyId}&select=id,client_id,tags`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const rows: any = await resp.json();
  console.log(`[cloud read-back] HTTP ${resp.status} rows=${Array.isArray(rows)?rows.length:'n/a'}`);
  console.log(Array.isArray(rows) && rows.length>0 ? '✅ PASS: RAG memory round-tripped through CLOUD' : '❌ FAIL: '+JSON.stringify(rows).slice(0,200));
}
main().catch(e => { console.error('ERR', e.message||e); process.exit(1); });
