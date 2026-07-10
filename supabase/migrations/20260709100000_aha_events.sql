-- aha_events: append-only cross-surface sync ledger (crew ruling AHA-SYNC-TIERS, RAG afa2fbb9).
-- Every Aha write path (dashboard routes, MCP crew tools, extension via dashboard) emits one row;
-- surfaces poll /aha/events and refetch affected resources. Worf rulings: append-only, rows carry
-- ONLY resource pointers (no Aha payload data), and no anon/authenticated access — service-role only.

create table if not exists aha_events (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  resource_type text        not null check (resource_type in
                  ('story','epic','release','requirement','sprint','project')),
  resource_id   text        not null,
  operation     text        not null check (operation in
                  ('created','updated','deleted','status_changed','linked')),
  actor         text        not null check (actor in ('dashboard','mcp','extension')),
  -- allowed keys: sprint_id, project_id, status_from, status_to — never Aha payload data
  meta          jsonb       not null default '{}'::jsonb
);

create index if not exists aha_events_created_at_idx on aha_events (created_at desc);
create index if not exists aha_events_resource_idx on aha_events (resource_type, resource_id);

-- RLS with NO policies = deny anon/authenticated entirely; the service-role key
-- (used by the crew server + Next.js server routes) bypasses RLS by design.
alter table aha_events enable row level security;
