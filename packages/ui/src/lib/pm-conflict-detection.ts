/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Conflict Detection - Optimistic Concurrency Control
 * 
 * Implements version-based conflict detection for PM entities
 * Uses ETags (hash of entity data) to detect concurrent modifications
 */

import crypto from 'crypto';

/**
 * Generate ETag from entity data
 * ETag is a hash of the entity's content (excluding version/timestamp fields)
 */
export function generateETag(entity: any): string {
  const {
    version,
    etag,
    updated_at,
    created_at,
    ...content
  } = entity;

  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(content, Object.keys(content).sort()))
    .digest('hex');

  return hash;
}

/**
 * Increment version number
 */
export function incrementVersion(currentVersion: number | null): number {
  return (currentVersion ?? 0) + 1;
}

/**
 * Validate ETag match
 * Returns true if provided ETag matches entity's current ETag
 */
export function validateETag(entity: any, providedETag: string): boolean {
  const currentETag = generateETag(entity);
  return currentETag === providedETag;
}

/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
  hasConflict: boolean;
  currentVersion: number;
  expectedVersion: number;
  currentETag: string;
  expectedETag: string;
  message: string;
}

/**
 * Check for conflicts in entity update
 * Should be called before database update
 */
export function checkForConflict(
  current: any,
  expectedVersion?: number,
  expectedETag?: string
): ConflictDetectionResult {
  const currentVersion = current.version ?? 0;
  const currentETag = generateETag(current);

  // If version provided, check version match
  if (expectedVersion !== undefined) {
    if (expectedVersion !== currentVersion) {
      return {
        hasConflict: true,
        currentVersion,
        expectedVersion,
        currentETag,
        expectedETag: expectedETag ?? '',
        message: `Version conflict: expected v${expectedVersion}, got v${currentVersion}`,
      };
    }
  }

  // If ETag provided, check ETag match
  if (expectedETag !== undefined) {
    if (expectedETag !== currentETag) {
      return {
        hasConflict: true,
        currentVersion,
        expectedVersion: expectedVersion ?? 0,
        currentETag,
        expectedETag,
        message: `ETag mismatch: entity was modified by another process`,
      };
    }
  }

  return {
    hasConflict: false,
    currentVersion,
    expectedVersion: expectedVersion ?? 0,
    currentETag,
    expectedETag: expectedETag ?? '',
    message: 'No conflict',
  };
}

/**
 * Prepare entity for update with new version/ETag
 */
export function prepareForUpdate(entity: any): any {
  const nextVersion = incrementVersion(entity.version);
  const updatedEntity = {
    ...entity,
    version: nextVersion,
    updated_at: new Date().toISOString(),
  };
  const etag = generateETag(updatedEntity);
  
  return {
    ...updatedEntity,
    etag,
  };
}

/**
 * Extract version/ETag from request headers
 * Header format: "If-Match: version=1,etag=abc123"
 */
export function parseIfMatchHeader(ifMatchHeader?: string): {
  version?: number;
  etag?: string;
} {
  if (!ifMatchHeader) return {};

  const result: { version?: number; etag?: string } = {};

  // Parse version
  const versionMatch = ifMatchHeader.match(/version=(\d+)/);
  if (versionMatch) {
    result.version = parseInt(versionMatch[1], 10);
  }

  // Parse etag
  const etagMatch = ifMatchHeader.match(/etag=([a-f0-9]+)/);
  if (etagMatch) {
    result.etag = etagMatch[1];
  }

  return result;
}

/**
 * HTTP 409 Conflict response
 */
export function conflictResponse(conflict: ConflictDetectionResult): {
  status: number;
  body: any;
} {
  return {
    status: 409,
    body: {
      success: false,
      error: 'CONFLICT: Entity was modified by another process',
      conflict: {
        message: conflict.message,
        currentVersion: conflict.currentVersion,
        expectedVersion: conflict.expectedVersion,
        currentETag: conflict.currentETag,
        expectedETag: conflict.expectedETag,
      },
    },
  };
}
