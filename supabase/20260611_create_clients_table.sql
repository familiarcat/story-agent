-- Create clients table for multi-tenant management
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    security_tier TEXT NOT NULL DEFAULT 'standard',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.clients IS 'Client organizations (tenants) managed by the Sovereign Factory.';
COMMENT ON COLUMN public.clients.security_tier IS 'The security tier of the client: standard, regulated, air_gapped, or customer_managed.';