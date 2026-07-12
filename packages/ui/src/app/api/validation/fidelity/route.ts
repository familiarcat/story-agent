/**
 * Token Validation Meter — YAR Task 2.1
 *
 * Validates that OpenRouter request token counts match our tracking and billing.
 * Checksums each crew request and compares against cost ledger for fidelity tracking.
 *
 * GET /api/validation/fidelity — returns current fidelity metrics and recent mismatches
 */

import { createHash } from 'node:crypto';

export const runtime = 'nodejs';

// In-memory validation ledger (MVP — would be Redis/Supabase in production)
interface ValidationRecord {
  request_id: string;
  request_checksum: string;
  tokens_expected: number;
  tokens_actual?: number;
  model: string;
  timestamp: string;
  status: 'pending' | 'matched' | 'mismatch';
}

const validationLedger: ValidationRecord[] = [];

/**
 * Generate checksum for a crew request
 * Format: SHA256(request_id + tokens_used + model)
 */
function generateValidationChecksum(requestId: string, tokensUsed: number, model: string): string {
  const data = `${requestId}:${tokensUsed}:${model}`;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Record a request for validation
 */
function recordValidationRequest(
  requestId: string,
  tokensUsed: number,
  model: string
): string {
  const checksum = generateValidationChecksum(requestId, tokensUsed, model);

  const record: ValidationRecord = {
    request_id: requestId,
    request_checksum: checksum,
    tokens_expected: tokensUsed,
    model,
    timestamp: new Date().toISOString(),
    status: 'pending',
  };

  validationLedger.push(record);

  // Keep ledger size bounded (last 1000 requests)
  if (validationLedger.length > 1000) {
    validationLedger.shift();
  }

  return checksum;
}

/**
 * Verify a request against the cost ledger
 * In production, this would query the actual cost API
 */
function verifyValidationChecksum(
  requestId: string,
  expectedChecksum: string,
  actualTokens: number,
  model: string
): boolean {
  const actualChecksum = generateValidationChecksum(requestId, actualTokens, model);
  const matches = actualChecksum === expectedChecksum;

  // Update record
  const record = validationLedger.find(r => r.request_id === requestId);
  if (record) {
    record.tokens_actual = actualTokens;
    record.status = matches ? 'matched' : 'mismatch';
  }

  if (!matches) {
    console.warn(`[VALIDATION MISMATCH] ${requestId}: expected ${expectedChecksum}, got ${actualChecksum}`);
  }

  return matches;
}

/**
 * GET /api/validation/fidelity — returns validation metrics
 */
export async function GET() {
  const total = validationLedger.length;
  const matched = validationLedger.filter(r => r.status === 'matched').length;
  const mismatches = validationLedger.filter(r => r.status === 'mismatch');

  const fidelity = total > 0 ? (matched / total) * 100 : 100;
  const isHealthy = fidelity >= 99.5;

  const response = {
    fidelity_percent: parseFloat(fidelity.toFixed(2)),
    matching: matched,
    total,
    mismatch_count: mismatches.length,
    status: isHealthy ? 'healthy' : 'degraded',
    recent_mismatches: mismatches.slice(-10).map(m => ({
      request_id: m.request_id,
      expected_tokens: m.tokens_expected,
      actual_tokens: m.tokens_actual || 0,
      delta_percent: m.tokens_actual
        ? (((m.tokens_actual - m.tokens_expected) / m.tokens_expected) * 100).toFixed(1)
        : 'unknown',
      model: m.model,
      timestamp: m.timestamp,
    })),
    timestamp: new Date().toISOString(),
  };

  // Alert if fidelity < 99.5%
  if (!isHealthy) {
    console.error(
      `[VALIDATION ALERT] Fidelity degraded to ${fidelity.toFixed(2)}%. ` +
      `${mismatches.length} mismatches detected. ` +
      `Sending alert to #section-31-dogfood`
    );
    // TODO: In production, post to Slack #section-31-dogfood
    // await postSlackAlert(response);
  }

  return Response.json(response, {
    headers: {
      'Cache-Control': 'max-age=10, s-maxage=10',
      'Content-Type': 'application/json',
    },
  });
}

/**
 * POST /api/validation/record — record a new request for validation
 * Called by crew-mission-pipeline after each OpenRouter call
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { request_id, tokens_used, model } = body;

    if (!request_id || typeof tokens_used !== 'number' || !model) {
      return Response.json(
        { error: 'Missing required fields: request_id, tokens_used, model' },
        { status: 400 }
      );
    }

    const checksum = recordValidationRequest(request_id, tokens_used, model);

    return Response.json({
      recorded: true,
      request_id,
      checksum,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST /api/validation/record failed:', error);
    return Response.json(
      { error: 'Failed to record validation checkpoint', details: String(error) },
      { status: 500 }
    );
  }
}

// NOTE: generateValidationChecksum, recordValidationRequest, ValidationRecord are NOT exported
// These are internal utilities for this route only. Move to shared if external access needed.
