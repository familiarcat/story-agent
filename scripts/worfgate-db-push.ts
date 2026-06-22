/**
 * WorfGate-integrated cloud migration runner.
 *
 * Applies pending migrations in supabase/migrations/ to the cloud project via the Supabase
 * Management API, resolving SUPABASE_ACCESS_TOKEN THROUGH the WorfGate Credential Broker
 * (governed by crew identity, audited, value never logged). No DB password or CLI required.
 *
 * Usage: npx tsx scripts/worfgate-db-push.ts --dry-run   # preview: brokers token + lists SQL, applies NOTHING
 *        npx tsx scripts/worfgate-db-push.ts             # apply all migrations in supabase/migrations/
 *        npx tsx scripts/worfgate-db-push.ts <file.sql>  # apply one
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { resolveWorfGateCredentialAsync } from '../packages/shared/src/worfgate-credentials.js';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'sqachwmzyuuyyyxekdxp';
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function runSql(token: string, sql: string): Promise<{ ok: boolean; status: number; body: string }> {
  const r = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const body = await r.text();
  return { ok: r.ok, status: r.status, body: body.slice(0, 400) };
}

async function main() {
  // WorfGate brokers the access token — governed, audited, never logged.
  const cred = await resolveWorfGateCredentialAsync('SUPABASE_ACCESS_TOKEN', { operation: 'supabase:migrate', crewId: 'worf' });
  if (!cred.authorized) { console.error(`WorfGate refused: ${cred.reason}`); process.exit(3); }
  if (!cred.available || !cred.value) { console.error(`WorfGate: SUPABASE_ACCESS_TOKEN unavailable — ${cred.reason}`); process.exit(2); }
  console.log(`🛡️  WorfGate brokered SUPABASE_ACCESS_TOKEN (source=${cred.source}) for worf · project ${PROJECT_REF}`);

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const only = args.find(a => a.endsWith('.sql'));
  const dir = path.resolve('supabase/migrations');
  const files = (only ? [only] : fs.readdirSync(dir).filter(f => f.endsWith('.sql'))).sort();
  if (!files.length) { console.log('No migrations to apply.'); process.exit(0); }

  if (dryRun) {
    console.log(`\n[DRY RUN] Would apply ${files.length} migration(s) to ${PROJECT_REF} — nothing sent:\n`);
    for (const f of files) {
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      console.log(`── ${f} ──\n${sql.trim()}\n`);
    }
    process.exit(0);
  }

  let failed = 0;
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    const res = await runSql(cred.value, sql);
    console.log(`${res.ok ? '✅' : '❌'} ${f} [${res.status}]${res.ok ? '' : ' ' + res.body}`);
    if (!res.ok) failed++;
  }
  console.log(failed ? `\n${failed} migration(s) failed.` : `\nApplied ${files.length} migration(s).`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('❌', e?.message || e); process.exit(1); });
