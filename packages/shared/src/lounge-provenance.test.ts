import { describe, it, expect } from 'vitest';
import {
  isTemplateTranscript,
  isRealDeliberation,
  excludeTemplates,
  TEMPLATE_MARKER,
} from './lounge-provenance.js';

const real = { provenance: 'model-deliberation' as const, consensusSummary: 'Crew split 5-4 on the triad; Picard resolved to pipeline rounds.' };
const template = { provenance: 'template' as const, consensusSummary: `${TEMPLATE_MARKER} (no model deliberation performed): checklist.` };
const legacyTemplate = { consensusSummary: `${TEMPLATE_MARKER} (no model deliberation performed): checklist.` };
const legacyUnknown = { consensusSummary: 'Mission PROD-11 ready for execution. All crew members confirm readiness.' };

describe('isTemplateTranscript', () => {
  it('detects an explicitly tagged template', () => {
    expect(isTemplateTranscript(template)).toBe(true);
  });

  it('detects a legacy template by its summary marker when provenance is absent', () => {
    expect(isTemplateTranscript(legacyTemplate)).toBe(true);
  });

  it('does not flag real deliberation', () => {
    expect(isTemplateTranscript(real)).toBe(false);
  });

  it('is null-safe', () => {
    expect(isTemplateTranscript(null)).toBe(false);
    expect(isTemplateTranscript(undefined)).toBe(false);
  });
});

describe('isRealDeliberation', () => {
  it('trusts only explicit model-deliberation provenance', () => {
    expect(isRealDeliberation(real)).toBe(true);
    expect(isRealDeliberation(template)).toBe(false);
  });

  // The whole failure mode was treating an UNMARKED canned agenda as reasoning, so unknown
  // provenance must not be trusted by default.
  it('does NOT trust legacy records of unknown provenance', () => {
    expect(isRealDeliberation(legacyUnknown)).toBe(false);
  });
});

describe('excludeTemplates', () => {
  it('strips templates and legacy templates, keeping real deliberation', () => {
    const kept = excludeTemplates([real, template, legacyTemplate, legacyUnknown]);
    expect(kept).toEqual([real, legacyUnknown]);
  });

  it('returns an empty array when everything is a template', () => {
    expect(excludeTemplates([template, legacyTemplate])).toEqual([]);
  });
});
