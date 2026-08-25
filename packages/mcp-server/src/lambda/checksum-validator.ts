/**
 * Lambda Checksum Validator Handler
 * Phase 2: Intercept Lambda invocation events and validate checksums
 * 
 * Usage: Attach as middleware to Lambda invocation path
 * Returns: Validation status (valid/invalid/unknown) + checksum metadata
 */

import { Context } from 'aws-lambda';
import { ClientSecurityPolicy, PolicyChecksum, lookupOrComputeChecksum } from '@story-agent/shared';

export interface ChecksumValidationRequest {
  policyId: string;
  policy: ClientSecurityPolicy;
}

export interface ChecksumValidationResponse {
  policyId: string;
  checksum: PolicyChecksum;
  checksumStatus: 'valid' | 'invalid' | 'unknown';
  timestamp: string;
  executionDuration: number; // milliseconds
}

export interface ChecksumValidationError {
  error: string;
  policyId?: string;
  timestamp: string;
}

/**
 * Lambda handler for checksum validation
 * Intercepts policy events and validates against stored checksums
 */
export async function validateChecksumHandler(
  event: ChecksumValidationRequest,
  context: Context
): Promise<ChecksumValidationResponse | ChecksumValidationError> {
  const startTime = Date.now();

  try {
    const { policyId, policy } = event;

    if (!policyId || !policy) {
      return {
        error: 'Missing required fields: policyId and policy',
        policyId,
        timestamp: new Date().toISOString(),
      };
    }

    // Lookup or compute checksum
    const result = await lookupOrComputeChecksum(policyId, policy);

    const executionDuration = Date.now() - startTime;

    return {
      policyId,
      checksum: result.checksum,
      checksumStatus: result.checksumStatus,
      timestamp: new Date().toISOString(),
      executionDuration,
    };
  } catch (err) {
    const executionDuration = Date.now() - startTime;
    console.error('[checksum-validator] Handler error:', err);

    return {
      error: err instanceof Error ? err.message : 'Unknown error',
      policyId: event?.policyId,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Recursive checksum validation for nested policies
 * Handles policy trees (e.g., client hierarchy)
 */
export async function validateChecksumsRecursive(
  policies: ChecksumValidationRequest[],
  context: Context
): Promise<ChecksumValidationResponse[]> {
  const results = await Promise.all(policies.map((req) => validateChecksumHandler(req, context)));

  return results.filter((r) => 'checksumStatus' in r) as ChecksumValidationResponse[];
}

/**
 * Event interceptor: Extract policy from Lambda event
 * Adapts various event formats (APIGateway, SQS, direct invoke)
 */
export function extractPolicyFromEvent(
  event: Record<string, unknown>
): ChecksumValidationRequest | null {
  // Direct invoke format
  if (event.policyId && event.policy) {
    return {
      policyId: event.policyId as string,
      policy: event.policy as ClientSecurityPolicy,
    };
  }

  // APIGateway body
  if (event.body && typeof event.body === 'string') {
    try {
      const parsed = JSON.parse(event.body);
      if (parsed.policyId && parsed.policy) {
        return {
          policyId: parsed.policyId as string,
          policy: parsed.policy as ClientSecurityPolicy,
        };
      }
    } catch {
      // Continue to next format
    }
  }

  // SQS Records
  if (Array.isArray(event.Records)) {
    const first = event.Records[0];
    if (first && typeof first.body === 'string') {
      try {
        const parsed = JSON.parse(first.body);
        if (parsed.policyId && parsed.policy) {
          return {
            policyId: parsed.policyId as string,
            policy: parsed.policy as ClientSecurityPolicy,
          };
        }
      } catch {
        // Continue
      }
    }
  }

  return null;
}
