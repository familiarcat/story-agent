/**
 * Control-lane visibility — shows WHEN the OpenRouter CREW is driving vs when ANTHROPIC (Claude Code)
 * is orchestrating, so cost optimization is observable across the agentic system.
 *
 * Two lanes:
 *   • CREW      — work delegated to the cheap OpenRouter crew (deliberation or agent-core).
 *   • ANTHROPIC — the premium orchestrator (Claude Code) handling a prompt natively.
 *
 * The ledger is the append-only .claude/delegation-audit.jsonl already written by delegation-hook.ts.
 * It holds TWO kinds of entries, both Worf-safe (metrics only, NEVER prompt text):
 *   - kind:'decision'  — the hook's INTENT for a prompt (route delegate|native + est. savings).
 *   - kind:'crew-run'  — a CONFIRMED crew activation with ACTUAL costUSD (call recordCrewRun()).
 * Legacy entries with no `kind` are treated as decisions. This module only READS/derives; it never
 * needs a network call. Fail-open: any parse issue is skipped, never thrown into a caller.
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
/** route → lane. Delegated work runs on the crew; native work is the Anthropic orchestrator. */
export function laneForRoute(route) {
    return route === 'delegate' ? 'crew' : 'anthropic';
}
const LEDGER = '.claude/delegation-audit.jsonl';
const STATUS = '.claude/control-lane-status.json';
function ledgerPath(dir) { return `${dir}/${LEDGER}`; }
export function statusPath(dir) { return `${dir}/${STATUS}`; }
function isCrewRun(e) {
    return e.kind === 'crew-run';
}
/** Read + parse the ledger (tolerant: skips malformed lines). Returns [] if absent. */
export function readLedger(dir) {
    let raw = '';
    try {
        raw = readFileSync(ledgerPath(dir), 'utf8');
    }
    catch {
        return [];
    }
    const out = [];
    for (const line of raw.split('\n')) {
        const t = line.trim();
        if (!t)
            continue;
        try {
            out.push(JSON.parse(t));
        }
        catch { /* skip */ }
    }
    return out;
}
/** Append a CONFIRMED crew activation with its real cost. Best-effort, never throws. */
export function recordCrewRun(dir, run) {
    try {
        appendFileSync(ledgerPath(dir), JSON.stringify({ kind: 'crew-run', ...run }) + '\n');
    }
    catch { /* ignore */ }
}
/** Derive the lane summary from ledger entries. Pure. */
export function summarizeLanes(entries) {
    const s = {
        totalDecisions: 0,
        crew: { decisions: 0, actualRuns: 0, actualCostUSD: 0, estSavingsUSD: 0, estTokens: 0 },
        anthropic: { decisions: 0 },
        delegationRatePct: 0,
        cumulativeSavingsUSD: 0,
        currentLane: null,
    };
    for (const e of entries) {
        if (isCrewRun(e)) {
            s.crew.actualRuns += 1;
            s.crew.actualCostUSD += Number(e.costUSD) || 0;
            continue;
        }
        // decision entry
        const lane = laneForRoute(e.route);
        s.totalDecisions += 1;
        s.currentLane = lane;
        if (lane === 'crew') {
            s.crew.decisions += 1;
            s.crew.estSavingsUSD += Number(e.savingsUSD) || 0;
            s.crew.estTokens += Number(e.tokens) || 0;
        }
        else {
            s.anthropic.decisions += 1;
        }
    }
    s.cumulativeSavingsUSD = Number(s.crew.estSavingsUSD.toFixed(6));
    s.crew.actualCostUSD = Number(s.crew.actualCostUSD.toFixed(6));
    s.delegationRatePct = s.totalDecisions ? Math.round((s.crew.decisions / s.totalDecisions) * 100) : 0;
    return s;
}
/** The single always-on headline. */
export function laneBanner(s) {
    const save = s.cumulativeSavingsUSD.toFixed(4);
    const actual = s.crew.actualCostUSD.toFixed(4);
    const cur = s.currentLane === 'crew' ? '🖖 CREW' : s.currentLane === 'anthropic' ? '🅰️ ANTHROPIC' : '—';
    return `Control lane: ${cur} · CREW ${s.crew.decisions} delegated (~$${save} saved, ${s.crew.actualRuns} runs $${actual}) `
        + `| ANTHROPIC ${s.anthropic.decisions} native · ${s.delegationRatePct}% delegated`;
}
export function buildStatusMarker(s, updatedAt) {
    return {
        updatedAt,
        currentLane: s.currentLane,
        delegationRatePct: s.delegationRatePct,
        cumulativeSavingsUSD: s.cumulativeSavingsUSD,
        crewActualCostUSD: s.crew.actualCostUSD,
        crewDecisions: s.crew.decisions,
        anthropicDecisions: s.anthropic.decisions,
        crewActualRuns: s.crew.actualRuns,
        headline: laneBanner(s),
    };
}
/** Write the status marker. Best-effort, never throws. `updatedAt` is injected (no Date in libs). */
export function writeStatusMarker(dir, s, updatedAt) {
    try {
        writeFileSync(statusPath(dir), JSON.stringify(buildStatusMarker(s, updatedAt), null, 2) + '\n');
    }
    catch { /* ignore */ }
}
