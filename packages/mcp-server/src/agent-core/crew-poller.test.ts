import { decideLane } from './crew-poller.js';

describe('decideLane', () => {
  it('returns shell for no change', () => {
    expect(decideLane(false, false)).toBe('shell');
    expect(decideLane(false, true)).toBe('shell');
  });

  it('returns crew for change without synthesis', () => {
    expect(decideLane(true, false)).toBe('crew');
  });

  it('returns claude for change with synthesis', () => {
    expect(decideLane(true, true)).toBe('claude');
  });
});