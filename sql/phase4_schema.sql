create table if not exists public.triage_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'triaged', 'draft_ready', 'ignored', 'resolved')),
  source text not null check (source in ('sentry', 'internal')),
  source_event_id text null,
  source_link text null,
  fingerprint text not null,
  title text not null,
  summary text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  environment text null,
  release_version text null,
  occurrence_count int not null default 1 check (occurrence_count > 0),
  evidence jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ingested_by text not null default 'system'
);

create table if not exists public.internal_issues (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  triage_item_id uuid null references public.triage_items(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'exported')),
  draft_title text not null,
  draft_body text not null,
  proposal_payload jsonb not null default '{}'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  approved boolean not null default false,
  approved_by text null,
  approved_at timestamptz null,
  external_issue_ref text null,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists idx_triage_items_source_event on public.triage_items(source, source_event_id) where source_event_id is not null;
create index if not exists idx_triage_items_status_created on public.triage_items(status, created_at desc);
create index if not exists idx_triage_items_fingerprint on public.triage_items(fingerprint);
create index if not exists idx_internal_issues_triage_created on public.internal_issues(triage_item_id, created_at desc);
create index if not exists idx_internal_issues_status_created on public.internal_issues(status, created_at desc);
