import * as vscode from 'vscode';

// AhaStory type — inlined to avoid bundling @story-agent/shared
export interface AhaStory {
  id: string;
  referenceNum: string;
  name: string;
  description: string;
  acceptanceCriteria: string;
  url: string;
  workflowStatus: string;
}

function getConfig(): { domain: string; apiKey: string } {
  const cfg = vscode.workspace.getConfiguration('storyAgent');
  const domain =
    process.env.AHA_DOMAIN ??
    cfg.get<string>('ahaDomain') ??
    '';
  const apiKey =
    process.env.AHA_API_KEY ??
    cfg.get<string>('ahaApiKey') ??
    '';
  if (!domain || !apiKey) {
    throw new Error(
      'Aha credentials not configured. Set AHA_DOMAIN and AHA_API_KEY in your environment, ' +
      'or in VS Code settings under "Story Agent".'
    );
  }
  return { domain, apiKey };
}

export async function fetchAhaStory(
  referenceNum: string,
  token?: vscode.CancellationToken
): Promise<AhaStory> {
  const { domain, apiKey } = getConfig();
  const id = referenceNum.includes('/')
    ? referenceNum.split('/').pop()!
    : referenceNum;

  const controller = new AbortController();
  token?.onCancellationRequested(() => controller.abort());

  const res = await fetch(`https://${domain}/api/v1/features/${id}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    signal: controller.signal,
  });

  if (!res.ok) {
    throw new Error(`Aha API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const f = data.feature as Record<string, unknown>;

  const description =
    ((f.description as Record<string, unknown> | null)?.body as string) ?? '';

  const acceptanceCriteria = ((f.requirements as unknown[]) ?? [])
    .map((r: unknown) => {
      const req = r as Record<string, unknown>;
      return `- ${req.name}: ${
        (req.description as Record<string, unknown>)?.body ?? ''
      }`;
    })
    .join('\n');

  return {
    id: f.id as string,
    referenceNum: f.reference_num as string,
    name: f.name as string,
    description,
    acceptanceCriteria,
    url: f.url as string,
    workflowStatus:
      ((f.workflow_status as Record<string, unknown>)?.name as string) ??
      'unknown',
  };
}

export function isConfigured(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}
