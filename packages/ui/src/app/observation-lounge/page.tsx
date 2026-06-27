'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AhaSprint, AhaStory, CrewMissionPlan, ObservationDebateResult, ObservationMemoryRecord } from '@story-agent/shared';
import { buildResumePayload, streamFrames } from '@/lib/stream-transport';

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

type WizardState = {
  // Step 1
  referenceNum: string;
  // Step 2 — enriched after Aha fetch
  story: AhaStory | null;
  brief: string;
  nonGoals: string;
  riskAreas: string;
  // Step 3 — context
  repoFullName: string;
  targetBranch: string;
  techStack: string;
  reviewers: string;
  testPolicy: string;
  // Step 4 — sprint
  sprints: AhaSprint[];
  selectedSprintId: string;
  storyPoints: string;
  planningDate: string;
  reviewDate: string;
  retroDate: string;
  sprintNotes: string;
  missionPlan: CrewMissionPlan | null;
  debate: ObservationDebateResult | null;
  sharedMemories: ObservationMemoryRecord[];
};

type ExecutionMode = 'autonomous' | 'guided' | null;

const INITIAL: WizardState = {
  referenceNum: '',
  story: null,
  brief: '',
  nonGoals: '',
  riskAreas: '',
  repoFullName: '',
  targetBranch: 'dev',
  techStack: '',
  reviewers: '',
  testPolicy: '',
  sprints: [],
  selectedSprintId: '',
  storyPoints: '',
  planningDate: '',
  reviewDate: '',
  retroDate: '',
  sprintNotes: '',
  missionPlan: null,
  debate: null,
  sharedMemories: [],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildKickoffPrompt(w: WizardState): string {
  const sprint = w.sprints.find(s => s.id === w.selectedSprintId);
  return [
    `Execute Phase 1 for ${w.story!.referenceNum}: ${w.story!.name}`,
    '',
    `- Primary repo: ${w.repoFullName || '<your-repo>'}`,
    `- Target branch: ${w.targetBranch}`,
    `- Aha story ID: ${w.story!.id}`,
    `- Story URL: ${w.story!.url}`,
    w.techStack ? `- Tech stack: ${w.techStack}` : '',
    w.reviewers ? `- Reviewers: ${w.reviewers}` : '',
    w.testPolicy ? `- Test policy: ${w.testPolicy}` : '',
    w.storyPoints ? `- Story points: ${w.storyPoints}` : '',
    sprint ? `- Sprint: ${sprint.name} (${sprint.startDate ?? '?'} → ${sprint.endDate ?? '?'})` : '',
    w.nonGoals ? `- Non-goals: ${w.nonGoals}` : '',
    w.riskAreas ? `- Risk areas: ${w.riskAreas}` : '',
    '',
    'Follow the story-execution-master-template workflow.',
  ].filter(l => l !== '').join('\n');
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = ['Load Story', 'Review Context', 'Execution Setup', 'Sprint & Launch'];
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: '1.75rem' }}>
      {steps.map((label, i) => {
        const num = (i + 1) as Step;
        const done = current > num;
        const active = current === num;
        return (
          <div key={num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done ? 'var(--ok)' : active ? 'var(--accent4)' : 'var(--border)',
                color: done || active ? 'var(--surface)' : 'var(--text-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13,
              }}>
                {done ? '✓' : num}
              </div>
              <div style={{ fontSize: 10, color: active ? 'var(--accent4)' : done ? 'var(--ok)' : 'var(--text-dim)', marginTop: 4, textAlign: 'center', fontWeight: active ? 600 : 400 }}>
                {label}
              </div>
            </div>
            {i < 3 && (
              <div style={{ height: 2, flex: 1, background: done ? 'var(--ok)' : 'var(--border)', marginBottom: 18 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children, col = false }: { label: string; children: React.ReactNode; col?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: col ? '1/-1' : undefined }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = { padding: '0.45rem 0.6rem', fontSize: '0.875rem', width: '100%', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit' };
const textareaStyle: React.CSSProperties = { ...inputStyle, minHeight: 72, resize: 'vertical' };

// ── Main wizard ──────────────────────────────────────────────────────────────

export default function ObservationLoungePage() {
  const [step, setStep] = useState<Step>(1);
  const [w, setW] = useState<WizardState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ExecutionMode>(null);
  const [kickoff, setKickoff] = useState('');
  const [copied, setCopied] = useState(false);
  const [lastFrameTimestamp, setLastFrameTimestamp] = useState<string | null>(null);

  const set = (key: keyof WizardState, val: unknown) => setW(s => ({ ...s, [key]: val }));

  // Step 1 → 2: fetch story + brief
  const loadStory = useCallback(async () => {
    if (!w.referenceNum.trim()) { setError('Story reference required (e.g. STORY-123 or Aha URL)'); return; }
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({
        referenceNum: w.referenceNum.trim(),
        ...(w.repoFullName ? { repoFullName: w.repoFullName } : {}),
        ...(w.targetBranch ? { targetBranch: w.targetBranch } : {}),
        ...(w.techStack ? { techStack: w.techStack } : {}),
        ...(w.testPolicy ? { testPolicy: w.testPolicy } : {}),
        ...(w.reviewers ? { reviewers: w.reviewers } : {}),
      });

      let streamedData: {
        story: AhaStory;
        brief: string;
        missionPlan?: CrewMissionPlan;
        debate?: ObservationDebateResult;
        sharedMemories?: ObservationMemoryRecord[];
      } | null = null;

      for await (const frame of streamFrames({
        url: `/api/aha/observation-lounge/stream?${params.toString()}`,
        payload: buildResumePayload(w.referenceNum.trim(), undefined, lastFrameTimestamp),
      })) {
        setLastFrameTimestamp(frame.ts);
        if (frame.type === 'final_result' && typeof frame.data.content === 'string') {
          streamedData = JSON.parse(frame.data.content) as typeof streamedData;
        }
        if (frame.type === 'error') {
          throw new Error(frame.data.message);
        }
      }

      if (!streamedData) {
        const res = await fetch(`/api/aha/observation-lounge?${params}`);
        const fallbackData = await res.json() as {
          story: AhaStory;
          brief: string;
          missionPlan?: CrewMissionPlan;
          debate?: ObservationDebateResult;
          sharedMemories?: ObservationMemoryRecord[];
          error?: string;
        };
        if (!res.ok) throw new Error(fallbackData.error ?? `HTTP ${res.status}`);
        streamedData = fallbackData;
      }

      setW(s => ({
        ...s,
        story: streamedData.story,
        brief: streamedData.brief,
        missionPlan: streamedData.missionPlan ?? null,
        debate: streamedData.debate ?? null,
        sharedMemories: streamedData.sharedMemories ?? [],
      }));
      setStep(2);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unknown error'); }
    finally { setLoading(false); }
  }, [lastFrameTimestamp, w.referenceNum, w.repoFullName, w.reviewers, w.targetBranch, w.techStack, w.testPolicy]);

  // Step 3 → 4: load sprints if project id available
  const loadSprints = useCallback(async () => {
    setStep(4);
    if (!w.story?.id) return;
    try {
      // Use project id extracted from story url or feature id prefix
      const projectGuess = w.story.url.match(/\/products\/([^/]+)\//)?.[1] ?? '';
      if (!projectGuess) return;
      const res = await fetch(`/api/aha/sprints?projectId=${encodeURIComponent(projectGuess)}`);
      if (!res.ok) return;
      const sprints = await res.json() as AhaSprint[];
      setW(s => ({ ...s, sprints, selectedSprintId: sprints[0]?.id ?? '' }));
    } catch { /* sprint data is optional */ }
  }, [w.story]);

  // Final: build kickoff prompt and show execution choice
  const finalize = useCallback((chosenMode: ExecutionMode) => {
    if (!w.story) return;
    setMode(chosenMode);
    setKickoff(buildKickoffPrompt(w));
  }, [w]);

  const copyKickoff = async () => {
    await navigator.clipboard.writeText(kickoff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedSprint = w.sprints.find(s => s.id === w.selectedSprintId);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <a href="/dashboard" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>← Dashboard</a>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>Observation Lounge</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '4px 0 0' }}>
          Step through mission intake: load story → review context → set execution parameters → assign sprint & launch.
        </p>
      </div>

      <StepIndicator current={step} />

      {/* ── STEP 1: Load story ──────────────────────────────────────────── */}
      {step === 1 && (
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.85rem' }}>Step 1 — Load Mission Story</h2>
          <Field label="Story Reference Number or Aha URL" col>
            <input
              value={w.referenceNum}
              onChange={e => set('referenceNum', e.target.value)}
              placeholder="e.g. STORY-123 or full Aha URL"
              style={{ ...inputStyle, fontFamily: 'monospace' }}
              onKeyDown={e => e.key === 'Enter' && void loadStory()}
              autoFocus
            />
          </Field>
          {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={loadStory} disabled={loading}>
              {loading ? 'Fetching from Aha…' : 'Load Story →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Review Aha context ──────────────────────────────────── */}
      {step === 2 && w.story && (
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.85rem' }}>
            Step 2 — Review Story Context
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Story</div><strong>{w.story.referenceNum}</strong></div>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</div>{w.story.workflowStatus}</div>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aha</div><a href={w.story.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem' }}>Open ↗</a></div>
            <div style={{ gridColumn: '1/-1' }}><div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title</div><strong>{w.story.name}</strong></div>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <Field label="Description (from Aha)" col>
              <textarea value={w.story.description || '(no description)'} readOnly style={{ ...textareaStyle, background: 'var(--bg)', color: 'var(--text)' }} />
            </Field>
            <Field label="Acceptance Criteria (from Aha requirements)" col>
              <textarea value={w.story.acceptanceCriteria || '(no criteria defined in Aha)'} readOnly style={{ ...textareaStyle, background: 'var(--bg)', color: 'var(--text)' }} />
            </Field>
            <Field label="Non-goals (specify here)" col>
              <textarea value={w.nonGoals} onChange={e => set('nonGoals', e.target.value)} placeholder="What is explicitly out of scope for this story?" style={textareaStyle} />
            </Field>
            <Field label="Risk Areas" col>
              <textarea value={w.riskAreas} onChange={e => set('riskAreas', e.target.value)} placeholder="Potential regressions, dependencies, or sensitive areas" style={textareaStyle} />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Context Approved → Next</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Execution setup ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.85rem' }}>
            Step 3 — Execution Setup
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field label="Repository (owner/name)" col>
              <input value={w.repoFullName} onChange={e => set('repoFullName', e.target.value)} placeholder="e.g. client-int/product-profile-ui" style={inputStyle} />
            </Field>
            <Field label="Target Branch">
              <input value={w.targetBranch} onChange={e => set('targetBranch', e.target.value)} placeholder="dev" style={inputStyle} />
            </Field>
            <Field label="Tech Stack Hints">
              <input value={w.techStack} onChange={e => set('techStack', e.target.value)} placeholder="e.g. React, Redux, Express, Postgres" style={inputStyle} />
            </Field>
            <Field label="Reviewers">
              <input value={w.reviewers} onChange={e => set('reviewers', e.target.value)} placeholder="e.g. @team or @user" style={inputStyle} />
            </Field>
            <Field label="Test Policy Override" col>
              <input value={w.testPolicy} onChange={e => set('testPolicy', e.target.value)} placeholder="Leave blank: run tests for changed files" style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" onClick={loadSprints}>Sprint & Launch Setup →</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Sprint assignment + execution mode ──────────────────── */}
      {step === 4 && !mode && (
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.85rem' }}>
            Step 4 — Sprint Assignment & Launch
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {w.sprints.length > 0 ? (
              <Field label="Assign to Sprint" col>
                <select
                  value={w.selectedSprintId}
                  onChange={e => set('selectedSprintId', e.target.value)}
                  style={{ ...inputStyle }}
                >
                  <option value="">— no sprint —</option>
                  {w.sprints.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.startDate ? ` (${s.startDate} → ${s.endDate ?? '?'})` : ''}{s.totalStoryPoints ? ` · ${s.doneStoryPoints}/${s.totalStoryPoints} pts` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Sprint Name (manual)" col>
                <input value={w.sprintNotes} onChange={e => set('sprintNotes', e.target.value)} placeholder="e.g. Sprint 23 (no Aha sprints detected)" style={inputStyle} />
              </Field>
            )}

            <Field label="Story Points">
              <input value={w.storyPoints} onChange={e => set('storyPoints', e.target.value)} placeholder="e.g. 3" style={inputStyle} type="number" min={0} />
            </Field>

            {selectedSprint && (
              <div style={{ gridColumn: '1/-1', padding: '0.6rem 0.85rem', background: 'var(--surface-2)', borderRadius: 5, border: '1px solid var(--border)', fontSize: '0.83rem' }}>
                <strong>{selectedSprint.name}</strong> &nbsp;·&nbsp;
                {selectedSprint.doneStoryPoints}/{selectedSprint.totalStoryPoints} pts done &nbsp;·&nbsp;
                {selectedSprint.featureCount} stories &nbsp;·&nbsp;
                <a href={selectedSprint.url} target="_blank" rel="noreferrer">Open in Aha ↗</a>
              </div>
            )}

            <div style={{ gridColumn: '1/-1', borderTop: '1px solid var(--surface-2)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500, marginBottom: '0.5rem' }}>Agile Rituals (optional)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                <Field label="Planning Date">
                  <input value={w.planningDate} onChange={e => set('planningDate', e.target.value)} type="date" style={inputStyle} />
                </Field>
                <Field label="Review Date">
                  <input value={w.reviewDate} onChange={e => set('reviewDate', e.target.value)} type="date" style={inputStyle} />
                </Field>
                <Field label="Retro Date">
                  <input value={w.retroDate} onChange={e => set('retroDate', e.target.value)} type="date" style={inputStyle} />
                </Field>
              </div>
            </div>
          </div>

          {/* Execution mode choice */}
          <div style={{ borderTop: '1px solid var(--surface-2)', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.6rem' }}>How should this mission be executed?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={() => finalize('autonomous')}
                style={{ padding: '1rem', border: '2px solid var(--accent4)', borderRadius: 6, background: 'var(--surface-2)', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent1)' }}>⚡ Autonomous</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: 4 }}>
                  Generate the full Phase 1 kickoff prompt ready to paste to Copilot. Agent discovers, implements, and opens a PR automatically.
                </div>
              </button>
              <button
                onClick={() => finalize('guided')}
                style={{ padding: '1rem', border: '2px solid var(--accent3)', borderRadius: 6, background: 'var(--surface-2)', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent3)' }}>🧭 Guided Wizard</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: 4 }}>
                  Step through each delivery phase manually — Discovery → Plan → Implement → Validate → PR. You control each transition.
                </div>
              </button>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)}>← Back</button>
          </div>
        </div>
      )}

      {/* ── RESULT: Kickoff prompt + instructions ──────────────────────── */}
      {step === 4 && mode && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1.25rem' }}>{mode === 'autonomous' ? '⚡' : '🧭'}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                {mode === 'autonomous' ? 'Autonomous Execution' : 'Guided Wizard'} — {w.story?.referenceNum}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{w.story?.name}</div>
            </div>
            <button className="btn btn-secondary" style={{ marginLeft: 'auto', fontSize: '0.8rem' }} onClick={() => setMode(null)}>← Change Mode</button>
          </div>

          {mode === 'autonomous' && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 5, fontSize: '0.85rem', color: 'var(--text)' }}>
              Copy the kickoff prompt below and paste it into <strong>Copilot Chat</strong>. The agent will run Phase 1 end-to-end (discover → plan → implement → test → open PR).
              After the PR opens, switch to <strong>Phase 2 (PR revision)</strong> to process review comments.
            </div>
          )}

          {mode === 'guided' && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent3)', fontWeight: 600, marginBottom: '0.5rem' }}>Guided Phase Sequence</div>
              {['1. Discovery — paste prompt, review codebase analysis', '2. Plan — review + approve implementation plan', '3. Implement — agent applies changes', '4. Validate — run tests, verify acceptance criteria', '5. PR — agent opens PR, you review and merge'].map((phase, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: '1px solid var(--surface-2)', fontSize: '0.83rem' }}>
                  <span style={{ color: 'var(--accent3)' }}>→</span> {phase}
                </div>
              ))}
              <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                Use the kickoff prompt below to start Discovery. After each phase completes, instruct Copilot to proceed to the next phase.
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {mode === 'guided' ? 'Phase 1 — Discovery Kickoff Prompt' : 'Kickoff Prompt'}
              </span>
              <button className="btn btn-secondary" onClick={copyKickoff} style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}>
                {copied ? '✓ Copied' : '$(clippy) Copy'}
              </button>
            </div>
            <pre style={{ margin: 0, padding: '0.85rem', background: 'var(--bg)', borderRadius: 5, fontSize: '0.8rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--text)', maxHeight: '40vh', overflow: 'auto', border: '1px solid var(--border)' }}>
              {kickoff}
            </pre>
          </div>

          {w.missionPlan && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                Crew Agents and Assignments
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {w.missionPlan.crew.map(member => (
                  <div key={member.id} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.55rem 0.65rem', background: 'var(--surface)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{member.role}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{member.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{member.specialty}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {w.debate && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.45rem' }}>
                Observation Lounge Consensus
              </div>
              <div style={{ padding: '0.7rem', border: '1px solid var(--surface-2)', background: 'var(--surface-2)', borderRadius: 6, fontSize: '0.82rem', color: 'var(--accent4)' }}>
                {w.debate.consensusSummary}
              </div>
              {w.debate.rounds.map((round, idx) => (
                <div key={idx} style={{ marginTop: '0.65rem', border: '1px solid var(--border)', borderRadius: 6, padding: '0.55rem 0.65rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem' }}>{round.title}</div>
                  {round.entries.map((entry, entryIdx) => (
                    <div key={entryIdx} style={{ fontSize: '0.79rem', color: 'var(--text)', marginBottom: '0.35rem' }}>
                      <strong>{entry.speakerId}</strong> ({entry.position}): {entry.statement}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {w.sharedMemories && w.sharedMemories.length > 0 && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.45rem' }}>
                🧠 Prior Memories That Influenced This Decision
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.6rem' }}>
                {w.sharedMemories.length} relevant memories from the crew's collective experience
              </div>
              {w.sharedMemories.map((memory, idx) => (
                <div key={idx} style={{ marginBottom: '0.55rem', borderLeft: '3px solid var(--accent3)', paddingLeft: '0.65rem', background: 'var(--surface-2)', padding: '0.55rem 0.65rem', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent3)', fontWeight: 600 }}>{memory.missionReference ?? memory.storyId}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent3)' }}>
                      {new Date(memory.createdAt).toLocaleDateString()} • {(memory.similarity ?? 0).toFixed(2)} relevance
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
                    <strong>Decision:</strong> {memory.transcript.finalDecision}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                    {memory.transcript.consensusSummary}
                  </div>
                  {memory.transcript.unresolvedRisks.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.3rem' }}>
                      ⚠️ Risks: {memory.transcript.unresolvedRisks.slice(0, 2).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.85rem' }}>
            <a
              href={`/story/new?referenceNum=${w.story?.referenceNum ?? ''}&repoFullName=${encodeURIComponent(w.repoFullName)}&baseBranch=${w.targetBranch}`}
              className="btn btn-primary"
            >
              Import Story into Tracker →
            </a>
            <a href="/dashboard" className="btn btn-secondary">View Dashboard</a>
          </div>
        </div>
      )}
    </div>
  );
}
