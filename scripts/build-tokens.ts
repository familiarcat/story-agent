/**
 * Token → CSS generator. Closes the repo→code half of the bidirectional Figma loop:
 *
 *   Figma → (figma-to-client-theme / Tokens Studio) → design/tokens/lcars.tokens.json → THIS → globals.css
 *
 * DYNAMIC over themes: every top-level key in the token file that has a `color` group becomes a theme
 * and gets its own generated `:root[...]` block in packages/ui/src/app/globals.css, between per-theme
 * `@tokens:<theme>:start/end` markers (auto-created if missing). So adding a client brand set (e.g.
 * `jonah`, `bayer`) auto-enrolls it — no edits here. Everything outside the markers is left untouched.
 *
 *   pnpm tokens:build   → regenerate globals.css from the token file
 *   pnpm tokens:check   → fail (exit 1) if globals.css is out of sync (CI drift guard)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TOKENS = resolve(ROOT, 'design/tokens/lcars.tokens.json');
const CSS = resolve(ROOT, 'packages/ui/src/app/globals.css');

/** Global themes (set on <html> by the ThemeProvider) get a root-only selector; everything else is a
 * scoped brand theme (also matches a nested [data-theme] wrapper for per-page/per-client use). */
const GLOBAL_THEMES = new Set(['dark', 'light']);

function selectorFor(key: string): string {
  if (key === 'lcars') return ':root,\n:root[data-theme="lcars"] {';
  if (GLOBAL_THEMES.has(key)) return `:root[data-theme="${key}"] {`;
  return `:root[data-theme="${key}"],\n[data-theme="${key}"] {`;
}

/** token path (relative to a theme group) → CSS custom property, in emit order. Uniform across themes. */
const MAP: Array<[string, string]> = [
  ['color.bg', '--bg'], ['color.surface', '--surface'], ['color.surface-2', '--surface-2'],
  ['color.text', '--text'], ['color.text-dim', '--text-dim'], ['color.border', '--border'],
  ['color.accent1', '--accent1'], ['color.accent2', '--accent2'], ['color.accent3', '--accent3'], ['color.accent4', '--accent4'],
  ['color.danger', '--danger'], ['color.ok', '--ok'], ['color.warn', '--warn'], ['color.on-accent', '--on-accent'],
  ['radius.base', '--radius'], ['radius.elbow', '--radius-elbow'],
  ['type.family-mono', '--font'], ['case', '--uppercase'],
];

/* eslint-disable @typescript-eslint/no-explicit-any */
function get(obj: any, path: string): any { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function fontValue(v: string[]): string { return v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', '); }

/** Discover themes: every top-level key with a `color` group. lcars first, then file order. */
function themeKeys(root: any): string[] {
  const all = Object.keys(root).filter((k) => root[k] && typeof root[k] === 'object' && root[k].color);
  return ['lcars', ...all.filter((k) => k !== 'lcars')];
}

function generateBlock(key: string, group: any): string {
  const lines: string[] = [];
  for (const [path, cssVar] of MAP) {
    const node = get(group, path);
    if (!node || node.$value === undefined) throw new Error(`token missing: ${key}.${path}`);
    const value = Array.isArray(node.$value) ? fontValue(node.$value) : String(node.$value);
    lines.push(`  ${cssVar}: ${value};`);
  }
  return [
    `/* @tokens:${key}:start — GENERATED from design/tokens/lcars.tokens.json by \`pnpm tokens:build\`. Do not edit between markers. */`,
    selectorFor(key), ...lines, '}', `/* @tokens:${key}:end */`,
  ].join('\n');
}

/** Ensure a marker block exists for every theme; append missing ones after the last theme block. */
function ensureMarkers(css: string, keys: string[]): string {
  for (const key of keys) {
    if (css.includes(`@tokens:${key}:start`)) continue;
    const block = `\n/* @tokens:${key}:start */\n${selectorFor(key)}\n}\n/* @tokens:${key}:end */\n`;
    const lastEnd = css.lastIndexOf(':end */');
    if (lastEnd === -1) { css += block; continue; }
    const nl = css.indexOf('\n', lastEnd);
    css = nl === -1 ? css + block : css.slice(0, nl + 1) + block + css.slice(nl + 1);
  }
  return css;
}

function render(): string {
  const root = JSON.parse(readFileSync(TOKENS, 'utf8'));
  const keys = themeKeys(root);
  let css = ensureMarkers(readFileSync(CSS, 'utf8'), keys);
  for (const key of keys) {
    const START = `/* @tokens:${key}:start`;
    const END = `@tokens:${key}:end */`;
    const s = css.indexOf(START), e = css.indexOf(END);
    if (s === -1 || e === -1) throw new Error(`markers missing for '${key}' after ensureMarkers`);
    css = css.slice(0, s) + generateBlock(key, root[key]) + css.slice(e + END.length);
  }
  return css;
}

const check = process.argv.includes('--check');
const next = render();
const current = readFileSync(CSS, 'utf8');

if (check) {
  if (next !== current) { console.error('✗ globals.css OUT OF SYNC with lcars.tokens.json — run `pnpm tokens:build`.'); process.exit(1); }
  console.log('✓ tokens in sync (all themes)');
} else if (next !== current) {
  writeFileSync(CSS, next);
  console.log('✓ globals.css regenerated from lcars.tokens.json (all themes)');
} else {
  console.log('✓ globals.css already up to date');
}
