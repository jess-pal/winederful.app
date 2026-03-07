create table if not exists public.triage_autopilot_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  triage_item_id uuid not null references public.triage_items(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'draft_ready', 'closed')),
  risk_class text not null default 'high' check (risk_class in ('low', 'medium', 'high')),
  proposal_payload jsonb not null default '{}'::jsonb,
  decision_note text null,
  decided_by text null,
  decided_at timestamptz null
);

create table if not exists public.triage_verification_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  internal_issue_id uuid not null references public.internal_issues(id) on delete cascade,
  triage_item_id uuid not null references public.triage_items(id) on delete cascade,
  release_ref text null,
  before_count int not null default 0,
  after_count int not null default 0,
  status text not null default 'monitoring' check (status in ('improved', 'monitoring', 'regressed')),
  notes text null,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists idx_triage_autopilot_item on public.triage_autopilot_queue(triage_item_id);
create index if not exists idx_triage_autopilot_status_created on public.triage_autopilot_queue(status, created_at desc);
create index if not exists idx_triage_verification_issue_created on public.triage_verification_runs(internal_issue_id, created_at desc);
