import { getStory } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildClientAccessContext,
  evaluateControlledDataAccess,
  inferClientIdFromStory,
} from '@story-agent/shared';

type StoryDetailsResponse = {
  story: {
    id: string;
    ref: string;
    title: string;
    description: string;
    acceptanceCriteria: string[];
    points: number;
    status: string;
    assignee: string;
    dueDate: string;
    repository: string;
    branchName: string;
    prNumber?: number;
    cicdStatus: 'pending' | 'running' | 'passed' | 'failed';
    testCoverage: number;
  };
  controlled: null | {
    storyUrl: string;
    prUrl: string | null;
    notes: string | null;
  };
  policy: {
    controlledDataAccess: 'authorized' | 'advisory_downgrade';
    reason: string;
    audit: unknown;
  };
};

function splitAcceptanceCriteria(raw: string | null): string[] {
  if (!raw) return ['Acceptance criteria pending refinement.'];

  const lines = raw
    .split(/\r?\n/)
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : ['Acceptance criteria pending refinement.'];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  // Client isolation: scope the lookup to the requesting client (firm root by default).
  const selectedClientId = request.headers.get('x-client-id');
  const record = await getStory(decodeURIComponent(storyId), selectedClientId ?? 'familiarcat');
  if (!record) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  const includeControlled = request.nextUrl.searchParams.get('includeControlled') === 'true';
  const context = buildClientAccessContext({
    selectedClientId,
    clientRole: request.headers.get('x-client-role'),
    purpose: request.headers.get('x-controlled-data-purpose'),
    includeControlled,
  });

  const decision = evaluateControlledDataAccess({
    context,
    requestedClientId: inferClientIdFromStory(record),
  });

  const response: StoryDetailsResponse = {
    story: {
      id: record.id,
      ref: record.storyId,
      title: record.storyTitle,
      description: record.notes ?? 'No additional description provided.',
      acceptanceCriteria: splitAcceptanceCriteria(record.notes),
      points: 0,
      status: record.status,
      assignee: 'Unassigned',
      dueDate: 'TBD',
      repository: decision.allowed ? record.repoFullName : '[restricted until client scope is authorized]',
      branchName: decision.allowed ? record.branch : '[restricted]',
      prNumber: record.prNumber ?? undefined,
      cicdStatus: 'pending',
      testCoverage: 0,
    },
    controlled: decision.allowed
      ? {
          storyUrl: record.storyUrl,
          prUrl: record.prUrl,
          notes: record.notes,
        }
      : null,
    policy: {
      controlledDataAccess: decision.mode,
      reason: decision.reason,
      audit: decision.audit,
    },
  };

  process.stderr.write(`[CLIENT_SCOPE] /api/stories/${record.storyId} ${decision.audit.outcome} (${decision.reason})\n`);

  return NextResponse.json(response);
}
