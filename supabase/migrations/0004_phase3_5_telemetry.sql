-- Premise — Phase 3.5 schema (telemetry)
-- Records every Anthropic and Voyage API call with token + cost data.
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.

create table if not exists api_calls (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  brief_id uuid references briefs(id) on delete cascade,
  service text not null check (service in ('anthropic', 'voyage')),
  endpoint text not null,
  model text,
  input_tokens int not null default 0,
  cached_input_tokens int not null default 0,
  cache_creation_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists api_calls_project_id_idx on api_calls(project_id);
create index if not exists api_calls_created_at_idx on api_calls(created_at desc);

alter table api_calls enable row level security;
