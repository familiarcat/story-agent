import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { SEMANTIC_TOKEN_NAMES } from '../ui-tokens.js';

/**
 * Cross-surface token parity guard.
 *
 * Context (crew audit, 2026-07-30): the design system is ALREADY unified — packages/shared/ui-tokens.ts
 * is the semantic contract, scripts/build-tokens.ts generates globals.css from the Tokens Studio
 * source, and design-tokens.yml gates drift for `design/tokens/**` and the web package.
 *
 * What is NOT gated is the VS Code extension. Its webviews are hand-written HTML/CSS strings, they sit
 * outside design-tokens.yml's paths, and the extension has no test script at all — so nothing would
 * catch a hardcoded colour or a mistyped token there.
 *
 * Crucially, there is currently NO drift: the webviews use 7-8 distinct --sa-* tokens each and zero
 * hardcoded hex values. So this is a REGRESSION guard that locks in behaviour already correct by hand,
 * not a cleanup. It lives in `shared` because shared owns the token contract, and because shared's
 * suite is covered by the unit-tests CI gate while the extension's is not.
 */

// Resolve the repo root from this test file: packages/shared/src/__tests__ → ../../../..
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const WEBVIEW_SOURCES = [
  'packages/vscode-extension/src/panels/ChatPanel.ts',
  'packages/vscode-extension/src/panels/StoryExecutionPanel.ts',
  'packages/vscode-extension/src/sidebar.ts',
  'packages/vscode-extension/src/providers/AhaProjectStructureProvider.ts',
];

/** Read a webview source, or null when the file has been moved/renamed. */
function readSource(rel: string): string | null {
  const abs = path.join(REPO_ROOT, rel);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
}

const present = WEBVIEW_SOURCES.map((rel) => ({ rel, src: readSource(rel) })).filter(
  (f): f is { rel: string; src: string } => f.src !== null,
);

describe('UI token parity — VS Code webviews honour the shared semantic contract', () => {
  // If every path stopped resolving, the guard would silently pass while checking nothing — the exact
  // "absence of failure read as success" shape this repo keeps getting bitten by.
  it('actually found webview sources to check', () => {
    expect(present.length).toBeGreaterThan(0);
  });

  for (const rel of WEBVIEW_SOURCES) {
    it(`${path.basename(rel)} is still where the guard expects it`, () => {
      expect(readSource(rel), `${rel} moved — update WEBVIEW_SOURCES or this guard checks nothing`).not.toBeNull();
    });
  }

  for (const { rel, src } of present) {
    it(`${path.basename(rel)} uses no hardcoded hex colours`, () => {
      // Strip --sa-* fallbacks like var(--sa-accent, #ccc): a fallback is a deliberate default, and the
      // shared bindings themselves are the one legitimate place hex values live.
      const withoutFallbacks = src.replace(/var\(--sa-[a-zA-Z-]+\s*,\s*[^)]*\)/g, 'var(--sa-x)');
      const hex = withoutFallbacks.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      expect(hex, `hardcoded colour(s) in ${rel} — use var(--sa-*) from @story-agent/shared/ui-tokens`).toEqual([]);
    });

    it(`${path.basename(rel)} references only tokens that exist in SEMANTIC_TOKEN_NAMES`, () => {
      // A mistyped token (--sa-primry) is invisible at runtime: CSS just resolves it to nothing, so the
      // element loses its colour silently. Static checking is the only thing that catches it.
      const referenced = [...new Set((src.match(/--sa-([a-zA-Z]+)/g) ?? []).map((m) => m.replace('--sa-', '')))];
      const known = new Set<string>(SEMANTIC_TOKEN_NAMES as readonly string[]);
      const unknown = referenced.filter((t) => !known.has(t));
      expect(unknown, `unknown token(s) in ${rel}; valid names: ${[...known].join(', ')}`).toEqual([]);
    });
  }

  it('at least one webview genuinely consumes the shared tokens', () => {
    const total = present.reduce((n, f) => n + (f.src.match(/--sa-[a-zA-Z]+/g) ?? []).length, 0);
    expect(total, 'no --sa-* usage found at all — the surfaces may have been decoupled').toBeGreaterThan(0);
  });
});
