-- Premise — Phase 3 schema (personas + questions + question_variants)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. PERSONAS
-- A persona is a target audience archetype proposed by the bot. The researcher
-- accepts or rejects. Accepted personas become inputs to questionnaire design.
-- The under_represents field is the single most valuable column — it surfaces
-- the researcher's blind spot before they sample.
-- ============================================================================

create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  brief_id uuid references briefs(id) on delete cascade,
  ordinal int not null,
  name text not null,
  description text not null,
  demographic_profile text,
  behavioural_profile text,
  assumptions text[] not null default array[]::text[],
  under_represents text,
  supporting_chunk_ids uuid[] not null default array[]::uuid[],
  priority int not null default 3 check (priority >= 1 and priority <= 5),
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists personas_project_id_idx on personas(project_id);
create index if not exists personas_brief_id_idx on personas(brief_id);

-- ============================================================================
-- 2. QUESTIONS
-- A question is a logical construct to measure. Each question has 3 variants
-- (different phrasings). The researcher picks ONE variant per question based
-- on what they want to elicit. This is the principle of D-018 — options, not
-- answers — made literal.
-- ============================================================================

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  brief_id uuid not null references briefs(id) on delete cascade,
  hypothesis_id uuid references hypotheses(id) on delete set null,
  ordinal int not null,
  target_construct text not null,
  rationale text,
  selected_variant_id uuid,
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists questions_brief_id_idx on questions(brief_id);
create index if not exists questions_hypothesis_id_idx on questions(hypothesis_id);

-- ============================================================================
-- 3. QUESTION VARIANTS
-- Each variant is one phrasing of a question. variant_type names the
-- methodological choice (neutral_direct, leading, projective, behavioural,
-- attitudinal, forced_choice, constant_sum, maxdiff). what_it_elicits and
-- caveat tell the researcher the tradeoff so they can pick on instinct.
-- ============================================================================

create table if not exists question_variants (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  ordinal int not null,
  variant_type text not null,
  statement text not null,
  response_format text,
  response_options text[] not null default array[]::text[],
  what_it_elicits text,
  caveat text,
  created_at timestamptz not null default now()
);

create index if not exists question_variants_question_id_idx
  on question_variants(question_id);

-- Add the FK from questions.selected_variant_id once question_variants exists
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'questions_selected_variant_fk'
  ) then
    alter table questions
      add constraint questions_selected_variant_fk
      foreign key (selected_variant_id)
      references question_variants(id) on delete set null;
  end if;
end $$;

-- ============================================================================
-- 4. RLS (D-017 — safe default; service role bypasses)
-- ============================================================================

alter table personas enable row level security;
alter table questions enable row level security;
alter table question_variants enable row level security;
