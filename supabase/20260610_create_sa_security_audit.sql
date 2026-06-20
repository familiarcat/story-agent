-- Migration: create sa_security_audit base table for WorfGate security decision logging.
-- MUST run before 20260611_add_client_id_to_audit.sql (which adds client_id + security_sensitivity_score).
-- Columns derived from packages/mcp-server/src/lib/worfgate.ts (WorfGateAuditEntry insert).

CREATE TABLE IF NOT EXISTS public.sa_security_audit (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operation       TEXT NOT NULL,
  target          TEXT NOT NULL,
  repo_full_name  TEXT,
  allowed         BOOLEAN NOT NULL DEFAULT FALSE,
  detected_markers TEXT[] NOT NULL DEFAULT '{}',
  payload_hash    TEXT NOT NULL,
  reasons         TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
  -- client_id and security_sensitivity_score are added by 20260611_add_client_id_to_audit.sql
);

COMMENT ON TABLE public.sa_security_audit IS 'WorfGate security decision audit log (outbound data-control gate). One row per evaluated operation.';

CREATE INDEX IF NOT EXISTS idx_sa_security_audit_timestamp ON public.sa_security_audit (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sa_security_audit_operation ON public.sa_security_audit (operation);
CREATE INDEX IF NOT EXISTS idx_sa_security_audit_allowed ON public.sa_security_audit (allowed);

ALTER TABLE public.sa_security_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sa_security_audit_service_role_all ON public.sa_security_audit;
CREATE POLICY sa_security_audit_service_role_all
  ON public.sa_security_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
