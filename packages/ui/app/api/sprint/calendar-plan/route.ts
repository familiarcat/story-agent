import { getRecentObservationMemories, storeObservationMemory } from '@/lib/db';

type PlannerPayload = {
  version: 1;
  sprintId: string;
  sprintName?: string;
  slotMinutes: number;
  dayCapacityHours: number;
  plan: {
    backlog: string[];
    days: Record<string, string[]>;
  };
};

function parsePayload(memory: unknown): PlannerPayload | null {
  const raw = (memory as { transcript?: { consensusSummary?: unknown } })?.transcript?.consensusSummary;
  if (typeof raw !== 'string' || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw) as PlannerPayload;
    if (parsed?.version !== 1 || !parsed?.sprintId || !parsed?.plan) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sprintId = (url.searchParams.get('sprintId') ?? '').trim();
  if (!sprintId) return json({ error: 'sprintId is required' }, 400);

  const selectedClientId = request.headers.get('x-client-id');
  const records = await getRecentObservationMemories(20, `sprint-plan:${sprintId}`, selectedClientId ?? null);

  for (const m of records) {
    if (!(m.tags ?? []).includes('sprint-calendar-plan')) continue;
    const payload = parsePayload(m);
    if (payload) {
      return json({
        found: true,
        payload,
        updatedAt: m.createdAt,
      });
    }
  }

  return json({ found: false });
}

export async function POST(request: Request): Promise<Response> {
  let payload: PlannerPayload;
  try {
    payload = (await request.json()) as PlannerPayload;
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  if (!payload?.sprintId || !payload?.plan) {
    return json({ error: 'sprintId and plan are required' }, 400);
  }

  const selectedClientId = request.headers.get('x-client-id');

  const memory = await storeObservationMemory({
    storyId: `sprint-plan:${payload.sprintId}`,
    clientId: selectedClientId ?? null,
    source: 'ui',
    tags: ['sprint-calendar-plan', 'calendar', payload.sprintId],
    transcript: {
      rounds: [
        {
          title: 'sprint calendar plan snapshot',
          entries: [
            {
              speakerId: 'ui',
              position: 'support',
              statement: `Stored sprint calendar plan for ${payload.sprintId}`,
              evidence: [`slot=${payload.slotMinutes}`, `capacity=${payload.dayCapacityHours}`],
            },
          ],
        },
      ],
      consensusSummary: JSON.stringify(payload),
      unresolvedRisks: [],
      finalDecision: 'approved',
      actionItems: ['Persisted UI sprint calendar state'],
    },
  });

  return json({ ok: true, memoryId: memory.id, createdAt: memory.createdAt });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
