'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SCREEN_TOUR, COMPONENT_TOUR, type TourCopy } from './registry';

/**
 * Dev Tour — a DEVELOPER-ONLY guided walkthrough.
 *
 * Cycles through the current screen and every component that opted in with `data-dev-tour="<id>"`,
 * showing a "hovering" card ABOVE each target for 5 seconds, scaled relative to the target's size.
 * It's a step-by-step way to expose every screen + component while testing.
 *
 * ⛔ PRODUCTION SAFETY — HARD GATE. This renders nothing unless BOTH are true:
 *   - process.env.NODE_ENV !== 'production'   (stripped from the prod Docker build, NODE_ENV=production)
 *   - process.env.NEXT_PUBLIC_DEV_TOUR === '1' (explicit opt-in; default OFF even in dev)
 * The constant folds to `false` in production builds, so the engine below is dead-code-eliminated and
 * never ships. Do NOT remove this gate or set NEXT_PUBLIC_DEV_TOUR in any deployed environment.
 * (Crew RAG guardrail: O'Brien/Worf — dev-only, never released.)
 */
export const DEV_TOUR_ENABLED =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_TOUR === '1';

const STEP_MS = 5000;

interface Step {
  el: HTMLElement;
  copy: TourCopy;
  kind: 'screen' | 'component';
}

interface Rect { top: number; left: number; width: number; height: number; }

export default function DevTour() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [screenCount, setScreenCount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  // Build the step list for the current page: the screen itself, then each opted-in component.
  const buildSteps = useCallback((): Step[] => {
    if (typeof document === 'undefined') return [];
    const out: Step[] = [];
    const main = document.querySelector('main') as HTMLElement | null;
    const screenCopy = SCREEN_TOUR[pathname] ?? { title: pathname, description: 'This screen has no registered description yet.' };
    if (main) out.push({ el: main, copy: screenCopy, kind: 'screen' });
    document.querySelectorAll<HTMLElement>('[data-dev-tour]').forEach((el) => {
      const id = el.dataset.devTour;
      const copy = id ? COMPONENT_TOUR[id] : undefined;
      if (copy) out.push({ el, copy, kind: 'component' });
    });
    return out;
  }, [pathname]);

  const measure = useCallback((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, []);

  const goto = useCallback((next: number, list: Step[]) => {
    if (next < 0 || next >= list.length) { setRunning(false); return; }
    setIdx(next);
    const step = list[next];
    step.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // measure after the smooth scroll settles
    requestAnimationFrame(() => measure(step.el));
    setTimeout(() => measure(step.el), 350);
  }, [measure]);

  const start = useCallback(() => {
    const list = buildSteps();
    if (!list.length) return;
    setSteps(list);
    setRunning(true);
    setPaused(false);
    goto(0, list);
  }, [buildSteps, goto]);

  const stop = useCallback(() => { setRunning(false); setRect(null); }, []);

  // Auto-advance every STEP_MS while running and not paused.
  useEffect(() => {
    if (!running || paused || !steps.length) return;
    timer.current = setTimeout(() => {
      if (idx + 1 >= steps.length) setRunning(false);
      else goto(idx + 1, steps);
    }, STEP_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [running, paused, idx, steps, goto]);

  // Keep the card glued to the target on scroll/resize.
  useEffect(() => {
    if (!running || !steps[idx]) return;
    const onMove = () => measure(steps[idx].el);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [running, idx, steps, measure]);

  // If the route changes mid-tour, rebuild for the new screen.
  useEffect(() => {
    if (!running) return;
    const list = buildSteps();
    setSteps(list);
    goto(0, list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Count screens with registered copy (for the launcher label).
  useEffect(() => { setScreenCount(Object.keys(SCREEN_TOUR).length); }, []);

  const cardStyle = useMemo((): React.CSSProperties | null => {
    if (!rect) return null;
    const width = Math.max(240, Math.min(rect.width * 0.9, 460)); // scale to target, clamped
    const gap = 12;
    const estHeight = 150;
    const above = rect.top - estHeight - gap > 8;
    const top = above ? rect.top - estHeight - gap : rect.top + rect.height + gap;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    return {
      position: 'fixed', top, left, width, zIndex: 100000,
      background: '#0b1020', color: '#e6ecff', border: '1px solid #3b82f6',
      borderRadius: 10, padding: '12px 14px', boxShadow: '0 10px 40px rgba(0,0,0,.45)',
      fontFamily: 'ui-sans-serif, system-ui', fontSize: 13, lineHeight: 1.45,
    };
  }, [rect]);

  if (!mounted || !DEV_TOUR_ENABLED) return null;

  const step = steps[idx];

  return (
    <>
      {/* Launcher (when idle) */}
      {!running && (
        <button
          onClick={start}
          title="Developer-only guided tour (NEXT_PUBLIC_DEV_TOUR=1)"
          style={{
            position: 'fixed', right: 16, bottom: 16, zIndex: 100000,
            background: '#3b82f6', color: 'white', border: 'none', borderRadius: 999,
            padding: '10px 16px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(59,130,246,.5)', fontSize: 13,
          }}
        >
          ▶ Dev Tour · {screenCount} screens
        </button>
      )}

      {/* Highlight ring around the current target */}
      {running && rect && (
        <div
          style={{
            position: 'fixed', top: rect.top - 4, left: rect.left - 4,
            width: rect.width + 8, height: rect.height + 8, zIndex: 99999,
            border: '2px solid #3b82f6', borderRadius: 8, pointerEvents: 'none',
            boxShadow: '0 0 0 9999px rgba(2,6,23,.45)', transition: 'all .25s ease',
          }}
        />
      )}

      {/* Hovering card */}
      {running && step && cardStyle && (
        <div style={cardStyle} role="dialog" aria-label="Dev tour step">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: step.kind === 'screen' ? '#fbbf24' : '#60a5fa' }}>
              {step.kind} · {idx + 1}/{steps.length}
            </span>
            <button onClick={stop} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{step.copy.title}</div>
          <div style={{ color: '#cbd5e1' }}>{step.copy.description}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <button onClick={() => goto(idx - 1, steps)} disabled={idx === 0} style={ctrlBtn(idx === 0)}>‹ Prev</button>
            <button onClick={() => setPaused((p) => !p)} style={ctrlBtn(false)}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
            <button onClick={() => goto(idx + 1, steps)} disabled={idx + 1 >= steps.length} style={ctrlBtn(idx + 1 >= steps.length)}>Next ›</button>
          </div>
          {/* 5s countdown bar */}
          {!paused && (
            <div style={{ height: 3, background: '#1e293b', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
              <div key={idx} style={{ height: '100%', background: '#3b82f6', animation: `devtour-countdown ${STEP_MS}ms linear forwards` }} />
            </div>
          )}
          <style>{`@keyframes devtour-countdown { from { width: 100% } to { width: 0% } }`}</style>
        </div>
      )}
    </>
  );
}

function ctrlBtn(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? '#1e293b' : '#1d4ed8', color: disabled ? '#475569' : 'white',
    border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12,
    cursor: disabled ? 'default' : 'pointer',
  };
}
