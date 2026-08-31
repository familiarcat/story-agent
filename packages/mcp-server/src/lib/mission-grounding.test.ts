import { describe, expect, it } from 'vitest';
import { validateMissionGrounding } from './mission-grounding.js';

describe('validateMissionGrounding', () => {
  it('accepts references that exist in the workspace', () => {
    expect(validateMissionGrounding('Inspect `packages/shared/package.json`', process.cwd())).toEqual({
      verified: true,
      unknownPaths: [],
    });
  });

  it('flags model-invented source paths', () => {
    expect(validateMissionGrounding('Add a gate in `core/src/deps.ts`', process.cwd())).toEqual({
      verified: false,
      unknownPaths: ['core/src/deps.ts'],
    });
  });
});