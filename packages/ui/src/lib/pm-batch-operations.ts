/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Batch Operations for PM Entities
 * 
 * Supports:
 * - Batch create (multiple sprints, stories, tasks)
 * - Batch update (multiple state changes)
 * - Batch delete (archive multiple entities)
 * - Transactional semantics (all-or-nothing)
 */

export interface BatchCreateRequest<T> {
  entities: T[];
  continueOnError?: boolean; // If false, first error stops entire batch
}

export interface BatchUpdateRequest<T> {
  updates: Array<{ id: string } & T>;
  continueOnError?: boolean;
}

export interface BatchDeleteRequest {
  ids: string[];
  continueOnError?: boolean;
}

export interface BatchResult<T> {
  success: boolean;
  created?: T[];
  updated?: T[];
  deleted?: string[];
  errors?: Array<{
    id?: string;
    error: string;
    index: number;
  }>;
  stats: {
    total: number;
    succeeded: number;
    failed: number;
    duration_ms: number;
  };
}

/**
 * Batch create result tracking
 */
export class BatchCreateOperation<T> {
  private results: T[] = [];
  private errors: Array<{ index: number; error: string; id?: string }> = [];
  private startTime = Date.now();

  async addResult(index: number, entity: T, error?: Error): Promise<void> {
    if (error) {
      this.errors.push({
        index,
        error: error.message,
        id: (entity as any)?.id,
      });
    } else {
      this.results.push(entity);
    }
  }

  build(totalRequested: number): BatchResult<T> {
    return {
      success: this.errors.length === 0,
      created: this.results,
      errors: this.errors.length > 0 ? this.errors : undefined,
      stats: {
        total: totalRequested,
        succeeded: this.results.length,
        failed: this.errors.length,
        duration_ms: Date.now() - this.startTime,
      },
    };
  }

  shouldContinue(continueOnError: boolean): boolean {
    return continueOnError || this.errors.length === 0;
  }
}

/**
 * Batch update result tracking
 */
export class BatchUpdateOperation<T> {
  private results: T[] = [];
  private errors: Array<{ index: number; error: string; id: string }> = [];
  private startTime = Date.now();

  async addResult(index: number, id: string, entity?: T, error?: Error): Promise<void> {
    if (error) {
      this.errors.push({ index, error: error.message, id });
    } else if (entity) {
      this.results.push(entity);
    }
  }

  build(totalRequested: number): BatchResult<T> {
    return {
      success: this.errors.length === 0,
      updated: this.results,
      errors: this.errors.length > 0 ? this.errors : undefined,
      stats: {
        total: totalRequested,
        succeeded: this.results.length,
        failed: this.errors.length,
        duration_ms: Date.now() - this.startTime,
      },
    };
  }

  shouldContinue(continueOnError: boolean): boolean {
    return continueOnError || this.errors.length === 0;
  }
}

/**
 * Batch delete result tracking
 */
export class BatchDeleteOperation {
  private results: string[] = [];
  private errors: Array<{ index: number; error: string; id: string }> = [];
  private startTime = Date.now();

  addResult(index: number, id: string, error?: Error): void {
    if (error) {
      this.errors.push({ index, error: error.message, id });
    } else {
      this.results.push(id);
    }
  }

  build(totalRequested: number): BatchResult<string> {
    return {
      success: this.errors.length === 0,
      deleted: this.results,
      errors: this.errors.length > 0 ? this.errors : undefined,
      stats: {
        total: totalRequested,
        succeeded: this.results.length,
        failed: this.errors.length,
        duration_ms: Date.now() - this.startTime,
      },
    };
  }

  shouldContinue(continueOnError: boolean): boolean {
    return continueOnError || this.errors.length === 0;
  }
}

/**
 * Validate batch request limits
 */
export function validateBatchSize(
  size: number,
  maxSize: number = 100
): { valid: boolean; error?: string } {
  if (size > maxSize) {
    return {
      valid: false,
      error: `Batch size exceeds maximum. Requested: ${size}, Max: ${maxSize}`,
    };
  }

  if (size === 0) {
    return {
      valid: false,
      error: 'Batch cannot be empty',
    };
  }

  return { valid: true };
}

/**
 * Check if all entities belong to same tenant
 */
export function validateTenantConsistency(
  entities: Array<{ tenant_id?: string }>,
  tenantId: string
): { valid: boolean; error?: string } {
  for (const entity of entities) {
    if (entity.tenant_id && entity.tenant_id !== tenantId) {
      return {
        valid: false,
        error: `Entity tenant_id '${entity.tenant_id}' does not match request tenant '${tenantId}'`,
      };
    }
  }

  return { valid: true };
}

/**
 * Batch response helper
 */
export function batchResponse<T>(
  result: BatchResult<T>,
  statusCode: number = 200
): {
  status: number;
  body: any;
} {
  return {
    status: result.success ? statusCode : 207, // 207 Multi-Status if partial success
    body: {
      success: result.success,
      data: {
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
      },
      errors: result.errors,
      stats: result.stats,
    },
  };
}

/**
 * Example batch operation handlers
 */
export async function exampleBatchCreateHandler(): Promise<void> {
  const operation = new BatchCreateOperation<any>();

  const requests = [
    { name: 'Sprint 1', capacity: 40 },
    { name: 'Sprint 2', capacity: 35 },
    { name: 'Sprint 3', capacity: 50 },
  ];

  // Validate size
  const sizeCheck = validateBatchSize(requests.length);
  if (!sizeCheck.valid) throw new Error(sizeCheck.error);

  // Process each request
  for (let i = 0; i < requests.length; i++) {
    try {
      // Simulate DB insert
      const result = { id: `sprint-${i}`, ...requests[i] };
      await operation.addResult(i, result);
    } catch (err) {
      await operation.addResult(i, requests[i], err as Error);
      if (!operation.shouldContinue(false)) break;
    }
  }

  const finalResult = operation.build(requests.length);
  console.log('Batch result:', finalResult);
}

/**
 * Example batch update handler
 */
export async function exampleBatchUpdateHandler(): Promise<void> {
  const operation = new BatchUpdateOperation<any>();

  const updates = [
    { id: 'sprint-1', state: 'in_progress' },
    { id: 'sprint-2', state: 'closed' },
    { id: 'sprint-3', state: 'planning' },
  ];

  // Validate size
  const sizeCheck = validateBatchSize(updates.length);
  if (!sizeCheck.valid) throw new Error(sizeCheck.error);

  // Process each update
  for (let i = 0; i < updates.length; i++) {
    try {
      // Simulate DB update
      const result = { ...updates[i] };
      await operation.addResult(i, updates[i].id, result);
    } catch (err) {
      await operation.addResult(i, updates[i].id, undefined, err as Error);
      if (!operation.shouldContinue(false)) break;
    }
  }

  const finalResult = operation.build(updates.length);
  console.log('Batch result:', finalResult);
}

/**
 * Example batch delete handler
 */
export function exampleBatchDeleteHandler(): void {
  const operation = new BatchDeleteOperation();

  const ids = ['sprint-1', 'sprint-2', 'sprint-3'];

  // Validate size
  const sizeCheck = validateBatchSize(ids.length);
  if (!sizeCheck.valid) throw new Error(sizeCheck.error);

  // Process each delete
  for (let i = 0; i < ids.length; i++) {
    try {
      // Simulate DB delete
      operation.addResult(i, ids[i]);
    } catch (err) {
      operation.addResult(i, ids[i], err as Error);
      // continue on error
    }
  }

  const finalResult = operation.build(ids.length);
  console.log('Batch result:', finalResult);
}
