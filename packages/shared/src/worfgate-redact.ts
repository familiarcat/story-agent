/**
 * WorfGate value-safe redaction — Worf owns it.
 *
 * Durable records (RAG governance records, audit rows, feedback cards) must never carry
 * credential-shaped material. This scrubs secret-shaped substrings from free text BEFORE it is
 * persisted. It is deliberately conservative: it over-masks rather than risk leaking a value.
 */

/** Ordered secret-shaped patterns. Each replaces the SECRET VALUE with a fixed marker. */
const SECRET_PATTERNS: Array<{ pattern: RegExp; replace: string }> = [
  // provider key formats (value itself is the secret)
  { pattern: /\bsk-[A-Za-z0-9_-]{16,}/g, replace: '[REDACTED]' },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{16,}/g, replace: '[REDACTED]' },
  { pattern: /\bAKIA[0-9A-Z]{16}\b/g, replace: '[REDACTED]' },
  { pattern: /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, replace: '[REDACTED]' },
  // Authorization: Bearer <token>
  { pattern: /\b(bearer|basic)\s+[A-Za-z0-9._~+\/=-]{12,}/gi, replace: '$1 [REDACTED]' },
  // credentials embedded in a URL: scheme://user:pass@host
  { pattern: /(\b[a-z][a-z0-9+.-]*:\/\/)[^\s:@\/]+:[^\s@\/]+@/gi, replace: '$1[REDACTED]@' },
  // KEY=value / "key": "value" where the KEY NAME looks sensitive
  { pattern: /\b([A-Za-z0-9_.-]*(?:key|token|secret|password|passwd|credential)[A-Za-z0-9_.-]*)(\s*[:=]\s*\"?)([^\s\"',;]{6,})/gi, replace: '$1$2[REDACTED]' },
];

/**
 * Redact credential-shaped material from free text. Never throws; non-string input returns ''.
 * Idempotent — redacting an already-redacted string returns it unchanged.
 */
export function redactSecrets(text: unknown): string {
  if (typeof text !== 'string' || !text) return '';
  let out = text;
  for (const { pattern, replace } of SECRET_PATTERNS) out = out.replace(pattern, replace);
  return out;
}