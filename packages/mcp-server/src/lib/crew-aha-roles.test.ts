import { describe, it, expect } from 'vitest';
import { getGitLifecycleOwnership, assignStoryBranch, GIT_LIFECYCLE_OWNER, buildGitLifecyclePromptSection } from './crew-aha-roles.js';

describe('git branch/PR lifecycle ownership (Riker)', () => {
  it('Riker owns the lifecycle, with a backup and a delegated merge gate', () => {
    const o = getGitLifecycleOwnership();
    expect(GIT_LIFECYCLE_OWNER).toBe('riker');
    expect(o.fullName).toContain('Riker');
    expect(o.backupCrewId).toBe('geordi');
    expect(o.delegatesTo['merge gate']).toContain('worf');
  });

  it('assignStoryBranch produces the canonical branch + create command, owned by Riker', () => {
    const a = assignStoryBranch({ ref: 'PROD-17', name: 'Add login flow', kind: 'story' });
    expect(a.owner).toBe('riker');
    expect(a.branch).toBe('story/PROD-17-add-login-flow');
    expect(a.createCommand).toContain('git checkout -b story/PROD-17-add-login-flow');
  });

  it('prompt section gives Riker the owner charter and others the routing note', () => {
    expect(buildGitLifecyclePromptSection('riker')).toContain('you own this');
    const other = buildGitLifecyclePromptSection('data');
    expect(other).toContain('owned by');
    expect(other).toContain('Worf still gates the merge');
  });
});
