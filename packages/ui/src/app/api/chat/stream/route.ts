import { randomUUID } from 'crypto';
import { prepareObservationLoungePayload } from '../../aha/observation-lounge/route';

type StoryAgentFrame =
  | {
      v: number;
      type: 'request_ack';
      data: { content: string };
      ts: string;
    }
  | {
      v: number;
      type: 'plan_summary';
      data: { content: string };
      ts: string;
    }
  | {
      v: number;
      type: 'final_result';
      data: { content: string; tools_called?: string[] };
      ts: string;
    }
  | {
      v: number;
      type: 'user_input_ack';
      data: { request: string; response: string };
      ts: string;
    }
  | {
      v: number;
      type: 'interrupt';
      data: { value: unknown };
      ts: string;
    }
  | {
      v: number;
      type: 'error';
      data: { message: string; source: string; type: string };
      ts: string;
    };

type ChatInvokePayload = {
  prompt: string;
  resume_value?: unknown;
  last_timestamp?: string | null;
};

export const dynamic = 'force-dynamic';

function frame<TType extends StoryAgentFrame['type']>(
  type: TType,
  data: Extract<StoryAgentFrame, { type: TType }>['data']
): Extract<StoryAgentFrame, { type: TType }> {
  return {
    v: 1,
    type,
    data,
    ts: new Date().toISOString(),
  } as Extract<StoryAgentFrame, { type: TType }>;
}

function encodeFrame(payload: StoryAgentFrame): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, user-session-id',
    'Access-Control-Expose-Headers': 'user-session-id',
    'Cache-Control': 'no-cache, no-transform',
  };
}

function extractReference(prompt: string, queryReference?: string | null): string | null {
  if (queryReference) return queryReference;

  const refMatch = prompt.match(/\b([A-Z]{2,10}-\d{1,8})\b/);
  if (refMatch?.[1]) return refMatch[1];

  const urlMatch = prompt.match(/https?:\/\/\S+/);
  if (urlMatch?.[0]) return urlMatch[0];

  return null;
}

function formatDebateSummary(payload: Awaited<ReturnType<typeof prepareObservationLoungePayload>>): string {
  const topRisks = payload.debate.unresolvedRisks.slice(0, 3);
  const topActions = payload.debate.actionItems.slice(0, 5);

  return [
    `### Observation Lounge: ${payload.story.referenceNum}`,
    '',
    `**Story:** ${payload.story.name}`,
    `**Execution mode:** ${payload.missionPlan.executionMode}`,
    `**Crew participants:** ${payload.missionPlan.crew.length}`,
    `**Decision:** ${payload.debate.finalDecision.toUpperCase()}`,
    '',
    '**Consensus summary**',
    payload.debate.consensusSummary,
    '',
    '**Top risks**',
    ...(topRisks.length > 0 ? topRisks.map(risk => `- ${risk}`) : ['- No unresolved risks reported.']),
    '',
    '**Recommended next actions**',
    ...(topActions.length > 0 ? topActions.map(action => `- ${action}`) : ['- No action items returned.']),
  ].join('\n');
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(request: Request) {
  const userSessionId = request.headers.get('user-session-id') ?? randomUUID();
  const headers = {
    ...corsHeaders(),
    'Content-Type': 'text/event-stream; charset=utf-8',
    Connection: 'keep-alive',
    'user-session-id': userSessionId,
  };

  const stream = new ReadableStream<Uint8Array>({
    start: async controller => {
      const encoder = new TextEncoder();
      const push = (payload: StoryAgentFrame) => {
        controller.enqueue(encoder.encode(encodeFrame(payload)));
      };

      try {
        const { searchParams } = new URL(request.url);
        const body = (await request.json()) as ChatInvokePayload;
        const prompt = (body.prompt ?? '').trim();

        const referenceNum = extractReference(prompt, searchParams.get('referenceNum'));
        if (!referenceNum) {
          push(frame('interrupt', {
            value: {
              type: 'missing_story_reference',
              request: 'Please provide a story reference like STORY-123 (or an Aha/Jira story URL).',
            },
          }));
          return;
        }

        const repoFullName = searchParams.get('repoFullName') ?? undefined;
        const targetBranch = searchParams.get('targetBranch') ?? undefined;
        const techStack = searchParams.get('techStack') ?? undefined;
        const testPolicy = searchParams.get('testPolicy') ?? undefined;
        const reviewers = searchParams.get('reviewers') ?? undefined;
        const executionMode =
          (searchParams.get('executionMode') === 'guided' ? 'guided' : 'autonomous') as 'autonomous' | 'guided';

        push(frame('request_ack', {
          content: `Received request for ${referenceNum}. Building Observation Lounge analysis...`,
        }));

        if (body.last_timestamp) {
          push(frame('plan_summary', {
            content: `Resume hint received from timestamp ${body.last_timestamp}.`,
          }));
        }

        const payload = await prepareObservationLoungePayload({
          referenceNum,
          repoFullName,
          targetBranch,
          techStack,
          testPolicy,
          reviewers,
          executionMode,
        });

        push(frame('plan_summary', {
          content: `Prepared crew mission plan with ${payload.missionPlan.crew.length} personas and ${payload.sharedMemories.length} shared memories.`,
        }));

        push(frame('final_result', {
          content: formatDebateSummary(payload),
          tools_called: ['prepareObservationLoungePayload'],
        }));
      } catch (error) {
        push(frame('error', {
          message: error instanceof Error ? error.message : 'Unknown stream error',
          source: 'chat-stream-adapter',
          type: 'server_error',
        }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers });
}
