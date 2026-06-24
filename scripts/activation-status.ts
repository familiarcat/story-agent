/**
 * Activation status — what's set, what's missing, and exactly how to set it.
 *
 * Presence-only via the WorfGate broker (never prints a secret value). Secret VALUES are
 * user-provided by design (WorfGate principle: secrets in ~/.alexai-secrets / ~/.zshrc, never in
 * the repo, never invented or scanned). This automates the CHECK + the instructions, and derives
 * the non-secret deploy config (ECR registry, region) so the only manual work is pasting keys.
 *
 * Usage: npx tsx scripts/activation-status.ts
 */
import 'dotenv/config';
import { execSync } from 'child_process';
import { worfGateHasCredential } from '../packages/shared/src/worfgate-credentials.js';
import { embeddingSource } from '../packages/shared/src/embedding.js';

const ok = (b: boolean) => (b ? '✅' : '❌');
function tryExec(cmd: string): string | null {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
}

console.log('\n=== Story Agent — activation status (WorfGate presence-only) ===\n');

// 1. Capabilities already powered by env (~/.zshrc / ~/.alexai-secrets)
const env = [
  ['CREW_LLM_APPROVED_KEY', 'OpenRouter — the crew LLM (required)'],
  ['AHA_API_KEY', 'Aha! PM writes'],
  ['SUPABASE_ACCESS_TOKEN', 'Supabase CLI / Management API migrations'],
  ['AWS_ACCESS_KEY_ID', 'AWS deploy (bootstrap + WorfGate-brokered terraform)'],
];
console.log('Environment credentials (WorfGate broker):');
for (const [name, what] of env) console.log(`  ${ok(worfGateHasCredential(name))} ${name} — ${what}`);

// 2. RAG embeddings — the one that sharpens self-learning
const embOn = embeddingSource() === 'api';
console.log(`\nRAG embeddings: ${ok(embOn)} ${embOn ? 'real model active' : 'hash fallback (recall is weak)'}`);
if (!embOn) {
  console.log('  → Get a key at https://platform.openai.com/api-keys, then add to ~/.alexai-secrets:');
  console.log('      export EMBEDDING_API_KEY=sk-...        # cheapest: text-embedding-3-small (~$0.02/1M)');
  console.log('    (or set OPENAI_API_KEY). No DB change — recall upgrades automatically.');
}

// 3. CI/CD deploy repo variables (GitHub) — derive the non-secret ones
console.log('\nGitHub deploy repo variables (CI):');
const ghVars = tryExec('gh variable list --repo familiarcat/story-agent 2>/dev/null') || '';
const has = (k: string) => ghVars.includes(k);
const acct = tryExec('aws sts get-caller-identity --query Account --output text');
const ecr = acct ? `${acct}.dkr.ecr.us-east-2.amazonaws.com` : '<account>.dkr.ecr.us-east-2.amazonaws.com';
console.log(`  ${ok(has('AWS_REGION'))} AWS_REGION        ${has('AWS_REGION') ? '' : '→ gh variable set AWS_REGION --body us-east-2'}`);
console.log(`  ${ok(has('ECR_REGISTRY'))} ECR_REGISTRY      ${has('ECR_REGISTRY') ? '' : `→ gh variable set ECR_REGISTRY --body ${ecr}`}`);
console.log(`  ${ok(has('AWS_DEPLOY_ROLE_ARN'))} AWS_DEPLOY_ROLE_ARN  ${has('AWS_DEPLOY_ROLE_ARN') ? '' : '→ run `pnpm deploy:bootstrap-oidc` first, then gh variable set AWS_DEPLOY_ROLE_ARN --body <printed ARN>'}`);

console.log('\nNext: (1) set EMBEDDING_API_KEY to sharpen RAG; (2) pnpm deploy:bootstrap-oidc → set the 3 repo vars → dispatch deploy apply=true.\n');
process.exit(0);
