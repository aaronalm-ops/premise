-- Premise — Recommendation action-class constraint (D-051)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- The ASEAN dogfood (2026-05-18) caught a recommendation telling BNPL providers
-- to introduce credit caps "within the current product cycle" — based entirely
-- on self-reported survey data. No Chief Risk Officer changes underwriting on
-- stated-preference signal; they need transactional ledger evidence,
-- repayment histories, and bureau scores.
--
-- The fix: the recommendation generator now must self-report whether its
-- proposed action would require behavioural validation before deployment.
-- For self-report-derived signals, that's almost always true for actions in
-- the underwriting / pricing / risk / hard-operational class.
--
-- Surfaced as an amber "Validate against behavioural data first" tag on the
-- card — same audit-trail chassis as D-040 / D-041 / D-049.

alter table recommendations
  add column if not exists requires_behavioral_validation boolean not null default false;

create index if not exists recommendations_requires_behavioral_validation_idx
  on recommendations(brief_id, requires_behavioral_validation);

-- ============================================================================
-- REDEFINE replace_proposed_recommendations TO PERSIST THE NEW FIELD
-- ============================================================================
--
-- Defaults to false if the draft omits the field (backward compatible with
-- older clients, though the new prompt will always emit it).

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
      status,
      requires_behavioral_validation
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
      'proposed',
      coalesce((draft->>'requires_behavioral_validation')::boolean, false)
    )
    returning * into inserted;

    return next inserted;
    start_ordinal := start_ordinal + 1;
  end loop;

  return;
end;
$$;

grant execute on function replace_proposed_recommendations(uuid, uuid, jsonb) to service_role;
