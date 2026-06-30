/**
 * Token → CSS generator. Closes the repo→code half of the bidirectional Figma loop:
 *
 *   Figma → (Tokens Studio Git sync) → design/tokens/lcars.tokens.json → THIS SCRIPT → globals.css
 *
 * The DTCG token file is the SOURCE OF TRUTH for the LCARS theme. This script regenerates ONLY the
 * `:root[data-theme="lcars"]` block in packages/ui/src/app/globals.css, between the
 * `@tokens:lcars:start/end` markers. The `dark` + `light` themes stay hand-authored (untouched).
 *
 *   pnpm tokens:build   → regenerate globals.css from the token file
 *   pnpm tokens:check   → fail (exit 1) if globals.css is out of sync (CI drift guard)
 *
 * Crew-ruled (Observation Lounge, RAG mem: Figma git-sync loop). Frugal, no extra deps.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TOKENS = resolve(ROOT, 'design/tokens/lcars.tokens.json');
const CSS = resolve(ROOT, 'packages/ui/src/app/globals.css');

const START = '/* @tokens:lcars:start';
const END = '@tokens:lcars:end */';

/** token path (under `lcars`) → CSS custom property, in emit order. The lcars :root contract. */
const MAP: Array<[string, string]> = [
  ['color.bg', '--bg'],
  ['color.surface', '--surface'],
  ['color.surface-2', '--surface-2'],
  ['color.text', '--text'],
  ['color.text-dim', '--text-dim'],
  ['color.border', '--border'],
  ['color.accent1', '--accent1'],
  ['color.accent2', '--accent2'],
  ['color.accent3', '--accent3'],
  ['color.accent4', '--accent4'],
  ['color.danger', '--danger'],
  ['color.ok', '--ok'],
  ['color.warn', '--warn'],
  ['color.on-accent', '--on-accent'],
  ['radius.base', '--radius'],
  ['radius.elbow', '--radius-elbow'],
  ['type.family-mono', '--font'],
];
// Non-token literals that belong to the lcars theme block (not a design value Figma owns).
const STATIC_TAIL: Array<[string, string]> = [['--uppercase', 'uppercase']];

/* eslint-disable @typescript-eslint/no-explicit-any */
function get(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function fontValue(v: string[]): string {
  return v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');
}

function generateBlock(): string {
  const tokens = JSON.parse(readFileSync(TOKENS, 'utf8')).lcars;
  const lines: string[] = [];
  for (const [path, cssVar] of MAP) {
    const node = get(tokens, path);
    if (!node || node.$value === undefined) throw new Error(`token missing: lcars.${path}`);
    const value = Array.isArray(node.$value) ? fontValue(node.$value) : String(node.$value);
    lines.push(`  ${cssVar}: ${value};`);
  }
  for (const [cssVar, value] of STATIC_TAIL) lines.push(`  ${cssVar}: ${value};`);
  return [
    `${START} — GENERATED from design/tokens/lcars.tokens.json by \`pnpm tokens:build\`. Do not edit between markers. */`,
    ':root,',
    ':root[data-theme="lcars"] {',
    ...lines,
    '}',
    `/* ${END}`,
  ].join('\n');
}

function render(): string {
  const css = readFileSync(CSS, 'utf8');
  const startIdx = css.indexOf(START);
  const endIdx = css.indexOf(END);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`markers not found in ${CSS} — add ${START} ... ${END} around the lcars :root block`);
  }
  const before = css.slice(0, startIdx);
  const after = css.slice(endIdx + END.length);
  return before + generateBlock() + after;
}

const check = process.argv.includes('--check');
const next = render();
const current = readFileSync(CSS, 'utf8');

if (check) {
  if (next !== current) {
    console.error('✗ globals.css is OUT OF SYNC with design/tokens/lcars.tokens.json. Run `pnpm tokens:build`.');
    process.exit(1);
  }
  console.log('✓ tokens in sync (globals.css matches lcars.tokens.json)');
} else {
  if (next !== current) {
    writeFileSync(CSS, next);
    console.log('✓ globals.css regenerated from lcars.tokens.json');
  } else {
    console.log('✓ globals.css already up to date');
  }
}
