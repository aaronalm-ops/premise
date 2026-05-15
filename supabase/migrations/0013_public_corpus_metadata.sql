-- Premise — Public corpus metadata (D-044 / public-corpus taskforce week 1)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- Adds the per-document metadata fields the public-corpus taskforce flagged
-- as load-bearing (see docs/PUBLIC_CORPUS_TASKFORCE.md): provenance + licence
-- tracking, source-type taxonomy, recency, geography, topic tags, and a
-- curator's note in Aaron's voice. Two operational benefits:
--   1. Legal-bucket-tracking per document (Lawyer critique 1).
--   2. Source-diversity-aware retrieval — the retrieval layer can filter
--      by source_type / geography / topic_tags BEFORE embedding search
--      (RAG Engineer critique 9).
--
-- ALTER on the existing documents table inherits existing grants (D-037
-- only requires explicit grants on NEW tables from Oct 30, 2026), so no
-- new GRANTs are needed here.

alter table documents
  add column if not exists licence text;

alter table documents
  add column if not exists licence_url text;

alter table documents
  add column if not exists source_type text
  check (
    source_type is null or source_type in (
      'government',       -- public-domain / OGL / Eurostat
      'academic',         -- peer-reviewed open access
      'trade-body',       -- ESOMAR / MRS / AAPOR / AMA / ARF
      'agency',           -- Kantar / Ipsos / Big-4 / holding cos
      'analyst',          -- SaaS State-of-X / platform research
      'think-tank',       -- Pew / Reuters Institute / Edelman
      'methodology',      -- foundational papers + classics
      'regional',         -- MENA / India / SEA specific
      'meta'              -- Premise's own docs (case study, decisions)
    )
  );

alter table documents
  add column if not exists publication_year int
  check (publication_year is null or (publication_year >= 1900 and publication_year <= 2100));

alter table documents
  add column if not exists geography text;

alter table documents
  add column if not exists topic_tags text[] not null default array[]::text[];

alter table documents
  add column if not exists curators_note text;

-- ============================================================================
-- INDEXES — filtered retrieval lanes for the RAG layer.
-- The retrieval surface can now scope a query "what does the *academic*
-- literature say about price sensitivity" by SOURCE_TYPE before doing
-- embedding search, dramatically improving relevance on focused queries.
-- ============================================================================

create index if not exists documents_source_type_idx
  on documents(source_type)
  where source_type is not null;

create index if not exists documents_publication_year_idx
  on documents(publication_year)
  where publication_year is not null;

create index if not exists documents_geography_idx
  on documents(geography)
  where geography is not null;

create index if not exists documents_topic_tags_gin_idx
  on documents using gin (topic_tags);
