/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Batch API Routes for Tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTask, updateTask, deleteTask } from '@/lib/pm-db';
import { BatchCreateOperation, BatchUpdateOperation, BatchDeleteOperation, validateBatchSize, batchResponse } from '@/lib/pm-batch-operations';
import type { Task } from '@story-agent/shared/pm-contracts';

/**
 * POST /api/tasks/batch
 * Create, update, or delete multiple tasks in a single request
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const userId = request.headers.get('x-user-id');
    const body = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Missing x-tenant-id header' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing x-user-id header' },
        { status: 400 }
      );
    }

    const { operations = [], continueOnError = false } = body;

    // Validate batch size
    const sizeCheck = validateBatchSize(operations.length, 100);
    if (!sizeCheck.valid) {
      return NextResponse.json(
        { success: false, error: sizeCheck.error },
        { status: 400 }
      );
    }

    // Process batch operations (create, update, delete)
    const results: any[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      try {
        if (op.type === 'create') {
          const result = await createTask(tenantId, userId, {
            tenant_id: tenantId,
            ...op.data,
          });
          results.push({ index: i, status: 201, data: result });
        } else if (op.type === 'update') {
          const result = await updateTask(tenantId, userId, op.id, op.data);
          results.push({ index: i, status: 200, data: result });
        } else if (op.type === 'delete') {
          await deleteTask(tenantId, userId, op.id);
          results.push({ index: i, status: 204, data: null });
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        results.push({ index: i, status: 400, error: error.message });
        if (!continueOnError) break;
      }
    }

    return NextResponse.json(
      { success: results.length > 0, results },
      { status: 207 } // Multi-status response
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error },
      { status: 500 }
    );
  }
}
