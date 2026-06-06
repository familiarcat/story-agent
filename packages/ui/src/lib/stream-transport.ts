export type StoryAgentFrame =
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

export interface StreamInvokePayload {
  prompt: string;
  resume_value?: unknown;
  last_timestamp?: string | null;
}

export type StreamRequestArgs = {
  url: string;
  payload: StreamInvokePayload;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  heartbeatTimeoutMs?: number;
};

export async function* streamFrames(args: StreamRequestArgs): AsyncGenerator<StoryAgentFrame, void, void> {
  const heartbeatController = new AbortController();
  const heartbeatTimeoutMs = args.heartbeatTimeoutMs ?? 15000;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const resetTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      heartbeatController.abort(new Error('Connection stale - no frame data received'));
    }, heartbeatTimeoutMs);
  };

  const combinedSignal = args.signal
    ? AbortSignal.any([args.signal, heartbeatController.signal])
    : heartbeatController.signal;

  const response = await fetch(args.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json',
      ...(args.headers ?? {}),
    },
    body: JSON.stringify(args.payload),
    signal: combinedSignal,
  });

  if (!response.ok) {
    const text = await safeReadText(response);
    throw new Error(`Stream request failed (${response.status}): ${text || response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Stream response had no body.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      resetTimeout();
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith(': heartbeat')) continue;

        const jsonText = line.startsWith('data:') ? line.slice(5).trim() : line;
        const parsed = parseFrame(jsonText);
        if (parsed) yield parsed;
      }
    }

    const tail = buffer.trim();
    if (tail) {
      const jsonText = tail.startsWith('data:') ? tail.slice(5).trim() : tail;
      const parsed = parseFrame(jsonText);
      if (parsed) yield parsed;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError' && heartbeatController.signal.aborted) {
      const reason = heartbeatController.signal.reason;
      if (reason instanceof Error) throw reason;
      throw new Error('Connection stale - no frame data received');
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function parseFrame(text: string): StoryAgentFrame | null {
  try {
    let parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }

    if (!parsed || typeof parsed !== 'object') return null;
    const frame = parsed as Record<string, unknown>;
    if (typeof frame.type !== 'string' || typeof frame.ts !== 'string' || !frame.data || typeof frame.data !== 'object') {
      return null;
    }

    const v = typeof frame.v === 'number' ? frame.v : 1;
    const ts = frame.ts;
    const data = frame.data as Record<string, unknown>;

    switch (frame.type) {
      case 'request_ack':
      case 'plan_summary': {
        if (typeof data.content !== 'string') return null;
        return { v, type: frame.type, data: { content: data.content }, ts };
      }
      case 'final_result': {
        if (typeof data.content !== 'string') return null;
        const toolsCalled = Array.isArray(data.tools_called)
          ? data.tools_called.filter(item => typeof item === 'string') as string[]
          : undefined;
        return { v, type: 'final_result', data: { content: data.content, ...(toolsCalled ? { tools_called: toolsCalled } : {}) }, ts };
      }
      case 'crew_finding': {
        if (typeof data.crewId !== 'string' || typeof data.summary !== 'string' || typeof data.confidence !== 'number') {
          return null;
        }
        return {
          v,
          type: 'crew_finding',
          data: { crewId: data.crewId, summary: data.summary, confidence: data.confidence },
          ts,
        };
      }
      case 'interrupt':
        return { v, type: 'interrupt', data: { value: (data as { value?: unknown }).value }, ts };
      case 'error': {
        if (typeof data.message !== 'string' || typeof data.source !== 'string' || typeof data.type !== 'string') {
          return null;
        }
        return {
          v,
          type: 'error',
          data: { message: data.message, source: data.source, type: data.type },
          ts,
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export function buildResumePayload(prompt: string, resumeValue: unknown, lastTimestamp?: string | null): StreamInvokePayload {
  return {
    prompt,
    ...(resumeValue !== undefined ? { resume_value: resumeValue } : {}),
    ...(lastTimestamp ? { last_timestamp: lastTimestamp } : {}),
  };
}
