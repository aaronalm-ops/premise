-- Premise — Phase 2 schema (briefs + hypotheses)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. BRIEFS
-- A "brief" is the researcher's project objective in their own words.
-- A project may have multiple briefs over time; the artefacts pane shows the
-- most recent one by default. Each brief is the seed for hypothesis generation.
-- ============================================================================

create table if not exists briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists briefs_project_id_idx on briefs(project_id);

-- ============================================================================
-- 2. HYPOTHESES
-- A hypothesis is one falsifiable, citation-grounded statement proposed by
-- the bot. Each starts as "proposed"; the researcher accepts or rejects it.
-- Accepted hypotheses become the input for Phase 3 (questionnaire generation).
-- ============================================================================

create table if not exists hypotheses (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references briefs(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  ordinal int not null,
  statement text not null,
  assumptions text[] not null default array[]::text[],
  expected_direction text,
  confirmation_criteria text,
  supporting_chunk_ids uuid[] not null default array[]::uuid[],
  contradicting_chunk_ids uuid[] not null default array[]::uuid[],
  priority int not null default 3 check (priority >= 1 and priority <= 5),
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hypotheses_brief_id_idx on hypotheses(brief_id);
create index if not exists hypotheses_project_id_idx on hypotheses(project_id);
create index if not exists hypotheses_status_idx on hypotheses(status);

-- ============================================================================
-- 3. RLS (D-017 — safe default; service role bypasses)
-- ============================================================================

alter table briefs enable row level security;
alter table hypotheses enable row level security;
