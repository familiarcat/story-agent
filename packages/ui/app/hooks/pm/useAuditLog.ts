/**
 * useAuditLog Hook
 * Fetches audit trail for an entity.
 */

import { useState, useEffect } from 'react';
import { PMAuditLog, ListResponse } from '@story-agent/shared';

/** UUID type alias */
type UUID = string;

interface UseAuditLogOptions {
  offset?: number;
  limit?: number;
}

interface UseAuditLogResult {
  auditLogs: PMAuditLog[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useAuditLog(
  entityId: UUID,
  entityType: string = 'story',
  options: UseAuditLogOptions = {}
): UseAuditLogResult {
  const [auditLogs, setAuditLogs] = useState<PMAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.append('entity_id', entityId);
    params.append('entity_type', entityType);
    params.append('offset', String(options.offset || 0));
    params.append('limit', String(options.limit || 50));

    fetch(`/api/pm/audit-log?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAuditLogs(data.data.items);
          setTotal(data.data.total);
        } else {
          setError(data.error);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [entityId, entityType, options.offset, options.limit]);

  return { auditLogs, total, loading, error };
}
