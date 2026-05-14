-- Premise — Variant ordering + hypothesis-lock with deviation rationale
-- (D-040 + D-041, taskforce critiques 4a + 9a)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- Two additions on existing tables; no new tables. ALTER on existing tables
-- inherits existing grants (D-037 only requires explicit grants on NEW
-- tables from Oct 30, 2026), so no new GRANT statements are needed here.

-- ============================================================================
-- 1. QUESTION VARIANTS — recommended ordering + selection-mode audit trail
-- ============================================================================
--
-- D-040 (taskforce 4a — Behavioral Scientist): decision-fatigue research is
-- unambiguous that humans evaluating 90 decisions (3 variants × ~30 questions)
-- default to whichever variant is on top. Rather than fight that, the
-- variant generator now marks one variant as `is_recommended = true` based
-- on hypothesis-fit, and the UI surfaces it first. When the researcher
-- accepts the default we log `selection_mode = 'default'`; when they
-- actively pick a non-recommended variant we log `selection_mode = 'active'`.
-- This preserves the propose-not-decide principle (D-019) while making the
-- fatigue-default a defensible choice rather than a random one.

alter table question_variants
  add column if not exists is_recommended boolean not null default false;

alter table question_variants
  add column if not exists selection_mode text
    check (selection_mode in ('active', 'default'));

create index if not exists question_variants_is_recommended_idx
  on question_variants(question_id, is_recommended);

-- ============================================================================
-- 2. HYPOTHESES — deviation-reporting lock once analysis has run
-- ============================================================================
--
-- D-041 (taskforce 9a — Academic Peer-Reviewer + Aaron's deferred ruling).
-- We follow the pre-registration/AsPredicted pattern: hypotheses are not
-- hard-locked once analysis exists, but any revision must carry a
-- `revision_rationale`. The flag stays on the row forever — once a
-- hypothesis has been revised post-analysis, the story-angle generator
-- auto-appends that fact to its `omits` field so the integrity flows all
-- the way through to the final deck. Schema-enforced honesty (same instinct
-- as D-018 / D-019 / D-036 / D-039).

alter table hypotheses
  add column if not exists revised_after_analysis boolean not null default false;

alter table hypotheses
  add column if not exists revision_rationale text;

create index if not exists hypotheses_revised_after_analysis_idx
  on hypotheses(brief_id, revised_after_analysis);

-- ============================================================================
-- 3. REDEFINE replace_proposed_questions TO PERSIST is_recommended
-- ============================================================================
--
-- The atomic question/variant insert function (originally defined in
-- migration 0005) now persists the per-variant is_recommended flag the
-- question-generator emits. The function reads the new field from the
-- JSONB draft; if absent (older clients), defaults to false — backward-
-- compatible with the prior shape.

create or replace function replace_proposed_questions(
  p_brief_id uuid,
  p_project_id uuid,
  p_drafts jsonb
) returns void
language plpgsql
as $$
declare
  start_ord int;
  q_draft jsonb;
  v_draft jsonb;
  vi int;
  i int := 0;
  new_question_id uuid;
begin
  delete from questions
  where brief_id = p_brief_id and status = 'proposed';

  select coalesce(max(ordinal), -1) + 1 into start_ord
  from questions where brief_id = p_brief_id;

  for q_draft in select * from jsonb_array_elements(p_drafts) loop
    insert into questions (
      brief_id, project_id, hypothesis_id, ordinal,
      target_construct, rationale, status
    ) values (
      p_brief_id,
      p_project_id,
      nullif(q_draft->>'hypothesis_id', '')::uuid,
      start_ord + i,
      q_draft->>'target_construct',
      q_draft->>'rationale',
      'proposed'
    ) returning id into new_question_id;

    vi := 0;
    for v_draft in select * from jsonb_array_elements(q_draft->'variants') loop
      insert into question_variants (
        question_id, ordinal, variant_type, statement,
        response_format, response_options,
        what_it_elicits, caveat, is_recommended
      ) values (
        new_question_id,
        vi,
        v_draft->>'variant_type',
        v_draft->>'statement',
        v_draft->>'response_format',
        coalesce(
          (select array_agg(value) from jsonb_array_elements_text(v_draft->'response_options')),
          array[]::text[]
        ),
        v_draft->>'what_it_elicits',
        v_draft->>'caveat',
        coalesce((v_draft->>'is_recommended')::boolean, false)
      );
      vi := vi + 1;
    end loop;

    i := i + 1;
  end loop;
end;
$$;
