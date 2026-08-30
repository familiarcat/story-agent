/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { PmSchemaValidator } from '@story-agent/shared/pm-contracts';
import { createSprint, listSprints } from '@/lib/pm-db';
import { parseQueryParams, applyFilters } from '@/lib/pm-advanced-filtering';

/**
 * POST /api/sprints
 * Create a new sprint with validation and tenant isolation
 * 
 * Request body:
 * {
 *   "name": "Sprint 1",
 *   "start_date": "2026-09-01",
 *   "end_date": "2026-09-14",
 *   "capacity": 40,
 *   "goal": "Deliver core features"
 * }
 * 
 * Response: 201 Created
 * {
 *   "success": true,
 *   "data": { id, name, state, ... }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Extract tenant and user ID from headers
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';
    const userId = request.headers.get('x-user-id') ?? 'anonymous-user';

    const body = await request.json();
    const validationResult = PmSchemaValidator.validateSprint(body);

    if (!validationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Create sprint in database
    const sprint = await createSprint(tenantId, userId, body);

    return NextResponse.json(
      { success: true, data: sprint },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/sprints]', error);
    
    if (error.message?.includes('RBAC_DENIED')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    if (error.message?.includes('VALIDATION_ERROR')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sprints
 * List all sprints for authenticated user's tenant with pagination and filtering
 * 
 * Query Parameters (all optional):
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 * - state: string (planning, in_progress, closed, archived)
 * - startDateFrom: string (ISO 8601, e.g., 2026-09-01)
 * - startDateTo: string (ISO 8601)
 * - endDateFrom: string (ISO 8601)
 * - endDateTo: string (ISO 8601)
 * - createdBy: string (user ID)
 * - sortBy: string (name, created_at, updated_at, state)
 * - sortOrder: string (asc, desc)
 * 
 * Examples:
 * GET /api/sprints?limit=10&state=in_progress
 * GET /api/sprints?startDateFrom=2026-09-01&startDateTo=2026-12-31&sortBy=created_at&sortOrder=desc
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": [...],
 *   "pagination": { limit, offset, total }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Extract tenant and user ID from headers
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';
    const searchParams = request.nextUrl.searchParams;

    // Parse all filter parameters
    const filters = parseQueryParams(
      Object.fromEntries(searchParams.entries())
    );

    // Apply limit/offset validation
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = filters.offset ?? 0;

    // List sprints from database with filters
    // TODO: Integrate applyFilters with listSprints
    const { data, total } = await listSprints(tenantId, { 
      state: filters.state as string | undefined, 
      limit, 
      offset 
    });

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: { limit, offset, total },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/sprints]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
