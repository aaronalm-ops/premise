-- Premise — Phase 6 (UX polish + AI-PM rigor + methodological tweaks)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. ASK_LOG (U-1: chat persistence)
-- One row per ask; survives reload so the chat panel reopens with history.
-- ============================================================================

create table if not exists ask_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  question text not null,
  answer jsonb not null,
  retrieved_chunks jsonb not null default '[]'::jsonb,
  used_chunk_ids text[] not null default array[]::text[],
  cost_estimate_usd numeric(12, 6) not null default 0,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists ask_log_project_id_created_at_idx
  on ask_log(project_id, created_at desc);
create index if not exists ask_log_user_id_idx on ask_log(user_id);

alter table ask_log enable row level security;

-- ============================================================================
-- 2. REJECTION REASONS (P-2: user feedback loop)
-- Optional researcher-supplied "why I rejected this" — high-value signal for
-- prompt tuning. Captured on hypotheses, personas, and questions.
-- ============================================================================

alter table hypotheses
  add column if not exists rejection_reason text;

alter table personas
  add column if not exists rejection_reason text;

alter table questions
  add column if not exists rejection_reason text;

-- ============================================================================
-- 3. PROMPT VERSIONING (L-8)
-- Tag every recorded API call with the prompt version used. Lets us diff
-- behaviour across prompt changes when investigating regressions.
-- ============================================================================

alter table api_calls
  add column if not exists prompt_version text;

create index if not exists api_calls_prompt_version_idx
  on api_calls(prompt_version) where prompt_version is not null;
