-- Premise — Phase 5 (auth + per-user ownership)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- Adds owner_id to projects. Authentication is handled via Supabase Auth
-- (already provisioned in every Supabase project — no extra setup needed).
--
-- For backwards compatibility: existing projects with NULL owner_id are
-- treated as "shared" by the application code, so Aaron's existing work
-- doesn't disappear after he signs in for the first time. New projects
-- created after this migration always get owner_id set.

-- ============================================================================
-- 1. PROJECTS.OWNER_ID
-- ============================================================================

alter table projects
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create index if not exists projects_owner_id_idx on projects(owner_id);

-- ============================================================================
-- 2. AUTO-CLAIM HELPER
-- A function the app calls on first sign-in to claim any orphan (NULL-owner)
-- projects. Only runs successfully if the user is the FIRST to claim — once
-- another user has claimed, no further auto-claims happen.
-- ============================================================================

create or replace function claim_orphan_projects(p_user_id uuid)
returns int
language plpgsql
as $$
declare
  other_owners int;
  claimed int;
begin
  -- If any project is already owned by someone else, do not auto-claim.
  select count(*) into other_owners
  from projects
  where owner_id is not null and owner_id <> p_user_id;

  if other_owners > 0 then
    return 0;
  end if;

  update projects
  set owner_id = p_user_id
  where owner_id is null;

  get diagnostics claimed = row_count;
  return claimed;
end;
$$;
