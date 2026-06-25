/**
 * WorfGate-integrated Terraform runner.
 *
 * Resolves AWS credentials THROUGH the WorfGate Credential Broker (governed by crew identity,
 * audited, never logged) and injects them into a `terraform -chdir=terraform <args>` child — so
 * the crew runs IaC with WorfGate applying the correct credentials automatically, in line with
 * its autonomy. Pass any terraform args: init, validate, plan, apply, output.
 *
 * Usage: npx tsx scripts/worfgate-terraform.ts plan
 *        npx tsx scripts/worfgate-terraform.ts init -upgrade
 */
import 'dotenv/config';
import { spawn } from 'child_process';
import { resolveWorfGateCredentialAsync } from '../packages/shared/src/worfgate-credentials.js';

const AWS_CREDS = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_SESSION_TOKEN'] as const;

async function main() {
  let args = process.argv.slice(2);
  // Optional: `--dir <path>` selects the terraform config dir (default `terraform`; use
  // `terraform/bootstrap` for the admin-only bootstrap state). Must precede terraform args.
  let dir = 'terraform';
  if (args[0] === '--dir') { dir = args[1]; args = args.slice(2); }
  if (!args.length) { console.error('Usage: worfgate-terraform.ts [--dir <path>] <init|validate|plan|apply|...>'); process.exit(2); }

  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  const brokered: string[] = [];
  for (const name of AWS_CREDS) {
    const op = name === 'AWS_REGION' ? 'aws:deploy' : 'aws:deploy';
    const r = await resolveWorfGateCredentialAsync(name, { operation: op, crewId: 'worf' });
    if (r.authorized && r.available && r.value) { env[name] = r.value; brokered.push(name); }
    else if (name !== 'AWS_SESSION_TOKEN' && name !== 'AWS_REGION') {
      console.error(`🛡️  WorfGate: ${name} unavailable — ${r.reason}`); process.exit(3);
    }
  }
  // Diagnostic → stderr, so `terraform output -raw` capture stays clean (stdout = terraform only).
  console.error(`🛡️  WorfGate brokered AWS credentials for worf: ${brokered.join(', ')}`);

  // Don't let an ambient AWS_PROFILE override the brokered static keys.
  delete env.AWS_PROFILE;

  const tf = spawn('terraform', [`-chdir=${dir}`, ...args], { stdio: 'inherit', env });
  tf.on('close', (code) => process.exit(code ?? 1));
}

main().catch((e) => { console.error('❌', e?.message || e); process.exit(1); });
