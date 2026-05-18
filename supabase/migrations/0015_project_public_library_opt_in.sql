-- Premise — Public-library inclusion is opt-in per project (D-047)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- Why: previously, every retrieval against any non-public project
-- automatically merged the project's chunks with chunks from every public
-- library. That was useful for cold-start (D-033) but conflated "my client
-- corpus" with "the shared library" — researchers couldn't tell whether a
-- cited chunk came from their own ingested transcript or from a public
-- academic paper. Aaron's product call: users opt in per project. The
-- public library cannot be edited from the UI (read-only, admin-managed
-- via the seed-public-corpus script).
--
-- This migration:
--   1. Adds include_public_libraries to projects (default false — opt-in).
--   2. Backfills existing non-public projects to true so behaviour for
--      already-running projects doesn't change; new projects default to
--      false. Researchers can flip the flag from the UI.
--   3. Indexes the flag for the retrieval-time check.

alter table projects
  add column if not exists include_public_libraries boolean not null default false;

-- One-shot backfill: preserve existing behaviour for already-running
-- projects. New projects start at false (opt-in).
update projects
  set include_public_libraries = true
  where is_public = false
    and include_public_libraries = false
    and created_at < now();

create index if not exists projects_include_public_libraries_idx
  on projects(include_public_libraries) where include_public_libraries = true;
