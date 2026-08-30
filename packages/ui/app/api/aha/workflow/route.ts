import { NextResponse } from 'next/server';
import { getAhaSprintStories } from '@/lib/aha';

export const dynamic = 'force-dynamic';

type Raw = Record<string, unknown>;

type WorkflowComment = {
  body: string;
  createdAt: string | null;
  author: string;
};

type WorkflowRequirement = {
  referenceNum: string;
  name: string;
  workflowStatus: string;
  assigneeName: string | null;
  url: string;
  comments: WorkflowComment[];
};

type WorkflowStory = {
  referenceNum: string;
  name: string;
  workflowStatus: string;
  assigneeName: string | null;
  storyPoints: number | null;
  url: string;
  comments: WorkflowComment[];
  requirements: WorkflowRequirement[];
};

type WorkflowResponse = {
  releaseId: string;
  stories: WorkflowStory[];
  generatedAt: string;
};

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${env('AHA_API_KEY')}`,
    Accept: 'application/json',
  };
}

async function ahaGet(path: string): Promise<Raw> {
  const domain = env('AHA_DOMAIN');
  const key = env('AHA_API_KEY');
  if (!domain || !key) {
    throw new Error('AHA_DOMAIN and AHA_API_KEY must be configured for Aha workflow API');
  }
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const res = await fetch(`https://${domain}/api/v1/${path}`, {
      headers: headers(),
      cache: 'no-store',
    });
    if (res.ok) return res.json() as Promise<Raw>;

    const body = await res.text();
    if (res.status === 429 && attempt < maxAttempts) {
      const seconds = Number((body.match(/Try again in (\d+) seconds?/i)?.[1] ?? '1'));
      const delayMs = Math.max(250, Number.isFinite(seconds) ? seconds * 1000 : 1000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }
    throw new Error(`Aha API ${res.status} for ${path}: ${body}`);
  }

  throw new Error(`Aha API retry budget exceeded for ${path}`);
}

function mapComments(input: unknown, limit: number): WorkflowComment[] {
  const comments = Array.isArray(input) ? input : [];
  return comments
    .slice(0, limit)
    .map((c) => {
      const row = c as Raw;
      const body = String((row.body as Raw | undefined)?.body ?? row.body ?? '').trim();
      const author = String((row.user as Raw | undefined)?.name ?? (row.created_by_user as Raw | undefined)?.name ?? 'Unknown');
      const createdAt = typeof row.created_at === 'string' ? row.created_at : null;
      return { body, author, createdAt };
    })
    .filter((c) => c.body.length > 0);
}

async function loadStoryWorkflow(referenceNum: string, commentLimit: number): Promise<WorkflowStory> {
  const [featureData, commentsData, requirementsData] = await Promise.all([
    ahaGet(`features/${encodeURIComponent(referenceNum)}`),
    ahaGet(`features/${encodeURIComponent(referenceNum)}/comments?per_page=10`),
    ahaGet(`features/${encodeURIComponent(referenceNum)}/requirements?per_page=100`),
  ]);

  const feature = (featureData.feature as Raw | undefined) ?? {};
  const requirements = ((requirementsData.requirements as Raw[] | undefined) ?? []);

  const requirementRows: WorkflowRequirement[] = [];
  for (const req of requirements) {
    const reqRef = String(req.reference_num ?? req.id ?? '');
    if (!reqRef) continue;
    const reqCommentsData = await ahaGet(`requirements/${encodeURIComponent(reqRef)}/comments?per_page=6`);
    requirementRows.push({
      referenceNum: reqRef,
      name: String(req.name ?? 'Untitled task'),
      workflowStatus: String((req.workflow_status as Raw | undefined)?.name ?? 'unknown'),
      assigneeName: typeof (req.assigned_to_user as Raw | undefined)?.name === 'string'
        ? String((req.assigned_to_user as Raw).name)
        : null,
      url: String(req.url ?? ''),
      comments: mapComments(reqCommentsData.comments, commentLimit),
    });
  }

  return {
    referenceNum,
    name: String(feature.name ?? ''),
    workflowStatus: String((feature.workflow_status as Raw | undefined)?.name ?? 'unknown'),
    assigneeName: typeof (feature.assigned_to_user as Raw | undefined)?.name === 'string'
      ? String((feature.assigned_to_user as Raw).name)
      : null,
    storyPoints: typeof feature.score === 'number' ? feature.score : null,
    url: String(feature.url ?? ''),
    comments: mapComments(commentsData.comments, commentLimit),
    requirements: requirementRows,
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const releaseId = (searchParams.get('releaseId') ?? '').trim();
    if (!releaseId) {
      return NextResponse.json({ error: 'releaseId query parameter required' }, { status: 400 });
    }

    const commentLimit = Math.min(5, Math.max(1, Number(searchParams.get('commentLimit') ?? '3')));
    const sprintStories = await getAhaSprintStories(releaseId);
    const stories: WorkflowStory[] = [];
    for (const story of sprintStories) {
      stories.push(await loadStoryWorkflow(story.referenceNum, commentLimit));
    }

    const response: WorkflowResponse = {
      releaseId,
      stories,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to build Aha workflow view',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
