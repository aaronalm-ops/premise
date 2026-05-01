-- Premise — Phase 4 schema (analysis)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- One analysis per brief. Researcher uploads survey CSV / pastes raw data /
-- adds transcripts; the LLM analyser reads everything alongside the brief +
-- accepted hypotheses + selected question variants and produces structured
-- verdicts.

-- ============================================================================
-- 1. ANALYSES
-- One row per brief. status tracks the lifecycle of the analysis run.
-- ============================================================================

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references briefs(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  status text not null default 'idle'
    check (status in ('idle', 'running', 'complete', 'failed')),
  hypothesis_verdicts jsonb not null default '[]'::jsonb,
  emergent_patterns jsonb not null default '[]'::jsonb,
  caveats text[] not null default array[]::text[],
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists analyses_brief_id_uidx on analyses(brief_id);

-- ============================================================================
-- 2. ANALYSIS_DATA
-- Each row is one source the researcher uploaded for analysis (a CSV pasted
-- as text, a transcript, raw notes). Stored as text — the LLM parses on read.
-- ============================================================================

create table if not exists analysis_data (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references analyses(id) on delete cascade,
  brief_id uuid not null references briefs(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  source_type text not null
    check (source_type in ('csv', 'transcript', 'paste', 'notes')),
  title text not null,
  content text not null,
  char_count int not null,
  created_at timestamptz not null default now()
);

create index if not exists analysis_data_analysis_id_idx
  on analysis_data(analysis_id);
create index if not exists analysis_data_brief_id_idx
  on analysis_data(brief_id);

-- ============================================================================
-- 3. RLS (D-017 — safe default; service role bypasses)
-- ============================================================================

alter table analyses enable row level security;
alter table analysis_data enable row level security;
