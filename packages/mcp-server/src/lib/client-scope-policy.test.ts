import { describe, expect, it } from 'vitest';
import {
  buildClientAccessContext,
  evaluateControlledDataAccess,
  inferClientIdFromStory,
  redactControlledStoryFields,
  type StoryRecord,
} from '@story-agent/shared';

const sampleStory: StoryRecord = {
  id: '1',
  storyId: 'STORY-100',
  storyTitle: 'Controlled data hydration',
  storyUrl: 'https://aha.io/features/STORY-100',
  repoFullName: 'bayer-int/story-agent',
  branch: 'STORY-100',
  baseBranch: 'main',
  status: 'implementing',
  prNumber: 12,
  prUrl: 'https://github.com/familiarcat/story-agent/pull/12',
  prStatus: 'open',
  phase: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notes: 'contains regulated references',
  clientId: 'bayer-int',
};

describe('client scope controlled-data policy', () => {
  it('prevents controlled data leakage when no client is selected', () => {
    const context = buildClientAccessContext({
      includeControlled: true,
      clientRole: 'client_delivery',
      purpose: 'ui_story_detail',
      selectedClientId: null,
    });

    const decision = evaluateControlledDataAccess({
      context,
      requestedClientId: inferClientIdFromStory(sampleStory),
    });

    const redacted = redactControlledStoryFields(sampleStory);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('missing_client_selection');
    expect(redacted.storyUrl).toBe('');
    expect(redacted.prUrl).toBeNull();
    expect(redacted.notes).toBeNull();
  });

  it('downgrades to advisory mode when role is insufficient', () => {
    const context = buildClientAccessContext({
      includeControlled: true,
      selectedClientId: 'bayer-int',
      clientRole: 'viewer',
      purpose: 'ui_story_detail',
    });

    const decision = evaluateControlledDataAccess({
      context,
      requestedClientId: 'bayer-int',
    });

    expect(decision.allowed).toBe(false);
    expect(decision.mode).toBe('advisory_downgrade');
    expect(decision.reason).toBe('insufficient_role');
  });

  it('emits audit trail metadata for approved access', () => {
    const context = buildClientAccessContext({
      includeControlled: true,
      selectedClientId: 'bayer-int',
      clientRole: 'client_delivery',
      purpose: 'ui_story_detail',
    });

    const decision = evaluateControlledDataAccess({
      context,
      requestedClientId: 'bayer-int',
    });

    expect(decision.allowed).toBe(true);
    expect(decision.audit.outcome).toBe('approved');
    expect(decision.audit.reason).toBe('approved');
    expect(decision.audit.selectedClientId).toBe('bayer-int');
    expect(decision.audit.requestedClientId).toBe('bayer-int');
    expect(typeof decision.audit.timestamp).toBe('string');
  });
});
