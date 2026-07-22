import { detectActionIntent } from './chat.js';
import { describe, it, expect } from 'vitest';

describe('detectActionIntent', () => {
  it('returns true for direct action requests', () => {
    expect(detectActionIntent('build and deploy these updates')).toBe(true);
    expect(detectActionIntent('apply them properly to the codebase')).toBe(true);
    expect(detectActionIntent('make it so')).toBe(true);
    expect(detectActionIntent('commit the changes')).toBe(true);
    expect(detectActionIntent('fix the bug in the code')).toBe(true);
  });

  it('returns false for questions or status requests', () => {
    expect(detectActionIntent('status report')).toBe(false);
    expect(detectActionIntent('is the story agent updating code?')).toBe(false);
    expect(detectActionIntent('what does the crew think?')).toBe(false);
    expect(detectActionIntent('can you fix the bug?')).toBe(false);
    expect(detectActionIntent('how do I build this?')).toBe(false);
  });
});