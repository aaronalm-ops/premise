-- Premise — Brief-scope clarifier + hypothesis scope-from-brief discipline (D-049)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- Two conflations were getting silently muddled in the hypothesis pipeline:
--   * Evidence grounding — claims cite the corpus. Strict-abstention floor.
--   * Scope grounding — the hypothesis's *scope* (geography, segments, time
--     horizon, channels) was being inherited from whatever the retrieved
--     chunks happened to talk about, not from the brief.
--
-- The ASEAN dogfood (2026-05-18) made the failure concrete: a brief that said
-- "Gen Z vs Millennial travel" generated hypotheses tagged ASEAN because the
-- corpus skewed regional. Three accept-gates later, the questionnaire carried
-- ASEAN forward as if the researcher had chosen it.
--
-- The two-layer fix:
--   * Layer 1 — `briefs` carries detected scope_dimensions + the researcher's
--     clarifier answers, surfaced before generation.
--   * Layer 2 — `hypotheses.scope_inherited_from` is an audit-trail field
--     populated by the generator. Anything other than 'brief' or 'clarifier'
--     gets an amber tag on the card so the inheritance is visible.

-- ============================================================================
-- 1. BRIEFS — detected scope dimensions + clarifier state
-- ============================================================================
--
-- scope_dimensions is the Sonnet/Haiku-derived analysis of what the brief
-- specifies vs. leaves silent on the five scope axes. Stored as jsonb so the
-- axis set can evolve without a schema migration. Shape:
--   {
--     geography:       { specified: bool, brief_mention: string | null },
--     time_horizon:    { specified: bool, brief_mention: string | null },
--     audience:        { specified: bool, brief_mention: string | null },
--     channel:         { specified: bool, brief_mention: string | null },
--     market_maturity: { specified: bool, brief_mention: string | null }
--   }
--
-- scope_clarifications holds the researcher's resolutions for any silent
-- axis where the project corpus had a measurable skew. Shape:
--   { geography: "global" | "ASEAN" | "<custom>" | "skipped", ... }
--
-- scope_clarifier_status tracks where the brief is in the clarifier flow:
--   'not_required' — detection ran, nothing ambiguous → straight to generation
--   'pending'      — detection ran, ambiguous axes exist → awaiting input
--   'answered'     — researcher responded
--   'skipped'      — researcher dismissed all clarifications

alter table briefs
  add column if not exists scope_dimensions jsonb;

-- D-049: persisted project-corpus skew detection. Shape:
--   { geography: { dominant: "ASEAN", share: 0.85 }, ... }
-- Only axes that crossed the SKEW_THRESHOLD appear. Empty {} means no skew
-- detected (or fewer than 3 chunks sampled). Re-computed when detection runs.
alter table briefs
  add column if not exists scope_corpus_skew jsonb;

alter table briefs
  add column if not exists scope_clarifications jsonb;

alter table briefs
  add column if not exists scope_clarifier_status text
    check (scope_clarifier_status in ('not_required', 'pending', 'answered', 'skipped'));

-- ============================================================================
-- 2. HYPOTHESES — scope_inherited_from audit trail
-- ============================================================================
--
-- Populated by the generator. The amber UI tag triggers on anything other
-- than 'brief' or 'clarifier' — the two values where the researcher has
-- consciously authorised the scope.

alter table hypotheses
  add column if not exists scope_inherited_from text
    check (scope_inherited_from in ('brief', 'clarifier', 'corpus', 'model_default'));

create index if not exists hypotheses_scope_inherited_from_idx
  on hypotheses(brief_id, scope_inherited_from);

-- ============================================================================
-- 3. REDEFINE replace_proposed_hypotheses TO PERSIST scope_inherited_from
-- ============================================================================
--
-- Defaults to 'model_default' if a draft omits the field — backward
-- compatible with older clients but flagged as an inheritance we couldn't
-- attribute, which is the safer default than silently writing 'brief'.

create or replace function replace_proposed_hypotheses(
  p_brief_id uuid,
  p_project_id uuid,
  p_drafts jsonb
) returns void
language plpgsql
as $$
declare
  start_ord int;
  draft jsonb;
  i int := 0;
begin
  delete from hypotheses
  where brief_id = p_brief_id and status = 'proposed';

  select coalesce(max(ordinal), -1) + 1 into start_ord
  from hypotheses where brief_id = p_brief_id;

  for draft in select * from jsonb_array_elements(p_drafts) loop
    insert into hypotheses (
      brief_id, project_id, ordinal, statement, assumptions,
      expected_direction, confirmation_criteria,
      supporting_chunk_ids, contradicting_chunk_ids, priority, status,
      scope_inherited_from
    ) values (
      p_brief_id,
      p_project_id,
      start_ord + i,
      draft->>'statement',
      coalesce(
        (select array_agg(value) from jsonb_array_elements_text(draft->'assumptions')),
        array[]::text[]
      ),
      draft->>'expected_direction',
      draft->>'confirmation_criteria',
      coalesce(
        (select array_agg(value::uuid) from jsonb_array_elements_text(draft->'supporting_chunk_ids')),
        array[]::uuid[]
      ),
      coalesce(
        (select array_agg(value::uuid) from jsonb_array_elements_text(draft->'contradicting_chunk_ids')),
        array[]::uuid[]
      ),
      (draft->>'priority')::int,
      'proposed',
      coalesce(draft->>'scope_inherited_from', 'model_default')
    );
    i := i + 1;
  end loop;
end;
$$;
