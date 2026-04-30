-- Premise — Phase 4 hardening (atomic generation + idempotency locks)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. GENERATION LOCKS
-- A simple mutex table. Generation endpoints insert a row keyed by
-- `${endpoint}:${resource_id}` to claim exclusive execution. Unique constraint
-- on `key` means concurrent inserts fail with 23505. Stale locks expire after
-- their TTL and are swept on the next acquire attempt.
-- ============================================================================

create table if not exists generation_locks (
  key text primary key,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists generation_locks_expires_at_idx
  on generation_locks(expires_at);

alter table generation_locks enable row level security;

-- ============================================================================
-- 2. ATOMIC REPLACE_PROPOSED_HYPOTHESES
-- Wraps the delete-then-insert in a single transaction. If any insert fails,
-- the prior delete is rolled back and the user keeps their existing proposed
-- hypotheses. Accepted/rejected rows are never touched.
-- ============================================================================

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
      supporting_chunk_ids, contradicting_chunk_ids, priority, status
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
      'proposed'
    );
    i := i + 1;
  end loop;
end;
$$;

-- ============================================================================
-- 3. ATOMIC REPLACE_PROPOSED_PERSONAS
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
      under_represents, supporting_chunk_ids, priority, status
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
      'proposed'
    );
    i := i + 1;
  end loop;
end;
$$;

-- ============================================================================
-- 4. ATOMIC REPLACE_PROPOSED_QUESTIONS (with variants)
-- Inserts both the question and its 3 variants in one transaction. If any
-- variant insert fails, the question and the prior delete are rolled back.
-- ============================================================================

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
        what_it_elicits, caveat
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
        v_draft->>'caveat'
      );
      vi := vi + 1;
    end loop;

    i := i + 1;
  end loop;
end;
$$;
