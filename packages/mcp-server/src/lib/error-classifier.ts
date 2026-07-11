/**
 * Error Taxonomy & Classification — YAR Task 2.2
 *
 * Classifies errors from crew operations into meaningful categories for monitoring.
 * Categories: Crew Infra Down, Token Validation Fail, User-Facing Regression, Transient Network
 */

export type ErrorCategory =
  | 'crew_infra_down'
  | 'token_validation_fail'
  | 'user_facing_regression'
  | 'transient_network'
  | 'unknown';

export type ErrorSeverity = 'critical' | 'warning' | 'info';

export interface ClassifiedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  request_id?: string;
}

/**
 * Classify an error based on response code, latency, and message content
 *
 * Logic:
 *   - Timeout (>10s) or 503/connection_refused → Crew Infra Down
 *   - Token mismatch detected or checksum failure → Token Validation Fail
 *   - 400/422 with known user-facing error text → User-Facing Regression
 *   - Connection timeout <5s or 429 rate limit → Transient Network
 *   - Anything else → Unknown
 */
export function classifyError(
  response: any,
  latencyMs: number,
  message: string,
  requestId?: string
): ClassifiedError {
  const timestamp = new Date().toISOString();

  // Crew Infra Down: timeouts, 503, connection refused
  if (
    latencyMs > 10000 ||
    response?.status === 503 ||
    response?.status === 504 ||
    message?.includes('connection refused') ||
    message?.includes('ECONNREFUSED') ||
    message?.includes('timed out')
  ) {
    return {
      category: 'crew_infra_down',
      severity: 'critical',
      message: `Crew infrastructure down (latency ${latencyMs}ms, status ${response?.status})`,
      details: {
        latency_ms: latencyMs,
        http_status: response?.status,
        error_message: message,
        request_id: requestId,
      },
      timestamp,
      request_id: requestId,
    };
  }

  // Token Validation Fail: token mismatch, checksum failure
  if (
    message?.includes('token') && message?.includes('mismatch') ||
    message?.includes('checksum') ||
    message?.includes('fidelity')
  ) {
    return {
      category: 'token_validation_fail',
      severity: 'warning',
      message: `Token validation failure (${message})`,
      details: {
        error_message: message,
        request_id: requestId,
      },
      timestamp,
      request_id: requestId,
    };
  }

  // User-Facing Regression: 400/422 with known error text
  if (
    (response?.status === 400 || response?.status === 422) &&
    (message?.includes('invalid') ||
      message?.includes('schema') ||
      message?.includes('validation') ||
      message?.includes('unprocessable') ||
      message?.includes('malformed'))
  ) {
    return {
      category: 'user_facing_regression',
      severity: 'warning',
      message: `User-facing API error: ${message}`,
      details: {
        http_status: response?.status,
        error_message: message,
        request_id: requestId,
      },
      timestamp,
      request_id: requestId,
    };
  }

  // Transient Network: quick timeouts, rate limits
  if (
    (latencyMs < 5000 && message?.includes('timeout')) ||
    response?.status === 429 ||
    message?.includes('rate limit') ||
    message?.includes('ECONNRESET') ||
    message?.includes('ETIMEDOUT')
  ) {
    return {
      category: 'transient_network',
      severity: 'info',
      message: `Transient network error (will retry)`,
      details: {
        latency_ms: latencyMs,
        http_status: response?.status,
        error_message: message,
        request_id: requestId,
      },
      timestamp,
      request_id: requestId,
    };
  }

  // Unknown: doesn't match any category
  return {
    category: 'unknown',
    severity: 'info',
    message: `Unclassified error: ${message}`,
    details: {
      latency_ms: latencyMs,
      http_status: response?.status,
      error_message: message,
      request_id: requestId,
    },
    timestamp,
    request_id: requestId,
  };
}

/**
 * Log a classified error to telemetry sink
 * In production, this would POST to /api/telemetry/error
 */
export async function logClassifiedError(error: ClassifiedError): Promise<void> {
  console.log(`[ERROR:${error.category.toUpperCase()}] ${error.message}`, error.details);

  try {
    // TODO: In production, post to telemetry sink
    // await fetch('/api/telemetry/error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(error),
    // });
  } catch (e) {
    console.error('Failed to log classified error:', e);
  }
}

/**
 * GET /api/error-taxonomy — returns error classification stats
 * Used by dashboard for error breakdown visualization
 */
export async function GET(): Promise<Response> {
  // TODO: In production, query actual error logs
  // For MVP, return mock breakdown
  const mockBreakdown = {
    crew_infra_down: { count: 2, percent: 5.7 },
    token_validation_fail: { count: 0, percent: 0 },
    user_facing_regression: { count: 5, percent: 14.3 },
    transient_network: { count: 12, percent: 34.3 },
    unknown: { count: 16, percent: 45.7 },
    total_errors: 35,
    timestamp: new Date().toISOString(),
  };

  return Response.json(mockBreakdown, {
    headers: {
      'Cache-Control': 'max-age=60, s-maxage=60',
      'Content-Type': 'application/json',
    },
  });
}
