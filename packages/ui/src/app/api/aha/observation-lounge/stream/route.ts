import { NextResponse } from 'next/server';
import { prepareObservationLoungePayload } from '../route';

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
      type: 'crew_finding';
      data: { crewId: string; summary: string; confidence: number };
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

type StreamInvokePayload = {
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

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const referenceNum = searchParams.get('referenceNum');
    if (!referenceNum) {
      return NextResponse.json({ error: 'referenceNum query parameter required' }, { status: 400 });
    }

    const repoFullName = searchParams.get('repoFullName') ?? undefined;
    const targetBranch = searchParams.get('targetBranch') ?? undefined;
    const techStack = searchParams.get('techStack') ?? undefined;
    const testPolicy = searchParams.get('testPolicy') ?? undefined;
    const reviewers = searchParams.get('reviewers') ?? undefined;
    const executionMode = (searchParams.get('executionMode') === 'guided' ? 'guided' : 'autonomous') as 'autonomous' | 'guided';

    let body: StreamInvokePayload | null = null;
    try {
      body = (await request.json()) as StreamInvokePayload;
    } catch {
      body = null;
    }

    const stream = new ReadableStream<Uint8Array>({
      start: async controller => {
        const encoder = new TextEncoder();
        const push = (payload: StoryAgentFrame) => {
          controller.enqueue(encoder.encode(encodeFrame(payload)));
        };

        try {
          push(frame('request_ack', {
            content: `Preparing Observation Lounge payload for ${referenceNum}...`,
          }));

          if (body?.last_timestamp) {
            push(frame('plan_summary', {
              content: `Resume requested from timestamp ${body.last_timestamp}`,
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
            content: `Crew plan generated with ${payload.missionPlan.crew.length} participants and ${payload.sharedMemories.length} prior memories.`,
          }));

          push(frame('final_result', {
            content: JSON.stringify(payload),
            tools_called: ['prepareObservationLoungePayload'],
          }));
        } catch (error) {
          push(frame('error', {
            message: error instanceof Error ? error.message : 'Unknown stream error',
            source: 'observation-lounge-stream',
            type: 'server_error',
          }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to stream observation lounge payload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
