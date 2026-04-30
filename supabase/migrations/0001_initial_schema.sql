-- Premise — Phase 1 schema
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste this whole file -> Run.
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

create extension if not exists vector;
create extension if not exists pgcrypto;  -- for gen_random_uuid()

-- ============================================================================
-- 2. PROJECTS
-- A "project" is one piece of research work (e.g. "Sustainability tracker 2026")
-- Every conversation, document, and chunk is bound to a project.
-- Confidentiality is set at the project level and inherited by documents.
-- ============================================================================

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  confidentiality text not null default 'client-confidential'
    check (confidentiality in ('public', 'client-confidential', 'nda-restricted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 3. DOCUMENTS
-- A "document" is one source file in a project's corpus
-- (a deck, a transcript, a report, etc.)
-- ============================================================================

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  source_path text,            -- original filename or URL
  mime_type text,              -- e.g. 'text/plain', 'application/pdf'
  confidentiality text         -- if null, inherits from project
    check (confidentiality in ('public', 'client-confidential', 'nda-restricted')),
  content_hash text,           -- sha256 of source text, used for de-dup
  char_count int,
  chunk_count int,
  created_at timestamptz not null default now()
);

create index if not exists documents_project_id_idx on documents(project_id);
create index if not exists documents_content_hash_idx on documents(content_hash);

-- ============================================================================
-- 4. CHUNKS
-- A "chunk" is a paragraph-sized piece of a document with an embedding.
-- voyage-3 produces 1024-dimensional embeddings.
-- ============================================================================

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  content text not null,
  ordinal int not null,        -- position within document (0-indexed)
  char_count int not null,
  embedding vector(1024) not null,
  created_at timestamptz not null default now()
);

create index if not exists chunks_project_id_idx on chunks(project_id);
create index if not exists chunks_document_id_idx on chunks(document_id);

-- HNSW index for fast approximate nearest-neighbour search on cosine distance.
-- This is what lets retrieval be near-instant at scale.
create index if not exists chunks_embedding_hnsw_idx
  on chunks
  using hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- 5. RETRIEVAL RPC
-- match_chunks: given a query embedding and a project, return the top-k
-- most semantically similar chunks. Confidentiality is enforced by the
-- project_id filter at the SQL boundary — chunks from other projects
-- physically cannot leak through.
-- ============================================================================

create or replace function match_chunks(
  query_embedding vector(1024),
  match_count int,
  p_project_id uuid
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  ordinal int,
  similarity float
)
language sql stable as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.ordinal,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.project_id = p_project_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- Enable RLS on every table. The service role key (used server-side) bypasses
-- RLS by design, so all existing server code keeps working. The anon key
-- (visible in the browser) gets denied on everything until we add auth and
-- explicit policies in a later phase.
--
-- Why turn this on now: D-017 in docs/DECISIONS.md.
-- ============================================================================

alter table projects enable row level security;
alter table documents enable row level security;
alter table chunks enable row level security;
