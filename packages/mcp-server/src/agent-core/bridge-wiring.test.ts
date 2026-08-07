/**
 * Bridge-wiring contract.
 *
 * agent-core's optional capabilities (ragRecall, crewDeliberate, recordFeedback) are injected by
 * the CALLER via buildBridges(). Nothing in the type system enforces that, because every bridge
 * field is optional on RunAgentOptions — so a new surface can call runAgentLoop, compile clean,
 * pass every unit test, and silently run with no crew memory and no crew escalation.
 *
 * That is exactly what happened: plan-then-execute.ts omitted the spread that http-server.ts had.
 * Every run reached through /chat's activation path got `(crew escalation unavailable in this
 * context)` back from crew_deliberate as a SUCCESSFUL tool result, and no stall card was ever
 * written to RAG — so the same failure recurred across sessions with nothing to recall.
 *
 * This test enforces the invariant the types cannot: if you call the loop, you wire the bridges.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AGENT_CORE_DIR = dirname(fileURLToPath(import.meta.url));

/** Files permitted to call runAgentLoop without bridges (tests, and the bridge module itself). */
const EXEMPT = new Set(['bridges.ts', 'bridge-wiring.test.ts']);

function sourceFiles(): string[] {
  return readdirSync(AGENT_CORE_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !EXEMPT.has(f))
    .map((f) => join(AGENT_CORE_DIR, f));
}

/**
 * Extract each runAgentLoop(...) options object by brace-matching from the call site, so we test
 * the actual argument rather than a fixed-size window that a long option list would outrun.
 */
function callSiteBodies(src: string): string[] {
  const bodies: string[] = [];
  let idx = src.indexOf('runAgentLoop(');
  while (idx !== -1) {
    // Skip the declaration in loop.ts — `export async function runAgentLoop(` is not a call site.
    const preceding = src.slice(Math.max(0, idx - 30), idx);
    if (/function\s+$/.test(preceding)) {
      idx = src.indexOf('runAgentLoop(', idx + 1);
      continue;
    }
    const open = src.indexOf('{', idx);
    if (open === -1) break;
    let depth = 0;
    let end = open;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    bodies.push(src.slice(open, end + 1));
    idx = src.indexOf('runAgentLoop(', end);
  }
  return bodies;
}

/**
 * Names bound to a buildBridges() result in this file, so the indirect form used by cli.ts
 *   const bridges = buildBridges(clientId);
 *   runAgentLoop(task, { ...bridges })
 * counts as wired. Only the direct spread would otherwise pass, which would flag correct code.
 */
function bridgeAliases(src: string): string[] {
  const aliases: string[] = [];
  const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*buildBridges\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) aliases.push(m[1]);
  return aliases;
}

function isWired(body: string, aliases: string[]): boolean {
  if (/\.\.\.buildBridges\s*\(/.test(body)) return true;
  return aliases.some((name) => new RegExp(`\\.\\.\\.${name}\\b`).test(body));
}

describe('bridge wiring contract', () => {
  it('every runAgentLoop call site spreads buildBridges', () => {
    const violations: string[] = [];

    for (const file of sourceFiles()) {
      const src = readFileSync(file, 'utf8');
      if (!src.includes('runAgentLoop(')) continue;

      const aliases = bridgeAliases(src);
      for (const [i, body] of callSiteBodies(src).entries()) {
        if (!isWired(body, aliases)) {
          violations.push(`${file.split('/').pop()} — runAgentLoop call #${i + 1}`);
        }
      }
    }

    expect(
      violations,
      `runAgentLoop called without ...buildBridges(clientId). These runs will have no RAG recall, ` +
        `no crew escalation, and no self-learning feedback:\n  ${violations.join('\n  ')}`,
    ).toEqual([]);
  });

  it('bridge-dependent tools fail loudly rather than returning a success string', () => {
    const src = readFileSync(join(AGENT_CORE_DIR, 'tools.ts'), 'utf8');

    // A returned string is recorded by the loop as ok:true. An unwired bridge must be a tool
    // FAILURE so turnFailed trips and the run's toolCalls audit shows it.
    expect(src).not.toMatch(/if\s*\(!ctx\.ragRecall\)\s*return/);
    expect(src).not.toMatch(/if\s*\(!ctx\.crewDeliberate\)\s*return/);
    expect(src).toContain('E_BRIDGE_UNWIRED');
  });
});
