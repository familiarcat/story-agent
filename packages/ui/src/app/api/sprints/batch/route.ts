/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Batch API Routes for PM Entities
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSprint, updateSprint } from '@/lib/pm-db';
import { BatchCreateOperation, BatchUpdateOperation, BatchDeleteOperation, validateBatchSize, batchResponse } from '@/lib/pm-batch-operations';
import type { Sprint } from '@story-agent/shared/pm-contracts';

/**
 * POST /api/sprints/batch
 * Create multiple sprints in a single request
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

    const { entities = [], continueOnError = false } = body;

    // Validate batch size
    const sizeCheck = validateBatchSize(entities.length, 100);
    if (!sizeCheck.valid) {
      return NextResponse.json(
        { success: false, error: sizeCheck.error },
        { status: 400 }
      );
    }

    // Process batch
    const operation = new BatchCreateOperation<Sprint>();

    for (let i = 0; i < entities.length; i++) {
      try {
        const result = await createSprint(tenantId, userId, {
          tenant_id: tenantId,
          ...entities[i],
        });
        await operation.addResult(i, result);
      } catch (err) {
        await operation.addResult(i, entities[i], err as Error);
        if (!operation.shouldContinue(continueOnError)) break;
      }
    }

    const result = operation.build(entities.length);
    return NextResponse.json(
      batchResponse(result, 201).body,
      { status: batchResponse(result, 201).status }
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sprints/batch
 * Not applicable for GET - would be list all
 */
