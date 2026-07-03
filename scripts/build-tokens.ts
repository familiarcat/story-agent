/**
 * Token → CSS generator. Closes the repo→code half of the bidirectional Figma loop:
 *
 *   Figma → (Tokens Studio Git sync) → design/tokens/lcars.tokens.json → THIS SCRIPT → globals.css
 *
 * The DTCG token file is the SOURCE OF TRUTH for ALL THREE themes (lcars default + dark + light).
 * This script regenerates each theme's `:root[...]` block in packages/ui/src/app/globals.css, between
 * per-theme `@tokens:<theme>:start/end` markers. Everything outside the markers is left untouched.
 *
 *   pnpm tokens:build   → regenerate globals.css from the token file
 *   pnpm tokens:check   → fail (exit 1) if globals.css is out of sync (CI drift guard)
 *
 * Crew-ruled (Observation Lounge). Frugal, no extra deps.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TOKENS = resolve(ROOT, 'design/tokens/lcars.tokens.json');
const CSS = resolve(ROOT, 'packages/ui/src/app/globals.css');

/** Themes to generate. `lcars` is the default (also matches bare :root). Order = emit order. */
const THEMES: Array<{ key: string; selector: string }> = [
  { key: 'lcars', selector: ':root,\n:root[data-theme="lcars"] {' },
  { key: 'dark', selector: ':root[data-theme="dark"] {' },
  { key: 'light', selector: ':root[data-theme="light"] {' },
  { key: 'jonah', selector: ':root[data-theme="jonah"],\n[data-theme="jonah"] {' }, // client brand theme — also scopes to a nested wrapper (per-page brand)
];

/** token path (relative to a theme group) → CSS custom property, in emit order. Uniform across themes. */
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
  ['case', '--uppercase'],
];

/* eslint-disable @typescript-eslint/no-explicit-any */
function get(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function fontValue(v: string[]): string {
  return v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');
}

function generateBlock(theme: { key: string; selector: string }, root: any): string {
  const group = root[theme.key];
  if (!group) throw new Error(`token theme missing: ${theme.key}`);
  const lines: string[] = [];
  for (const [path, cssVar] of MAP) {
    const node = get(group, path);
    if (!node || node.$value === undefined) throw new Error(`token missing: ${theme.key}.${path}`);
    const value = Array.isArray(node.$value) ? fontValue(node.$value) : String(node.$value);
    lines.push(`  ${cssVar}: ${value};`);
  }
  return [
    `/* @tokens:${theme.key}:start — GENERATED from design/tokens/lcars.tokens.json by \`pnpm tokens:build\`. Do not edit between markers. */`,
    theme.selector,
    ...lines,
    '}',
    `/* @tokens:${theme.key}:end */`,
  ].join('\n');
}

function render(): string {
  const root = JSON.parse(readFileSync(TOKENS, 'utf8'));
  let css = readFileSync(CSS, 'utf8');
  for (const theme of THEMES) {
    const START = `/* @tokens:${theme.key}:start`;
    const END = `@tokens:${theme.key}:end */`;
    const startIdx = css.indexOf(START);
    const endIdx = css.indexOf(END);
    if (startIdx === -1 || endIdx === -1) {
      throw new Error(`markers not found for theme '${theme.key}' in ${CSS} — add ${START} ... ${END} around its :root block`);
    }
    css = css.slice(0, startIdx) + generateBlock(theme, root) + css.slice(endIdx + END.length);
  }
  return css;
}

const check = process.argv.includes('--check');
const next = render();
const current = readFileSync(CSS, 'utf8');

if (check) {
  if (next !== current) {
    console.error('✗ globals.css is OUT OF SYNC with design/tokens/lcars.tokens.json. Run `pnpm tokens:build`.');
    process.exit(1);
  }
  console.log('✓ tokens in sync (globals.css matches lcars.tokens.json — lcars/dark/light)');
} else {
  if (next !== current) {
    writeFileSync(CSS, next);
    console.log('✓ globals.css regenerated from lcars.tokens.json (lcars/dark/light)');
  } else {
    console.log('✓ globals.css already up to date');
  }
}
