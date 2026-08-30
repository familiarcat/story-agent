/**
 * diagnostics.ts — Append-only JSON logging for MCP observability
 *
 * Logs all MCP endpoint access with latency, status, and fallback behavior.
 * Location: ~/.claude/mcp-diagnostics.jsonl (append-only, one JSON object per line)
 * Security: Zero secrets ever — filters SUPABASE_KEY, GITHUB_TOKEN, AHA_API_KEY from all fields
 *
 * Called from agentClient.ts after every fetchWithTimeout() or fetchWithMetrics() call.
 *
 * Schema:
 * {
 *   timestamp: string (ISO 8601),
 *   endpoint: string ("local" | "cloud" | "unknown"),
 *   latency_ms: number,
 *   crew_member?: string (optional, e.g., "Data"),
 *   status: "success" | "timeout" | "unavailable" | "error",
 *   fallback_reason?: string (e.g., "timeout", "no-response"),
 *   retry_endpoint?: string (e.g., "cloud")
 * }
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * DiagnosticEntry — structured log entry for MCP observability
 */
export interface DiagnosticEntry {
  timestamp: string; // ISO 8601
  endpoint: 'local' | 'cloud' | 'unknown';
  latency_ms: number; // measured round-trip
  crew_member?: string; // optional, e.g., "Data"
  status: 'success' | 'timeout' | 'unavailable' | 'error';
  fallback_reason?: string; // why fallback triggered (e.g., "timeout", "no-response")
  retry_endpoint?: string; // what was retried (e.g., "cloud")
}

/**
 * List of secret environment variable names to filter
 */
const SECRET_ENV_VARS = [
  'SUPABASE_KEY',
  'GITHUB_TOKEN',
  'AHA_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENROUTER_API_KEY'
];

/**
 * Check if a value contains any secrets
 */
function containsSecrets(value: any): boolean {
  if (typeof value !== 'string') return false;
  const valueStr = value.toLowerCase();
  return SECRET_ENV_VARS.some(
    secretName =>
      valueStr.includes(secretName.toLowerCase()) ||
      valueStr.includes('sk_') ||
      valueStr.includes('sk-') ||
      valueStr.includes('token') ||
      valueStr.includes('key_') ||
      valueStr.match(/[a-z0-9]{40,}/) // Long base64/hex strings
  );
}

/**
 * Filter secrets from any object recursively
 */
function filterSecrets(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => filterSecrets(item));
  }

  const filtered: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip secret env var keys entirely
    if (SECRET_ENV_VARS.includes(key)) {
      continue;
    }

    // Check if value contains secrets
    if (containsSecrets(value)) {
      filtered[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      filtered[key] = filterSecrets(value);
    } else {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * Record a diagnostic entry to ~/.claude/mcp-diagnostics.jsonl
 *
 * Async-safe: uses fs.appendFile() with callback (no blocking I/O).
 * Never logs secrets: filters SUPABASE_KEY, GITHUB_TOKEN, AHA_API_KEY.
 *
 * @param entry DiagnosticEntry to log
 */
export function recordDiagnostic(entry: DiagnosticEntry): void {
  // Ensure all required fields are present
  if (!entry.timestamp || !entry.endpoint || typeof entry.latency_ms !== 'number') {
    console.warn('[Diagnostics] Skipping invalid entry:', entry);
    return;
  }

  // Filter secrets from the entry
  const filteredEntry = filterSecrets(entry);

  // Construct log entry
  const logLine = JSON.stringify(filteredEntry) + '\n';

  // Append to ~/.claude/mcp-diagnostics.jsonl (async, non-blocking)
  const logPath = path.join(os.homedir(), '.claude', 'mcp-diagnostics.jsonl');

  // Ensure ~/.claude directory exists
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Append to file (async, no blocking)
  fs.appendFile(logPath, logLine, (err) => {
    if (err) {
      console.error(`[Diagnostics] Failed to write to ${logPath}:`, err.message);
    }
  });
}

/**
 * Helper: Log a successful MCP call
 */
export function recordSuccess(
  endpoint: 'local' | 'cloud' | 'unknown',
  latencyMs: number,
  crewMember?: string
): void {
  recordDiagnostic({
    timestamp: new Date().toISOString(),
    endpoint,
    latency_ms: latencyMs,
    crew_member: crewMember,
    status: 'success'
  });
}

/**
 * Helper: Log a timeout with fallback
 */
export function recordTimeout(
  endpoint: 'local' | 'cloud' | 'unknown',
  retryEndpoint?: string,
  latencyMs: number = 5000,
  crewMember?: string
): void {
  recordDiagnostic({
    timestamp: new Date().toISOString(),
    endpoint,
    latency_ms: latencyMs,
    crew_member: crewMember,
    status: 'timeout',
    fallback_reason: 'timeout',
    retry_endpoint: retryEndpoint
  });
}

/**
 * Helper: Log unavailable server
 */
export function recordUnavailable(
  endpoint: 'local' | 'cloud' | 'unknown',
  reason: string = 'no-response',
  crewMember?: string
): void {
  recordDiagnostic({
    timestamp: new Date().toISOString(),
    endpoint,
    latency_ms: 0,
    crew_member: crewMember,
    status: 'unavailable',
    fallback_reason: reason
  });
}

/**
 * Helper: Log error
 */
export function recordError(
  endpoint: 'local' | 'cloud' | 'unknown',
  errorMessage: string,
  latencyMs: number = 0,
  crewMember?: string
): void {
  recordDiagnostic({
    timestamp: new Date().toISOString(),
    endpoint,
    latency_ms: latencyMs,
    crew_member: crewMember,
    status: 'error',
    fallback_reason: errorMessage
  });
}

/**
 * Helper: Read recent diagnostics (for debugging)
 * @param lines Number of lines to read from end
 * @returns Array of DiagnosticEntry objects
 */
export function readRecentDiagnostics(lines: number = 20): DiagnosticEntry[] {
  const logPath = path.join(os.homedir(), '.claude', 'mcp-diagnostics.jsonl');

  if (!fs.existsSync(logPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(logPath, 'utf-8');
    const entries = content
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(-lines)
      .map(line => {
        try {
          return JSON.parse(line) as DiagnosticEntry;
        } catch (e) {
          console.error('[Diagnostics] Failed to parse line:', line);
          return null;
        }
      })
      .filter(e => e !== null) as DiagnosticEntry[];

    return entries;
  } catch (err) {
    console.error('[Diagnostics] Failed to read log:', err);
    return [];
  }
}
