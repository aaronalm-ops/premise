-- Premise — Phase 5.5 (public library / shared corpus)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- Adds an `is_public` flag to projects. Public projects are shared corpora —
-- their documents and chunks are visible to all users at retrieval time,
-- alongside the user's own private project chunks. Solves the cold-start
-- problem: new users get useful hypotheses on day one, even without their
-- own corpus uploaded yet (D-033).

-- ============================================================================
-- 1. PROJECTS.IS_PUBLIC
-- ============================================================================

alter table projects
  add column if not exists is_public boolean not null default false;

create index if not exists projects_is_public_idx
  on projects(is_public) where is_public = true;

-- ============================================================================
-- 2. NEW MATCH_CHUNKS
-- The new signature takes an array of project_ids and returns enriched rows
-- (document title, source-project-is-public flag) so the UI can show meaningful
-- citations and distinguish public-corpus citations from project-corpus ones.
--
-- Drop the old single-id version first to avoid signature collision.
-- ============================================================================

drop function if exists match_chunks(vector(1024), int, uuid);

create or replace function match_chunks(
  query_embedding vector(1024),
  match_count int,
  p_project_ids uuid[]
)
returns table (
  id uuid,
  document_id uuid,
  document_title text,
  project_id uuid,
  is_public_source boolean,
  content text,
  ordinal int,
  similarity float
)
language sql stable as $$
  select
    c.id,
    c.document_id,
    d.title as document_title,
    c.project_id,
    coalesce(p.is_public, false) as is_public_source,
    c.content,
    c.ordinal,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  left join documents d on d.id = c.document_id
  left join projects p on p.id = c.project_id
  where c.project_id = any(p_project_ids)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
