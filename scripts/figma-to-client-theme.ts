/**
 * figma-to-client-theme — per-client Figma → brand theme (Model A: one firm FIGMA_API_KEY, iterate
 * file keys). For each client mapped in design/clients-figma.json with a fileKey, read the Figma file's
 * published COLOR STYLES, map them to the LCARS token contract, and write that client's [data-theme]
 * token set into design/tokens/lcars.tokens.json — then `pnpm tokens:build` regenerates globals.css
 * (build-tokens is dynamic, so a new client theme auto-enrolls). The client's /clients/<id> presence
 * then re-themes with zero code edits.
 *
 *   pnpm figma:themes                 # rotate ALL mapped clients (with a fileKey)
 *   pnpm figma:themes -- --client jonah   # one client
 *   pnpm figma:themes -- --dry-run        # report mapping + coverage, write nothing
 *
 * Auth: FIGMA_API_KEY (read-only) resolved THROUGH WorfGate (op figma:read). The Figma file's color
 * styles should be NAMED to the contract: bg, surface, surface-2, text, text-dim, border, accent1..4,
 * danger, ok, warn, on-accent. Unmatched roles fall back to the client's existing value, else lcars.
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { resolveWorfGateCredential } from '../packages/shared/dist/src/worfgate-credentials.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = resolve(ROOT, 'design/tokens/lcars.tokens.json');
const MAP_FILE = resolve(ROOT, 'design/clients-figma.json');

const ROLES = ['bg', 'surface', 'surface-2', 'text', 'text-dim', 'border', 'accent1', 'accent2', 'accent3', 'accent4', 'danger', 'ok', 'warn', 'on-accent'];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const ROLES_BY_LEN = [...ROLES].sort((a, b) => norm(b).length - norm(a).length); // match specific first (surface-2 before surface)

function matchRole(styleName: string): string | null {
  const n = norm(styleName);
  for (const r of ROLES_BY_LEN) { const rn = norm(r); if (n === rn || n.endsWith(rn) || n.includes(rn)) return r; }
  return null;
}
function rgbToHex(c: { r: number; g: number; b: number }): string {
  const h = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

async function fetchFigmaPalette(fileKey: string, token: string): Promise<Record<string, string>> {
  const H = { headers: { 'X-Figma-Token': token } };
  const styles: any = await fetch(`https://api.figma.com/v1/files/${fileKey}/styles`, H).then((r) => r.json());
  const fills = (styles?.meta?.styles ?? []).filter((s: any) => s.style_type === 'FILL');
  if (!fills.length) return {};
  const ids = fills.map((s: any) => s.node_id).join(',');
  const nodes: any = await fetch(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}`, H).then((r) => r.json());
  const out: Record<string, string> = {};
  for (const s of fills) {
    const role = matchRole(s.name); if (!role) continue;
    const fill = (nodes?.nodes?.[s.node_id]?.document?.fills ?? []).find((f: any) => f.type === 'SOLID' && f.color);
    if (fill) out[role] = rgbToHex(fill.color);
  }
  return out;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function buildClientTheme(existing: any, palette: Record<string, string>, lcars: any): any {
  const color: any = {};
  for (const role of ROLES) {
    const hex = palette[role] ?? existing?.color?.[role]?.$value ?? lcars.color[role].$value;
    color[role] = { $type: 'color', $value: hex };
  }
  return {
    color,
    radius: existing?.radius ?? { base: { $type: 'dimension', $value: '8px' }, elbow: { $type: 'dimension', $value: '8px' } },
    type: existing?.type ?? { 'family-mono': { $type: 'fontFamily', $value: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] } },
    case: existing?.case ?? { $value: 'none' },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const only = args.includes('--client') ? args[args.indexOf('--client') + 1] : undefined;

  const map = JSON.parse(readFileSync(MAP_FILE, 'utf8'));
  const entries = Object.entries<any>(map.clients ?? {}).filter(([id, c]) => c?.fileKey && (!only || id === only));
  if (!entries.length) {
    console.log(only ? `No fileKey for client '${only}' in design/clients-figma.json.` : 'No clients have a fileKey yet — add one in design/clients-figma.json.');
    return;
  }

  const cred = resolveWorfGateCredential('FIGMA_API_KEY', { operation: 'figma:read', crewId: 'geordi' });
  if (!cred.authorized) { console.error(`WorfGate refused: ${cred.reason}`); process.exit(3); }
  if (!cred.available || !cred.value) { console.error(`FIGMA_API_KEY unavailable — add it (read-only) to ~/.alexai-secrets, then reconnect. ${cred.reason}`); process.exit(2); }
  console.log(`🛡️  WorfGate brokered FIGMA_API_KEY (figma:read) — rotating ${entries.length} client(s)${dryRun ? ' [DRY RUN]' : ''}`);

  const tokens = JSON.parse(readFileSync(TOKENS, 'utf8'));
  let changed = 0;
  for (const [id, c] of entries) {
    try {
      const palette = await fetchFigmaPalette(c.fileKey, cred.value);
      const found = Object.keys(palette);
      console.log(`  ${id}: ${found.length}/${ROLES.length} roles matched from Figma styles${found.length ? ` (${found.join(', ')})` : ' — check style names match the contract'}`);
      if (dryRun) continue;
      tokens[id] = buildClientTheme(tokens[id], palette, tokens.lcars);
      changed++;
    } catch (e: any) {
      console.error(`  ${id}: ERROR ${e?.message || e}`);
    }
  }

  if (dryRun) { console.log('\n[DRY RUN] no token file written.'); return; }
  if (changed) {
    writeFileSync(TOKENS, JSON.stringify(tokens, null, 2) + '\n');
    execSync('npx tsx scripts/build-tokens.ts', { cwd: ROOT, stdio: 'inherit' });
    console.log(`✓ wrote ${changed} client theme(s) + regenerated globals.css. Each /clients/<id> now re-themes from Figma.`);
  }
}

main().catch((e) => { console.error('❌', e?.message || e); process.exit(1); });
