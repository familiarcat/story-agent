import 'dotenv/config';
import { resolveAhaCredentials } from '@story-agent/shared/aha-credentials';
(async () => {
  const ref = process.argv[2];
  if (!ref) { console.log('usage: aha-delete <ref>'); process.exit(1); }
  const { domain, apiKey } = await resolveAhaCredentials();
  const resp = await fetch(`https://${domain}/api/v1/features/${ref}`, { method: 'DELETE', headers: { Authorization: `Bearer ${apiKey}` } });
  console.log(`DELETE features/${ref} → HTTP ${resp.status}`);
  process.exit(resp.ok ? 0 : 1);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
