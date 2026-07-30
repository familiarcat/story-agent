import { describe, it, expect } from 'vitest';
import { assembleAndOptimize } from './crew-team-assembly.js';

const ids = (brief: string, tier: 1 | 2 | 3 | 4 = 3) =>
  assembleAndOptimize(brief, tier).team.map((m) => m.crewId);

/**
 * Regression: a brief that asked "Yar: what is the cheapest check that would have caught this?" ran
 * WITHOUT Yar, because Picard's distilled goals contained none of her domain keywords, so the question
 * was silently never answered. Naming an officer is the clearest statement of who is needed; keyword
 * matching is the fallback for when the operator has NOT said.
 */
describe('assembleAndOptimize — officers named in the brief are seated', () => {
  it('seats Yar when the brief addresses her, even with no quality keywords', () => {
    const brief = 'Yar: what is the single cheapest check that would have caught this earlier?';
    expect(ids(brief)).toContain('yar');
  });

  it('seats several named officers at once', () => {
    const team = ids('Worf, Quark and Troi: weigh in on the rollout posture.');
    expect(team).toContain('worf');
    expect(team).toContain('quark');
    expect(team).toContain('troi');
  });

  it('records WHY a named officer was seated', () => {
    const plan = assembleAndOptimize('Crusher: assess this.', 3);
    const crusher = plan.team.find((m) => m.crewId === 'crusher');
    expect(crusher?.reason).toMatch(/named/i);
  });

  it('still seats officers by keyword when nobody is named', () => {
    expect(ids('We need to fix a security vulnerability in the auth token flow.')).toContain('worf');
  });

  it('notes both when an officer is named AND matches by keyword', () => {
    const plan = assembleAndOptimize('Worf: review the security token handling.', 3);
    const worf = plan.team.find((m) => m.crewId === 'worf');
    expect(worf?.reason).toMatch(/matched/);
    expect(worf?.reason).toMatch(/named in brief/);
  });

  it('always seats Picard', () => {
    expect(ids('trivial request')).toContain('picard');
  });

  it('does not seat an officer merely because their id appears inside another word', () => {
    // \b guards against 'data' matching inside 'database', 'metadata', 'validate'.
    const team = ids('Update the database metadata to validate rows.');
    // 'data' must not be seated by the substring; it may still appear via its own keywords (schema,
    // migration, consistency) — so assert on the REASON rather than mere absence.
    const data = assembleAndOptimize('Update the database metadata to validate rows.', 3)
      .team.find((m) => m.crewId === 'data');
    if (data) expect(data.reason).not.toMatch(/named/i);
    expect(team).toContain('picard');
  });

  it('matches a named officer case-insensitively', () => {
    expect(ids('YAR: verify nothing regressed.')).toContain('yar');
    expect(ids('geordi: check the pipeline.')).toContain('geordi');
  });
});
