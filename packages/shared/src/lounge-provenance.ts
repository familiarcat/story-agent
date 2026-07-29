/**
 * Lounge transcript provenance — tells real deliberation apart from a canned agenda.
 *
 * The Observation Lounge has TWO producers that emit the same `ObservationDebateResult` shape:
 *   1. runMissionPipeline — real, one OpenRouter model call per officer.
 *   2. runObservationLoungeDebate — a pure function with ZERO model calls; every statement is a
 *      string literal in the source.
 *
 * Both were being written to shared RAG under the same `observation-lounge` tag, so a later mission
 * recalling "prior crew deliberation" could receive a hardcoded agenda and treat it as reasoning.
 * This module is the discriminator that closes that gap.
 */
import type { ObservationDebateResult } from './index.js';

/** Marker prefix that template transcripts carry in their consensus summary. */
export const TEMPLATE_MARKER = 'TEMPLATE AGENDA';

/** RAG tag applied to stored template transcripts so recall can exclude them by tag alone. */
export const TEMPLATE_TAG = 'template-transcript';

type ProvenanceBearing = Pick<ObservationDebateResult, 'provenance' | 'consensusSummary'>;

/**
 * True when a transcript is a canned template rather than real model deliberation.
 * Legacy records predate the `provenance` field, so fall back to the summary marker.
 */
export function isTemplateTranscript(t: ProvenanceBearing | null | undefined): boolean {
  if (!t) return false;
  if (t.provenance === 'template') return true;
  return String(t.consensusSummary ?? '').startsWith(TEMPLATE_MARKER);
}

/**
 * True when a transcript can be trusted as evidence of actual crew reasoning.
 * Deliberately STRICT: unknown/legacy provenance is NOT trusted, because the whole failure mode was
 * treating an unmarked canned agenda as reasoning. Callers that want legacy records must opt in.
 */
export function isRealDeliberation(t: ProvenanceBearing | null | undefined): boolean {
  if (!t) return false;
  return t.provenance === 'model-deliberation' && !isTemplateTranscript(t);
}

/** Filter a set of recalled transcripts down to genuine deliberation. */
export function excludeTemplates<T extends ProvenanceBearing>(transcripts: readonly T[]): T[] {
  return transcripts.filter((t) => !isTemplateTranscript(t));
}
