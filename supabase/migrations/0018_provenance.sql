-- Premise — Provenance on right-pane artefacts (D-055)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- Context: D-002's "strict abstention on RAG" was over-applied. The chat pane
-- (Q&A against the corpus) keeps the strict floor — that's where users ask
-- direct questions and expect sourced answers. But the right-pane generative
-- artefacts (hypotheses, personas, analysis verdicts) were silently refusing
-- to help when the corpus didn't cover a brief's topic, instead of using the
-- corpus as inspiration with honest labelling.
--
-- The shift: corpus is inspiration, not a fence. Every right-pane claim
-- self-reports a `provenance` tier — same audit-trail chassis as D-040 /
-- D-049 / D-051 (selection_mode, scope_inherited_from, requires_behavioral_
-- validation).
--
-- Hypotheses + personas: provenance to the corpus.
-- Analysis verdicts:     provenance to the uploaded data.
-- Recommendations + story angles: NOT TOUCHED — their grounding is the
--                                  evidence-chain (must cite hypothesis/
--                                  pattern IDs); they're synthesis, not
--                                  claims, and don't need a separate label.
-- Questions: NOT TOUCHED — questions are the instrument, not findings.

-- ============================================================================
-- 1. HYPOTHESES — provenance
-- ============================================================================
--
-- The three corpus-flavoured tiers:
--   * corpus-grounded   — hypothesis cites chunks; the mechanism is in the corpus.
--   * corpus-inspired   — hypothesis extends a mechanism observed in the corpus
--                         to a context the corpus doesn't directly cover.
--   * general-knowledge — model's background knowledge; not corpus-supported.

alter table hypotheses
  add column if not exists provenance text
    check (provenance in ('corpus-grounded', 'corpus-inspired', 'general-knowledge'));

create index if not exists hypotheses_provenance_idx
  on hypotheses(brief_id, provenance);

-- ============================================================================
-- 2. PERSONAS — provenance (same tiers as hypotheses)
-- ============================================================================

alter table personas
  add column if not exists provenance text
    check (provenance in ('corpus-grounded', 'corpus-inspired', 'general-knowledge'));

create index if not exists personas_provenance_idx
  on personas(brief_id, provenance);

-- ============================================================================
-- 3. ANALYSIS VERDICTS — provenance (data-flavoured tiers)
-- ============================================================================
--
-- Verdicts are stored as a jsonb array column on `analyses.hypothesis_verdicts`.
-- The application code is responsible for emitting + persisting the per-item
-- provenance field; no column-level check is feasible inside a jsonb array,
-- so the discipline lives in the runtime + the tool schema.
--
-- The three data-flavoured tiers:
--   * data-grounded     — verdict cites specific signal in the uploaded data
--                         (counts, percentages, quotes, segment splits).
--   * data-extrapolated — verdict is plausible given the visible data but
--                         extends beyond what's strictly observable (the
--                         CSV-truncation case from D-053 lives here).
--   * general-knowledge — verdict reflects standard industry pattern with
--                         no specific support in the uploaded data.
--
-- No schema change needed for analysis verdicts — the field is added inside
-- the existing jsonb. This comment serves as the documentation hook for
-- the new field's introduction in [src/lib/rag/analysis-generator.ts].

-- ============================================================================
-- 4. REDEFINE replace_proposed_hypotheses TO PERSIST provenance
-- ============================================================================
--
-- Default to 'general-knowledge' if a draft omits the field — backward
-- compatible with older clients but flagged honestly rather than silently
-- claiming corpus-grounding the draft didn't earn.

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
      scope_inherited_from, provenance
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
      coalesce(draft->>'scope_inherited_from', 'model_default'),
      coalesce(draft->>'provenance', 'general-knowledge')
    );
    i := i + 1;
  end loop;
end;
$$;

-- ============================================================================
-- 5. REDEFINE replace_proposed_personas TO PERSIST provenance
-- ============================================================================

create or replace function replace_proposed_personas(
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
  delete from personas
  where brief_id = p_brief_id and status = 'proposed';

  select coalesce(max(ordinal), -1) + 1 into start_ord
  from personas where brief_id = p_brief_id;

  for draft in select * from jsonb_array_elements(p_drafts) loop
    insert into personas (
      project_id, brief_id, ordinal, name, description,
      demographic_profile, behavioural_profile, assumptions,
      under_represents, supporting_chunk_ids, priority, status,
      provenance
    ) values (
      p_project_id,
      p_brief_id,
      start_ord + i,
      draft->>'name',
      draft->>'description',
      draft->>'demographic_profile',
      draft->>'behavioural_profile',
      coalesce(
        (select array_agg(value) from jsonb_array_elements_text(draft->'assumptions')),
        array[]::text[]
      ),
      draft->>'under_represents',
      coalesce(
        (select array_agg(value::uuid) from jsonb_array_elements_text(draft->'supporting_chunk_ids')),
        array[]::uuid[]
      ),
      (draft->>'priority')::int,
      'proposed',
      coalesce(draft->>'provenance', 'general-knowledge')
    );
    i := i + 1;
  end loop;
end;
$$;
