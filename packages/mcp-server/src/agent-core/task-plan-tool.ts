/**
 * `task_plan` — the model's own statement of intent, and the loop's parity with Claude Code's TodoWrite.
 *
 * Kept separate from task-plan.ts so the contract logic stays pure and free of tool/zod plumbing.
 */
import { z } from 'zod';
import type { AgentTool } from './tools.js';
import { impliesMutation, type TaskPlan } from './task-plan.js';

/**
 * Models do not emit the documented shape. Observed live from a tier-3 model in a single run:
 *   declare:  steps: [{ name: '…' }]                        (objects, not strings)
 *   complete: { step: { id: 2, name: '…' }, result: '…' }    (one object, not an id array)
 *   complete: { step: { name: '…' } }                        (no id at all — name only)
 * Naively coercing gave "[object Object]" step titles and seven rejected calls. Rather than fight it,
 * normalise the shapes models actually produce — the same principle as tool-call-repair.ts. A planning
 * tool that rejects the model's dialect provides no contract at all, because nothing gets declared.
 */

/** Pull a human label out of a step, whether it arrived as a string or an object. */
export function normalizeStepDescription(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const key of ['description', 'name', 'title', 'text', 'step', 'content', 'task']) {
      const v = o[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return '';
}

/**
 * Resolve which step ids a `complete` call refers to, accepting every observed dialect: an id array,
 * a single id, a step object carrying an id, or — failing all of that — a description to match.
 */
export function resolveCompletedIds(args: Record<string, unknown>, plan: TaskPlan): number[] {
  const ids = new Set<number>();
  const addNumeric = (v: unknown) => {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) ids.add(Math.trunc(n));
  };

  for (const key of ['completed', 'ids', 'steps']) {
    const v = args[key];
    if (Array.isArray(v)) for (const item of v) {
      if (typeof item === 'object' && item) addNumeric((item as Record<string, unknown>).id);
      else addNumeric(item);
    }
  }
  addNumeric(args.id);
  addNumeric(args.step_id);

  const step = args.step;
  if (typeof step === 'number' || typeof step === 'string') addNumeric(step);
  if (step && typeof step === 'object') addNumeric((step as Record<string, unknown>).id);

  // Nothing numeric anywhere → fall back to matching the description against the declared plan.
  if (!ids.size) {
    const label = normalizeStepDescription(args.step ?? args.description ?? args.name).toLowerCase();
    if (label) {
      const match = plan.snapshot().find((s) => s.description.toLowerCase() === label)
        ?? plan.snapshot().find((s) => s.description.toLowerCase().includes(label) || label.includes(s.description.toLowerCase()));
      if (match) ids.add(match.id);
    }
  }
  return [...ids];
}

export const taskPlanTool: AgentTool = {
  name: 'task_plan',
  description:
    'Declare and track your plan. Call with action "declare" and a steps array BEFORE you start multi-step work, then action "complete" with the step ids as you finish each one. The run is not considered finished while declared steps remain open, so keep it current. If a step genuinely cannot be done, use action "abandon" with a reason — an honest stop is better than a false success. Action "status" shows the current plan.',
  schema: z.object({
    action: z.enum(['declare', 'complete', 'abandon', 'status']).describe('What to do with the plan.'),
    steps: z.array(z.string()).optional().describe('For "declare": the ordered steps you intend to perform.'),
    completed: z.array(z.number()).optional().describe('For "complete": ids of steps now finished.'),
    reason: z.string().optional().describe('For "abandon": why the remaining steps cannot be completed.'),
  }),
  handler: async (a, ctx) => {
    const plan = ctx.taskPlan;
    if (!plan) return 'error: task planning is not available in this run.';
    const action = String(a.action ?? 'status');

    if (action === 'declare') {
      const rawSteps = Array.isArray(a.steps) ? (a.steps as unknown[])
        : Array.isArray(a.plan) ? (a.plan as unknown[])
        : [];
      const steps = rawSteps.map(normalizeStepDescription).filter(Boolean);
      if (!steps.length) return 'error: "declare" requires a non-empty steps array of step descriptions.';
      plan.declare(steps);
      return `Plan declared.\n${plan.render()}`;
    }

    if (action === 'complete') {
      const ids = resolveCompletedIds(a, plan);
      if (!ids.length) {
        return `error: could not tell which step you completed. Pass step ids, e.g. {"action":"complete","completed":[1,2]}.\n${plan.render()}`;
      }
      // Capture which steps imply a file change BEFORE marking them, so the warning can name them.
      const claiming = plan.snapshot().filter((s) => ids.includes(s.id) && impliesMutation(s.description));
      const { completed, unknown } = plan.complete(ids);
      const warn = unknown.length ? `\nWARNING: no such step id(s): ${unknown.join(', ')}` : '';
      // Challenge the claim AT THE MOMENT it is made, while the model can still act on it — far more
      // useful than only reporting it after the run has finished.
      const evidence = claiming.length && plan.mutationCount() === 0
        ? `\nWARNING: you marked ${claiming.length} step(s) done that describe changing files, but NO file has been written or edited in this run yet: ${claiming.map((s) => s.description).join('; ')}. If you have not actually made the change, do it now — do not mark it done on intent.`
        : '';
      return `Marked done: ${completed.join(', ') || '(none)'}${warn}${evidence}\n${plan.render()}`;
    }

    if (action === 'abandon') {
      const reason = String(a.reason ?? '').trim();
      if (!reason) return 'error: "abandon" requires a specific reason.';
      plan.abandon(reason);
      return `Plan abandoned — recorded.\n${plan.render()}`;
    }

    return plan.render();
  },
};
