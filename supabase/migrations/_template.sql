-- Premise — Migration template (start here for every new migration)
--
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- This template bakes in two guardrails we always want:
--   1. Explicit GRANTs to service_role on every new table. Supabase removed
--      the implicit "everything in public is exposed to the Data API" default
--      (rolling out May 30 / Oct 30, 2026). Without an explicit GRANT, every
--      supabase-js call against the table returns 42501. See D-037.
--   2. Row Level Security on by default with no policies attached. The
--      service_role master key bypasses RLS; the anon visitor key is denied
--      until we explicitly add a policy. See D-017.
--
-- Replace `your_table` with the actual name. Delete sections you don't need.

create table if not exists your_table (
  id uuid primary key default gen_random_uuid(),
  -- columns here
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists your_table_created_at_idx on your_table(created_at);

-- ============================================================================
-- GRANTS — required for PostgREST / supabase-js to see this table at all.
-- Premise only routes data through server-side service_role today, so the
-- authenticated / anon grants below stay commented until a feature genuinely
-- needs a browser-side read.
-- ============================================================================

grant select, insert, update, delete on public.your_table to service_role;

-- grant select                          on public.your_table to authenticated;
-- grant select                          on public.your_table to anon;

-- ============================================================================
-- RLS — on by default. Add policies only when a non-service_role role needs
-- direct access. If you uncomment an authenticated/anon grant above, you
-- almost certainly want a policy below.
-- ============================================================================

alter table your_table enable row level security;

-- create policy "owners can read their rows" on public.your_table
--   for select to authenticated
--   using (owner_id = auth.uid());
