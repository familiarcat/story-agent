-- Business tier (Commercial | Enterprise) — the top conceptual grouping ABOVE clients.
-- Distinct from the fine-grained `security_tier` (regulated|enterprise|standard): `business_tier` is
-- the coarse top-level bucket. Enterprise mandates the DoD-grade WorfGate floor (>= enterprise
-- security posture, controlled-data hard block, SSM-only secrets) AND a recorded manager attestation.
-- Crew-designed reorg — see docs/architecture/hierarchy-and-entitlements.md.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS business_tier TEXT NOT NULL DEFAULT 'commercial'
  CHECK (business_tier IN ('commercial', 'enterprise'));

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS business_tier_attestation JSONB;

COMMENT ON COLUMN public.clients.business_tier IS
  'Top conceptual tier: commercial | enterprise. Enterprise mandates the DoD-grade WorfGate floor (>= enterprise security_tier / regulated-defense posture) and a recorded manager attestation.';
COMMENT ON COLUMN public.clients.business_tier_attestation IS
  'Manager attestation recorded when business_tier = enterprise: { approvedBy, statement, approvedAt }.';

-- Backfill: existing high-security clients are Enterprise; everyone else Commercial.
UPDATE public.clients
  SET business_tier = 'enterprise'
  WHERE security_tier IN ('enterprise', 'regulated') AND business_tier = 'commercial';

CREATE INDEX IF NOT EXISTS idx_clients_business_tier ON public.clients(business_tier);
