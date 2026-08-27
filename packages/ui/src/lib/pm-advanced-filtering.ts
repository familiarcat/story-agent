/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Advanced Filtering for PM Entities
 * 
 * Supports:
 * - Date range filtering (start_date, end_date)
 * - User filtering (created_by, assigned_to)
 * - State filtering
 * - Custom sorting
 */

export type SortField = 'name' | 'created_at' | 'updated_at' | 'state' | 'story_points' | 'capacity';
export type SortOrder = 'asc' | 'desc';

export interface FilterOptions {
  // Date range
  startDateFrom?: string; // ISO 8601
  startDateTo?: string; // ISO 8601
  endDateFrom?: string; // ISO 8601
  endDateTo?: string; // ISO 8601

  // User filtering
  createdBy?: string;
  assignedTo?: string;

  // State filtering
  state?: string | string[];

  // Sorting
  sortBy?: SortField;
  sortOrder?: SortOrder;

  // Pagination
  limit?: number;
  offset?: number;
}

export interface QueryBuilder {
  filters: FilterOptions;
  addDateFilter(field: 'start_date' | 'end_date', from?: string, to?: string): this;
  addUserFilter(field: 'created_by' | 'assigned_to', userId: string): this;
  addStateFilter(states: string | string[]): this;
  addSort(field: SortField, order?: SortOrder): this;
  addPagination(limit: number, offset: number): this;
  build(): FilterOptions;
  toQueryString(): string;
}

/**
 * Build filter query for date range
 */
export function filterByDateRange(
  dateField: string,
  from?: string,
  to?: string
): { [key: string]: any } {
  const filters: { [key: string]: any } = {};

  if (from) {
    filters[`${dateField}_gte`] = from; // >= from
  }
  if (to) {
    filters[`${dateField}_lte`] = to; // <= to
  }

  return filters;
}

/**
 * Build filter query for user
 */
export function filterByUser(field: 'created_by' | 'assigned_to', userId: string): any {
  return { [field]: userId };
}

/**
 * Build filter query for state
 */
export function filterByState(states: string | string[]): any {
  const stateArray = Array.isArray(states) ? states : [states];
  return { state: { $in: stateArray } };
}

/**
 * Build sort query
 */
export function buildSort(field: SortField, order: SortOrder = 'asc'): string {
  return `${field}.${order}`;
}

/**
 * Validate date format (ISO 8601)
 */
export function isValidDate(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && dateStr === date.toISOString().split('T')[0] || dateStr.includes('T');
  } catch {
    return false;
  }
}

/**
 * Validate date range
 */
export function isValidDateRange(from?: string, to?: string): boolean {
  if (!from && !to) return true;
  if (from && !isValidDate(from)) return false;
  if (to && !isValidDate(to)) return false;
  if (from && to && new Date(from) > new Date(to)) return false;

  return true;
}

/**
 * Query Builder implementation
 */
export class FilterQueryBuilder implements QueryBuilder {
  filters: FilterOptions = {
    limit: 20,
    offset: 0,
  };

  addDateFilter(field: 'start_date' | 'end_date', from?: string, to?: string): this {
    if (!isValidDateRange(from, to)) {
      throw new Error(
        `Invalid date range for ${field}: from=${from}, to=${to}`
      );
    }

    if (field === 'start_date') {
      this.filters.startDateFrom = from;
      this.filters.startDateTo = to;
    } else {
      this.filters.endDateFrom = from;
      this.filters.endDateTo = to;
    }

    return this;
  }

  addUserFilter(field: 'created_by' | 'assigned_to', userId: string): this {
    if (field === 'created_by') {
      this.filters.createdBy = userId;
    } else {
      this.filters.assignedTo = userId;
    }

    return this;
  }

  addStateFilter(states: string | string[]): this {
    this.filters.state = states;
    return this;
  }

  addSort(field: SortField, order: SortOrder = 'asc'): this {
    this.filters.sortBy = field;
    this.filters.sortOrder = order;
    return this;
  }

  addPagination(limit: number, offset: number): this {
    this.filters.limit = limit;
    this.filters.offset = offset;
    return this;
  }

  build(): FilterOptions {
    return this.filters;
  }

  toQueryString(): string {
    const params = new URLSearchParams();

    if (this.filters.startDateFrom)
      params.append('startDateFrom', this.filters.startDateFrom);
    if (this.filters.startDateTo)
      params.append('startDateTo', this.filters.startDateTo);
    if (this.filters.endDateFrom)
      params.append('endDateFrom', this.filters.endDateFrom);
    if (this.filters.endDateTo)
      params.append('endDateTo', this.filters.endDateTo);

    if (this.filters.createdBy) params.append('createdBy', this.filters.createdBy);
    if (this.filters.assignedTo)
      params.append('assignedTo', this.filters.assignedTo);

    if (this.filters.state) {
      const states = Array.isArray(this.filters.state)
        ? this.filters.state.join(',')
        : this.filters.state;
      params.append('state', states);
    }

    if (this.filters.sortBy) params.append('sortBy', this.filters.sortBy);
    if (this.filters.sortOrder) params.append('sortOrder', this.filters.sortOrder);

    if (this.filters.limit) params.append('limit', this.filters.limit.toString());
    if (this.filters.offset) params.append('offset', this.filters.offset.toString());

    return params.toString();
  }
}

/**
 * Parse query parameters into FilterOptions
 */
export function parseQueryParams(params: Record<string, string | string[]>): FilterOptions {
  const filters: FilterOptions = {};

  // Date filters
  if (params.startDateFrom) filters.startDateFrom = params.startDateFrom as string;
  if (params.startDateTo) filters.startDateTo = params.startDateTo as string;
  if (params.endDateFrom) filters.endDateFrom = params.endDateFrom as string;
  if (params.endDateTo) filters.endDateTo = params.endDateTo as string;

  // User filters
  if (params.createdBy) filters.createdBy = params.createdBy as string;
  if (params.assignedTo) filters.assignedTo = params.assignedTo as string;

  // State filter
  if (params.state) {
    const state = params.state as string;
    filters.state = state.includes(',') ? state.split(',') : state;
  }

  // Sort
  if (params.sortBy) filters.sortBy = params.sortBy as SortField;
  if (params.sortOrder) filters.sortOrder = params.sortOrder as SortOrder;

  // Pagination
  if (params.limit) filters.limit = parseInt(params.limit as string, 10);
  if (params.offset) filters.offset = parseInt(params.offset as string, 10);

  return filters;
}

/**
 * Apply filters to Supabase query
 */
export function applyFilters(
  query: any,
  filters: FilterOptions
): any {
  let q = query;

  // Date range filters
  if (filters.startDateFrom) {
    q = q.gte('start_date', filters.startDateFrom);
  }
  if (filters.startDateTo) {
    q = q.lte('start_date', filters.startDateTo);
  }
  if (filters.endDateFrom) {
    q = q.gte('end_date', filters.endDateFrom);
  }
  if (filters.endDateTo) {
    q = q.lte('end_date', filters.endDateTo);
  }

  // User filters
  if (filters.createdBy) {
    q = q.eq('created_by', filters.createdBy);
  }
  if (filters.assignedTo) {
    q = q.eq('assigned_to', filters.assignedTo);
  }

  // State filter
  if (filters.state) {
    if (Array.isArray(filters.state)) {
      q = q.in('state', filters.state);
    } else {
      q = q.eq('state', filters.state);
    }
  }

  // Sorting
  if (filters.sortBy) {
    q = q.order(filters.sortBy, {
      ascending: filters.sortOrder === 'asc',
    });
  } else {
    q = q.order('created_at', { ascending: false }); // Default: newest first
  }

  // Pagination
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  q = q.range(offset, offset + limit - 1);

  return q;
}

/**
 * Example usage
 */
export function exampleFilterUsage(): void {
  const builder = new FilterQueryBuilder()
    .addDateFilter('start_date', '2026-09-01', '2026-12-31')
    .addUserFilter('created_by', 'user-123')
    .addStateFilter(['in_progress', 'review'])
    .addSort('created_at', 'desc')
    .addPagination(50, 0);

  const filters = builder.build();
  const queryString = builder.toQueryString();

  console.log('Filters:', filters);
  console.log('Query String:', queryString);
}
