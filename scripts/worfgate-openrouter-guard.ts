import 'dotenv/config';

type AuthKeyResponse = {
  data?: {
    label?: string;
    usage?: number;
    limit?: number | null;
    is_free_tier?: boolean;
  };
};

type CreditsResponse = {
  data?: {
    total_credits?: number;
    total_usage?: number;
    total_credits_used?: number | null;
  };
};

const BASE_URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const KEY = (process.env.CREW_LLM_APPROVED_KEY || process.env.OPENROUTER_API_KEY || '').trim();
const TIMEOUT_MS = Math.max(5000, Number(process.env.OPENROUTER_GUARD_TIMEOUT_MS || 12000));
const MIN_AVAILABLE_CREDITS = Math.max(0, Number(process.env.OPENROUTER_MIN_AVAILABLE_CREDITS || 1));

async function fetchJson<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${path} returned ${res.status}: ${body.slice(0, 240)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function toNum(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

async function main() {
  if (!KEY) {
    throw new Error('CREW_LLM_APPROVED_KEY/OPENROUTER_API_KEY is not set; cannot enforce OpenRouter-first policy');
  }

  const [auth, credits] = await Promise.all([
    fetchJson<AuthKeyResponse>('/auth/key'),
    fetchJson<CreditsResponse>('/credits'),
  ]);

  const label = auth.data?.label || '(unknown key)';
  const usage = toNum(auth.data?.usage);
  const limit = auth.data?.limit;
  const totalCredits = toNum(credits.data?.total_credits);
  const totalUsage = toNum(credits.data?.total_usage);
  const available = Math.max(0, totalCredits - totalUsage);

  console.log('== OpenRouter Guard ==');
  console.log(`Key: ${label}`);
  console.log(`Key usage: ${usage.toFixed(6)} | Key limit: ${limit == null ? 'none' : String(limit)}`);
  console.log(`Credits total: ${totalCredits.toFixed(4)} | usage: ${totalUsage.toFixed(4)} | available: ${available.toFixed(4)}`);

  if (available < MIN_AVAILABLE_CREDITS) {
    throw new Error(`available OpenRouter credits ${available.toFixed(4)} is below required minimum ${MIN_AVAILABLE_CREDITS.toFixed(4)}`);
  }

  console.log('OpenRouter guard passed.');
}

main().catch((err) => {
  console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
