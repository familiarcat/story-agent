-- Make clients dynamic + hierarchical (crew-maintainable, end-to-end via Supabase).
-- Extends the existing public.clients table with a parent link (org hierarchy) and the full
-- WorfGate-governed security policy as JSONB, so resolveClientPolicy() can hydrate from the DB
-- instead of compiled-in constants. Client (gold standard) + familiarcat (root org) remain code
-- bootstrap; every onboarded client (Jonah onward) is a row here.

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS parent_client_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS policy JSONB;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS onboarded_by TEXT;

COMMENT ON COLUMN public.clients.parent_client_id IS 'Parent client in the org hierarchy (e.g. a client nested under the "familiarcat" main user). NULL = top-level org under the root admin.';
COMMENT ON COLUMN public.clients.policy IS 'Full ClientSecurityPolicy (tier, auth, WorfGate, required env vars) as JSONB. Source of truth for resolveClientPolicy hydration.';
COMMENT ON COLUMN public.clients.onboarded_by IS 'Identity/agent that onboarded this client (audit).';

-- Self-referential hierarchy integrity (kept ON DELETE SET NULL so removing a parent re-parents to root).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'clients_parent_fk' AND table_name = 'clients'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_parent_fk FOREIGN KEY (parent_client_id)
      REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_parent ON public.clients(parent_client_id);
