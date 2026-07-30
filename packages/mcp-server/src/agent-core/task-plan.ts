/**
 * Task plan — the loop's completion contract, and the answer to "finished or merely stopped?"
 *
 * THE DEFECT THIS CLOSES. The loop finalizes as soon as the model returns a turn with no tool calls.
 * It has exactly one stall detector, and it only fires when ZERO tools were called on an actionable
 * task. Every observed silent partial completion had the opposite shape: the model called several
 * tools, did part of the work, then produced a confident closing paragraph while steps remained
 * undone. Nothing was wrong with any individual call, so nothing tripped. The run reported success.
 *
 * A run cannot distinguish those two cases from tool traffic alone — "7 tool calls then stopped" looks
 * identical whether the task took 7 steps or 12. The missing information is the model's OWN statement
 * of what it intended to do. So the model declares a plan up front, marks steps done as it goes, and
 * the loop refuses to call the run finished while declared steps remain open.
 *
 * This doubles as the capability parity gap versus Claude Code's TodoWrite: the same declaration that
 * makes a plan visible to the operator is what makes incompleteness detectable by the machine.
 *
 * Everything here is PURE and synchronous so the contract logic is testable without model calls.
 */

export type StepStatus = 'pending' | 'done';

export interface PlanStep {
  /** 1-based index, assigned on declaration — the handle the model uses to complete a step. */
  id: number;
  description: string;
  status: StepStatus;
}

export interface CompletionAssessment {
  /** Did the model ever declare a plan? Without one the contract cannot judge anything. */
  declared: boolean;
  total: number;
  completed: number;
  /** Descriptions of steps still open, for the corrective message and the audit trail. */
  remaining: string[];
  /**
   * True when the run may honestly be called FINISHED: either no plan was declared (nothing was
   * promised) or every declared step is done. False means the run STOPPED with work outstanding.
   */
  satisfied: boolean;
  /** One-line summary for the operator and the stored record. */
  note: string;
  /**
   * Steps marked done whose wording implies a file change, in a run where NO mutating tool ever
   * succeeded. Advisory, not proof — but a step cannot have been "implemented" if nothing was written.
   */
  unevidenced: string[];
}

/**
 * Does this step's wording imply a FILE CHANGE? Used to flag a step claimed done in a run where
 * nothing was ever written. Deliberately conservative: a step like "read X" or "report Y" is
 * legitimately satisfied with no mutation, so only clearly-mutating verbs count.
 */
export function impliesMutation(description: string): boolean {
  return /\b(creat|writ|add|implement|edit|updat|fix|registr|register|delet|remov|refactor|rename|patch|wire|scaffold)/i
    .test(String(description ?? ''));
}

/** Mutable per-run plan state. One instance per agent run; never shared across runs. */
export class TaskPlan {
  private steps: PlanStep[] = [];
  private declaredAt: number | null = null;
  /** Set when the model explicitly abandons the plan, so an honest early exit is not misreported. */
  private abandonedReason: string | null = null;
  /** Count of mutating tool calls that actually SUCCEEDED during this run (loop reports them). */
  private mutations = 0;

  /**
   * Declare (or REPLACE) the plan. Replacing is allowed because a model legitimately revises its plan
   * once it has read the code — but replacement is not a way to erase unfinished work, since the
   * assessment always judges the CURRENT plan and a shrinking plan is visible in the audit trail.
   */
  declare(descriptions: readonly string[], at = 0): PlanStep[] {
    const cleaned = descriptions.map((d) => String(d ?? '').trim()).filter(Boolean);
    this.steps = cleaned.map((description, i) => ({ id: i + 1, description, status: 'pending' as StepStatus }));
    this.declaredAt = at;
    this.abandonedReason = null;
    return this.snapshot();
  }

  /** Mark steps done by id. Unknown ids are reported rather than silently ignored. */
  complete(ids: readonly number[]): { completed: number[]; unknown: number[] } {
    const completed: number[] = [];
    const unknown: number[] = [];
    for (const raw of ids) {
      const id = Number(raw);
      const step = this.steps.find((s) => s.id === id);
      if (!step) { unknown.push(id); continue; }
      step.status = 'done';
      completed.push(id);
    }
    return { completed, unknown };
  }

  /** Record an explicit, reasoned abandonment — an honest "cannot finish" beats a false success. */
  abandon(reason: string): void {
    this.abandonedReason = String(reason ?? '').trim() || 'no reason given';
  }

  /**
   * The loop calls this after each mutating tool call that succeeded. It is the only evidence the plan
   * has that work actually happened — a model marking a step done is a CLAIM, not an observation.
   */
  recordMutation(): void {
    this.mutations++;
  }

  mutationCount(): number {
    return this.mutations;
  }

  hasPlan(): boolean {
    return this.steps.length > 0;
  }

  snapshot(): PlanStep[] {
    return this.steps.map((s) => ({ ...s }));
  }

  /** Render for the model: its own plan with current status, so it can see what is outstanding. */
  render(): string {
    if (!this.steps.length) return '(no plan declared)';
    const lines = this.steps.map((s) => `  ${s.status === 'done' ? '[x]' : '[ ]'} ${s.id}. ${s.description}`);
    const head = `Plan (${this.steps.filter((s) => s.status === 'done').length}/${this.steps.length} done):`;
    const tail = this.abandonedReason ? `\nABANDONED: ${this.abandonedReason}` : '';
    return `${head}\n${lines.join('\n')}${tail}`;
  }

  /** Judge whether the run may be called finished. */
  assess(): CompletionAssessment {
    const total = this.steps.length;
    const completed = this.steps.filter((s) => s.status === 'done').length;
    const remaining = this.steps.filter((s) => s.status !== 'done').map((s) => s.description);
    // A model marking a step done is a CLAIM. If nothing was ever written, a step whose own wording
    // says "create"/"implement" cannot have happened. Observed live: a crew run marked
    // "Create lcars-markdown.ts" done having never called write_file.
    const unevidenced = this.mutations === 0
      ? this.steps.filter((s) => s.status === 'done' && impliesMutation(s.description)).map((s) => s.description)
      : [];

    if (!total) {
      return {
        declared: false,
        total: 0,
        completed: 0,
        remaining: [],
        satisfied: true,
        note: 'No plan was declared — completion could not be verified against stated intent.',
        unevidenced: [],
      };
    }
    if (this.abandonedReason) {
      return {
        declared: true,
        total,
        completed,
        remaining,
        // An explicit abandonment is honest, so it does not count as a silent partial — but it is
        // NOT a success either. `satisfied` stays false so callers see work was left undone.
        satisfied: false,
        note: `Plan explicitly ABANDONED after ${completed}/${total} step(s): ${this.abandonedReason}`,
        unevidenced,
      };
    }
    if (remaining.length) {
      return {
        declared: true,
        total,
        completed,
        remaining,
        satisfied: false,
        note: `STOPPED, not finished: ${completed}/${total} declared step(s) done; ${remaining.length} outstanding.`,
        unevidenced,
      };
    }
    if (unevidenced.length) {
      return {
        declared: true, total, completed, remaining: [], unevidenced,
        // NOT satisfied: every step is claimed done, but nothing was ever written, so the steps that
        // say "create"/"implement" are unsupported by any observation.
        satisfied: false,
        note: `UNEVIDENCED: all ${total} step(s) marked done but NO file was written this run; ${unevidenced.length} step(s) claim work that leaves no trace: ${unevidenced.join('; ')}`,
      };
    }
    return {
      declared: true,
      total,
      completed,
      remaining: [],
      satisfied: true,
      unevidenced: [],
      note: `Finished: all ${total} declared step(s) completed.`,
    };
  }
}

/** The corrective message pushed back when a run tries to finish with steps outstanding. */
export function buildIncompleteNudge(a: CompletionAssessment, plan: string): string {
  return [
    `You are stopping with ${a.remaining.length} of your ${a.total} declared step(s) NOT done.`,
    '',
    plan,
    '',
    'Outstanding:',
    ...a.remaining.map((r, i) => `  ${i + 1}. ${r}`),
    '',
    'Either continue working through the remaining steps by calling tools now, or — if they genuinely',
    'cannot be completed — call task_plan with action "abandon" and a specific reason. Do NOT summarize',
    'as though the work were complete.',
  ].join('\n');
}
