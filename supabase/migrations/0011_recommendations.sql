-- Premise — Recommendation artefact (D-039 / taskforce critique 5a-5c)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- Sits between the analysis stage and the story-angles stage. Where analysis
-- produces verdicts + emergent patterns, and stories produce narrative
-- framings, the Recommendation is the single decision-shaped artefact a
-- C-suite reader actually consumes: one causal insight, one specific action,
-- one calibrated confidence.
--
-- Follows the migration template at supabase/migrations/_template.sql (D-037):
-- explicit grants to service_role + RLS on (no policies — server-side only).

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references briefs(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  ordinal int not null,
  insight text not null,                -- causal: "the change in X is driven by Y"
  recommended_action text not null,     -- specific: "do Z by Q"
  confidence text not null
    check (confidence in ('high', 'medium', 'low')),
  supporting_hypothesis_ids uuid[] not null default array[]::uuid[],
  supporting_emergent_patterns text[] not null default array[]::text[],
  caveats text[] not null default array[]::text[],
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recommendations_brief_id_idx on recommendations(brief_id);
create index if not exists recommendations_project_id_idx on recommendations(project_id);
create index if not exists recommendations_status_idx on recommendations(status);

-- ============================================================================
-- GRANTS — required from Oct 30, 2026 (D-037). Premise only reaches this
-- table via service_role; anon and authenticated stay commented until a
-- browser-side read is genuinely needed.
-- ============================================================================

grant select, insert, update, delete on public.recommendations to service_role;

-- ============================================================================
-- RLS — on by default (D-017). service_role bypasses RLS so all existing
-- server-side flows keep working.
-- ============================================================================

alter table recommendations enable row level security;

-- ============================================================================
-- Atomic replace of proposed recommendations (D-026 pattern).
-- Wraps delete-then-insert in a single transaction so a regenerate cannot
-- leave the artefact in a half-deleted state if it crashes mid-call.
-- ============================================================================

create or replace function replace_proposed_recommendations(
  p_brief_id uuid,
  p_project_id uuid,
  p_drafts jsonb
) returns setof recommendations
language plpgsql
as $$
declare
  start_ordinal int;
  draft jsonb;
  inserted recommendations;
begin
  delete from recommendations
   where brief_id = p_brief_id and status = 'proposed';

  select coalesce(max(ordinal), -1) + 1
    into start_ordinal
    from recommendations
   where brief_id = p_brief_id;

  for draft in select * from jsonb_array_elements(p_drafts)
  loop
    insert into recommendations (
      brief_id,
      project_id,
      ordinal,
      insight,
      recommended_action,
      confidence,
      supporting_hypothesis_ids,
      supporting_emergent_patterns,
      caveats,
      status
    ) values (
      p_brief_id,
      p_project_id,
      start_ordinal,
      draft->>'insight',
      draft->>'recommended_action',
      draft->>'confidence',
      coalesce(
        (
          select array_agg(value::uuid)
          from jsonb_array_elements_text(draft->'supporting_hypothesis_ids')
        ),
        array[]::uuid[]
      ),
      coalesce(
        (
          select array_agg(value)
          from jsonb_array_elements_text(draft->'supporting_emergent_patterns')
        ),
        array[]::text[]
      ),
      coalesce(
        (
          select array_agg(value)
          from jsonb_array_elements_text(draft->'caveats')
        ),
        array[]::text[]
      ),
      'proposed'
    )
    returning * into inserted;

    return next inserted;
    start_ordinal := start_ordinal + 1;
  end loop;

  return;
end;
$$;

grant execute on function replace_proposed_recommendations(uuid, uuid, jsonb) to service_role;
