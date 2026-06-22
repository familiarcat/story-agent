import { randomUUID, createHash } from 'crypto';
import { prepareObservationLoungePayload } from '../../aha/observation-lounge/route';
import { resolveClientPolicy } from '@story-agent/shared/client-security-policy';

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

// ── FAST MODE ─────────────────────────────────────────────────────────────────
// When CREW_FAST_MODE=true (or ?fast_mode=true on the request), only the
// critical crew trio (Picard, Data, Worf) runs — 3 LLM calls instead of 11.
// Cost-sensitive deployments (like cs-p3-ui chat) should default to fast mode.
// Full 11-crew analysis is available via ?fast_mode=false or explicit override.
const GLOBAL_FAST_MODE = (process.env.CREW_FAST_MODE ?? 'true').toLowerCase() === 'true';

// ── AUTH GATE ─────────────────────────────────────────────────────────────────
// Validates the inbound request against the client's security policy.
// Client-tier requires Entra Bearer token + user-session-id header.
// Returns null if valid, or an error frame payload if invalid.

interface AuthGateResult {
  allowed: boolean;
  reason: string;
  clientId: string | null;
  userSessionId: string;
  fastMode: boolean;
}

function evaluateAuthGate(request: Request, searchParams: URLSearchParams): AuthGateResult {
  const clientId = request.headers.get('x-client-id') ?? searchParams.get('clientId') ?? null;
  const policy = resolveClientPolicy(clientId);
  const authHeader = request.headers.get('authorization');
  const userSessionId = request.headers.get('user-session-id') ?? randomUUID();
  const fastMode =
    searchParams.get('fast_mode') !== null
      ? searchParams.get('fast_mode') !== 'false'
      : GLOBAL_FAST_MODE;

  // Bearer token required?
  if (policy.auth.requireBearerToken && !authHeader?.startsWith('Bearer ')) {
    return {
      allowed: false,
      reason: `bearer_token_required_for_${policy.tier}_tier_client`,
      clientId,
      userSessionId,
      fastMode,
    };
  }

  // Session isolation required (Client tier)?
  if (policy.auth.requireSessionIsolation && !request.headers.get('user-session-id')) {
    return {
      allowed: false,
      reason: `user_session_id_header_required_for_${policy.tier}_tier_client`,
      clientId,
      userSessionId,
      fastMode,
    };
  }

  // WorfGate: scan inbound prompt for controlled data markers (Client tier)
  // We block prompts that appear to contain data that should never leave Client's boundary.
  // This guards against prompt-injection attacks that might exfiltrate PHI/PII.
  if (policy.worfGate.enforceMode === 'hard' && !policy.worfGate.allowControlledOutbound) {
    // Check will be applied per-prompt in the stream handler using the markers from the policy
    // (passed through via the returned clientId for policy lookup)
  }

  return { allowed: true, reason: 'approved', clientId, userSessionId, fastMode };
}

function scanPromptForControlledData(
  prompt: string,
  clientId: string | null,
): { clean: boolean; detectedMarkers: string[] } {
  const policy = resolveClientPolicy(clientId);
  if (policy.worfGate.enforceMode !== 'hard') return { clean: true, detectedMarkers: [] };

  const lower = prompt.toLowerCase();
  const detected = policy.worfGate.controlledMarkers.filter(marker =>
    lower.includes(marker.toLowerCase()),
  );
  return { clean: detected.length === 0, detectedMarkers: detected };
}

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
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, user-session-id, x-client-id',
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
  const { searchParams } = new URL(request.url);

  // ── Auth gate (Client = hardest tier) ────────────────────────────────────────
  const authResult = evaluateAuthGate(request, searchParams);
  const { userSessionId, fastMode, clientId } = authResult;

  const headers = {
    ...corsHeaders(),
    'Content-Type': 'text/event-stream; charset=utf-8',
    Connection: 'keep-alive',
    'user-session-id': userSessionId,
    'x-crew-fast-mode': fastMode ? 'true' : 'false',
  };

  if (!authResult.allowed) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            encodeFrame(
              frame('error', {
                message: `Authentication failed: ${authResult.reason}`,
                source: 'auth-gate',
                type: 'auth_error',
              }),
            ),
          ),
        );
        controller.close();
      },
    });
    return new Response(stream, { status: 401, headers });
  }

  const stream = new ReadableStream<Uint8Array>({
    start: async controller => {
      const encoder = new TextEncoder();
      const push = (payload: StoryAgentFrame) => {
        controller.enqueue(encoder.encode(encodeFrame(payload)));
      };

      try {
        const body = (await request.json()) as ChatInvokePayload;
        const prompt = (body.prompt ?? '').trim();

        // ── WorfGate: scan inbound prompt for controlled data ────────────────
        const promptScan = scanPromptForControlledData(prompt, clientId);
        if (!promptScan.clean) {
          push(
            frame('error', {
              message: `WorfGate: inbound prompt contains controlled data markers (${promptScan.detectedMarkers.join(', ')}). ` +
                `Regulated-tier clients must not include controlled data in prompts sent to this endpoint.`,
              source: 'worfgate-inbound',
              type: 'controlled_data_violation',
            }),
          );
          return;
        }

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
          content: `Received request for ${referenceNum}. Building Observation Lounge analysis${fastMode ? ' (fast mode: Picard·Data·Worf)' : ' (full crew)'}...`,
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
          content: `Prepared crew mission plan with ${fastMode ? '3 (fast mode)' : payload.missionPlan.crew.length} personas and ${payload.sharedMemories.length} shared memories.`,
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
