export function resolveClientId(headers: Record<string, string | string[] | undefined>): string {
  // Case-insensitive lookup
  const rawValue = (headers['x-client-id'] || headers['X-Client-Id']) ?? '';
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

  // Default if empty/falsy
  if (!value?.trim()) return 'anonymous';

  // Slugify — and fall back to 'anonymous' if nothing survives (e.g. an all-symbol value).
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 64)
    .replace(/-+$/, ''); // re-trim if the 64-char cap left a trailing dash
  return slug || 'anonymous';
}
/**
 * Resolves a stable, safe client identifier from headers for the Commodore fabric's
 * per-client cost attribution and audit (phase 3). Defaults to 'anonymous' when
 * client is unidentified.
 */