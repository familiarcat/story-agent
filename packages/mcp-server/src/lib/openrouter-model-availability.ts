import { MODEL_POOL, quarkSelectModel, type PoolModel } from './crew-team-assembly.js';

const OR_URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const OR_KEY = process.env.CREW_LLM_APPROVED_KEY || '';
const AVAILABILITY_TTL_MS = Number(process.env.OPENROUTER_MODELS_TTL_MS || 300000);
const UNAVAILABLE_TTL_MS = Number(process.env.OPENROUTER_UNAVAILABLE_TTL_MS || 600000);

let cachedAvailableIds: Set<string> | null = null;
let cacheExpiresAt = 0;
const temporarilyUnavailable = new Map<string, number>();

function nowMs(): number {
  return Date.now();
}

function isTemporarilyUnavailable(modelId: string): boolean {
  const until = temporarilyUnavailable.get(modelId);
  if (!until) return false;
  if (until <= nowMs()) {
    temporarilyUnavailable.delete(modelId);
    return false;
  }
  return true;
}

export function markModelTemporarilyUnavailable(modelId: string, ttlMs = UNAVAILABLE_TTL_MS): void {
  temporarilyUnavailable.set(modelId, nowMs() + Math.max(30000, ttlMs));
}

export function isLikelyModelAvailabilityError(status: number, errorText?: string): boolean {
  if (status === 404 || status === 410 || status === 429 || status === 503) return true;
  if (status < 400) return false;
  const t = String(errorText ?? '').toLowerCase();
  return (
    t.includes('model') && (
      t.includes('not found') ||
      t.includes('does not exist') ||
      t.includes('unavailable') ||
      t.includes('disabled') ||
      t.includes('decommissioned') ||
      t.includes('insufficient credits') ||
      t.includes('quota')
    )
  );
}

async function fetchAvailableModelIds(): Promise<Set<string> | null> {
  if (!OR_KEY) return null;
  try {
    const resp = await fetch(`${OR_URL}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${OR_KEY}` },
    });
    if (!resp.ok) return null;
    const body: any = await resp.json();
    const ids = new Set<string>();
    for (const item of body?.data ?? []) {
      if (typeof item?.id === 'string' && item.id.trim()) ids.add(item.id.trim());
    }
    return ids.size > 0 ? ids : null;
  } catch {
    return null;
  }
}

export async function getAvailableModelIds(forceRefresh = false): Promise<Set<string> | null> {
  if (!forceRefresh && cachedAvailableIds && cacheExpiresAt > nowMs()) {
    return cachedAvailableIds;
  }
  const fresh = await fetchAvailableModelIds();
  if (fresh) {
    cachedAvailableIds = fresh;
    cacheExpiresAt = nowMs() + AVAILABILITY_TTL_MS;
    return fresh;
  }
  return cachedAvailableIds;
}

function sortedEligible(capabilityTier: number, opts?: { requireVision?: boolean }): PoolModel[] {
  const blended = (m: PoolModel) => m.costIn + m.costOut;
  return MODEL_POOL
    .filter((m) => m.tier >= capabilityTier && !m.visionOnly && (!opts?.requireVision || m.supportsVision))
    .sort((a, b) => blended(a) - blended(b));
}

export async function quarkSelectAvailableModel(
  capabilityTier: number,
  opts?: { preferredModelId?: string; excludeModelIds?: string[]; requireVision?: boolean }
): Promise<PoolModel> {
  const exclude = new Set(opts?.excludeModelIds ?? []);
  const candidates = sortedEligible(capabilityTier, { requireVision: opts?.requireVision }).filter((m) => !exclude.has(m.id) && !isTemporarilyUnavailable(m.id));
  if (candidates.length === 0) {
    if (opts?.requireVision) {
      const visionFallback = MODEL_POOL
        .filter((m) => m.tier >= capabilityTier && !m.visionOnly && m.supportsVision)
        .sort((a, b) => (a.costIn + a.costOut) - (b.costIn + b.costOut))[0];
      if (visionFallback) return visionFallback;
    }
    return quarkSelectModel(capabilityTier);
  }

  if (opts?.preferredModelId) {
    const preferred = candidates.find((m) => m.id === opts.preferredModelId);
    if (preferred) return preferred;
  }

  const availableIds = await getAvailableModelIds();
  if (availableIds) {
    const matched = candidates.find((m) => availableIds.has(m.id));
    if (matched) return matched;
  }

  return candidates[0];
}
