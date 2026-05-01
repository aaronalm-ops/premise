-- Premise — Phase 5 schema (story angles)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- Closes the brief → story arc. Given accepted hypotheses + (optional)
-- analysis verdicts, the bot proposes 3-4 narrative angles for thought-
-- leadership output. Each angle has a target audience, a lede, supporting
-- beats, an evidence chain, and an honest "what this angle omits" disclosure.
-- Selected angles can be expanded into a markdown outline draft.

create table if not exists story_angles (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references briefs(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  ordinal int not null,
  title text not null,
  target_audience text not null,
  lede text not null,
  beats text[] not null default array[]::text[],
  supporting_hypothesis_ids uuid[] not null default array[]::uuid[],
  supporting_emergent_patterns text[] not null default array[]::text[],
  omits text not null,
  priority int not null default 3 check (priority >= 1 and priority <= 5),
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'rejected')),
  draft_outline text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists story_angles_brief_id_idx on story_angles(brief_id);
create index if not exists story_angles_project_id_idx on story_angles(project_id);
create index if not exists story_angles_status_idx on story_angles(status);

alter table story_angles enable row level security;
