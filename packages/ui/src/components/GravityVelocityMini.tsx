import type { AhaSprintStory } from '@story-agent/shared';

type GravityVelocityMiniProps = {
  stories: AhaSprintStory[];
  donePoints: number;
};

const FIB = [1, 2, 3, 5, 8, 13, 21, 34, 55];

function fibIndex(points: number): number {
  const idx = FIB.indexOf(points);
  if (idx >= 0) return idx;
  let nearest = 0;
  let minDelta = Number.POSITIVE_INFINITY;
  for (let i = 0; i < FIB.length; i += 1) {
    const delta = Math.abs(FIB[i] - points);
    if (delta < minDelta) {
      nearest = i;
      minDelta = delta;
    }
  }
  return nearest;
}

function loadForStory(points: number): number {
  // Einstein-inspired curvature proxy: larger Fibonacci buckets add non-linear drag.
  const idx = fibIndex(points);
  const gravityFactor = 1 + idx * 0.12;
  return points * gravityFactor;
}

export function GravityVelocityMini({ stories, donePoints }: GravityVelocityMiniProps) {
  const rawPoints = stories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);
  const weightedLoad = stories.reduce((sum, s) => {
    const pts = s.storyPoints ?? 0;
    return sum + (pts > 0 ? loadForStory(pts) : 0);
  }, 0);
  const dragPct = rawPoints > 0 ? Math.round(((weightedLoad - rawPoints) / rawPoints) * 100) : 0;
  const adjustedVelocity = weightedLoad > 0 ? Number((donePoints / weightedLoad).toFixed(2)) : 0;

  return (
    <div
      style={{
        marginTop: '0.75rem',
        padding: '0.55rem 0.7rem',
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'color-mix(in srgb, var(--surface) 86%, var(--accent2) 14%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        fontSize: '0.76rem',
      }}
      title="Einstein-Fibonacci gravity estimate for sprint velocity load"
    >
      <span style={{ color: 'var(--text-dim)' }}>Gravity Load</span>
      <span style={{ fontWeight: 700 }}>{weightedLoad.toFixed(1)}</span>
      <span style={{ color: 'var(--text-dim)' }}>Drag</span>
      <span style={{ fontWeight: 700, color: dragPct > 25 ? 'var(--warn)' : 'var(--ok)' }}>{dragPct}%</span>
      <span style={{ color: 'var(--text-dim)' }}>Adj Velocity</span>
      <span style={{ fontWeight: 700 }}>{adjustedVelocity}</span>
    </div>
  );
}
