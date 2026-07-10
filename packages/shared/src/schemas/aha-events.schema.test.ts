/**
 * WGIM (WorfGate Integrity Matrix) validation suite — crew phased plan Phase 1, WorfGate team.
 * Validates the Aha event schema contract's guarantees: enum enforcement, meta key governance,
 * exhaustive error collection, and MAJOR-version compatibility. Worf owns schema-drift enforcement:
 * if it has not been validated, it does not pass.
 */
import { describe, expect, it } from 'vitest';
import {
  AHA_ACTORS,
  AHA_EVENTS_SCHEMA_VERSION,
  AHA_META_KEYS,
  AHA_OPERATIONS,
  AHA_RESOURCE_TYPES,
  isCompatibleSchemaVersion,
  validateAhaEventInput,
} from './aha-events.schema';

const validInput = {
  resourceType: 'story',
  resourceId: 'PROD-11',
  operation: 'status_changed',
  actor: 'mcp',
  meta: { status_from: 'pending', status_to: 'implementing' },
};

describe('WGIM: aha-events schema contract v1', () => {
  it('accepts a fully valid event input', () => {
    const result = validateAhaEventInput(validInput);
    expect(result).toEqual({ ok: true, version: AHA_EVENTS_SCHEMA_VERSION });
  });

  it('accepts an event without meta (meta is optional)', () => {
    const { meta: _meta, ...noMeta } = validInput;
    expect(validateAhaEventInput(noMeta).ok).toBe(true);
  });

  it('rejects non-object inputs outright', () => {
    for (const bad of [null, undefined, 42, 'story', [validInput]]) {
      const result = validateAhaEventInput(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors).toEqual(['input must be a non-null object']);
    }
  });

  it('rejects values outside the canonical enums', () => {
    const result = validateAhaEventInput({ ...validInput, resourceType: 'starship', operation: 'warped', actor: 'romulan' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(3);
      expect(result.errors.join('\n')).toContain('resourceType');
      expect(result.errors.join('\n')).toContain('operation');
      expect(result.errors.join('\n')).toContain('actor');
    }
  });

  it('rejects an empty or missing resourceId', () => {
    for (const resourceId of ['', undefined, 7]) {
      const result = validateAhaEventInput({ ...validInput, resourceId });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('resourceId');
    }
  });

  it('rejects undocumented meta keys (drift guard) and non-string meta values', () => {
    const result = validateAhaEventInput({ ...validInput, meta: { warp_factor: '9', project_id: 42 } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join('\n')).toContain('warp_factor');
      expect(result.errors.join('\n')).toContain('meta.project_id must be a string');
    }
  });

  it('collects ALL violations in one pass (no fail-fast)', () => {
    const result = validateAhaEventInput({ resourceType: 'x', operation: 'y', actor: 'z', resourceId: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(4);
  });

  it('pins the canonical enum inventory (any change here is a contract change → RFC + version bump)', () => {
    expect(AHA_RESOURCE_TYPES).toEqual(['story', 'epic', 'release', 'requirement', 'sprint', 'project']);
    expect(AHA_OPERATIONS).toEqual(['created', 'updated', 'deleted', 'status_changed', 'linked']);
    expect(AHA_ACTORS).toEqual(['dashboard', 'mcp', 'extension']);
    expect(AHA_META_KEYS).toEqual(['sprint_id', 'project_id', 'status_from', 'status_to']);
    expect(AHA_EVENTS_SCHEMA_VERSION).toBe('1.0.0');
  });

  it('accepts same-major versions and rejects other majors (vN → vN±1 gate)', () => {
    expect(isCompatibleSchemaVersion('1.0.0')).toBe(true);
    expect(isCompatibleSchemaVersion('1.4.2')).toBe(true);
    expect(isCompatibleSchemaVersion('2.0.0')).toBe(false);
    expect(isCompatibleSchemaVersion('0.9.0')).toBe(false);
    expect(isCompatibleSchemaVersion('')).toBe(false);
  });
});
