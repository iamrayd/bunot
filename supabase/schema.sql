-- Run once in the Supabase SQL editor.
-- One row per room. The whole room lives in `state`; `version` guards concurrent changes.
create table if not exists public.rooms (
  code text primary key,
  state jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row level security on, with no policies: browsers (anon key) can read and write nothing.
-- Only the server, using the service role key, touches this table.
alter table public.rooms enable row level security;
