-- Cost Governance — Budget enforcement for alpha vs production phases.
-- Tracks projected vs actual costs, budget enforcement, and escalation decisions.

-- cost_governance_budget: Phase-level budget configuration and tracking
CREATE TABLE IF NOT EXISTS cost_governance_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL UNIQUE,
  budget_usd DECIMAL(12, 2) NOT NULL,
  warn_pct INTEGER DEFAULT 50,
  halt_pct INTEGER DEFAULT 100,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'exceeded', 'paused', 'completed')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- cost_projection: Pre-flight projected costs for budget pre-checks and reconciliation
CREATE TABLE IF NOT EXISTS cost_projection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE,
  user_id TEXT,
  client_id TEXT,
  projected_cost_usd DECIMAL(12, 6),
  actual_cost_usd DECIMAL(12, 6),
  variance_pct DECIMAL(5, 2),
  cost_mode TEXT CHECK (cost_mode IN ('dev', 'prod')) DEFAULT 'prod',
  reconciled BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- cost_escalation: Budget alerts, warnings, and human decision points
CREATE TABLE IF NOT EXISTS cost_escalation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES cost_governance_budget(id),
  severity TEXT CHECK (severity IN ('warning', 'critical')) NOT NULL,
  current_spend DECIMAL(12, 2) NOT NULL,
  projected_additional DECIMAL(12, 6),
  budget_limit DECIMAL(12, 2),
  percent_spent INTEGER,
  message TEXT,
  decision TEXT CHECK (decision IS NULL OR decision IN ('continue', 'halt', 'modify')),
  decided_by TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

-- Add cost_mode column to existing cost_ledger table (if it doesn't exist)
ALTER TABLE IF EXISTS cost_ledger
ADD COLUMN IF NOT EXISTS cost_mode TEXT CHECK (cost_mode IN ('dev', 'prod')) DEFAULT 'prod';

-- Index for efficient budget queries
CREATE INDEX IF NOT EXISTS idx_cost_ledger_cost_mode_timestamp
ON cost_ledger(cost_mode, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_cost_escalation_severity_created
ON cost_escalation(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_projection_request_id
ON cost_projection(request_id);

-- Initialize alpha budget for Section 31 (if not already present)
INSERT INTO cost_governance_budget (phase, budget_usd, warn_pct, halt_pct, start_date, status)
VALUES ('alpha-section-31', 97.26, 50, 100, NOW(), 'active')
ON CONFLICT (phase) DO NOTHING;
