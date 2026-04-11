create table if not exists public.triage_autopilot_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  triage_item_id uuid not null references public.triage_items(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'draft_ready', 'closed')),
  risk_class text not null check (risk_class in ('low', 'medium', 'high')),
  proposal_payload jsonb not null,
  decision_note text null,
  decided_by text null,
  decided_at timestamptz null
);

create table if not exists public.triage_verification_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  release_tag text not null,
  triage_item_id uuid not null references public.triage_items(id) on delete cascade,
  internal_issue_id uuid null references public.internal_issues(id) on delete set null,
  check_status text not null check (check_status in ('ok', 'warn', 'fail')),
  notes text null,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists idx_triage_autopilot_item on public.triage_autopilot_queue(triage_item_id);
create index if not exists idx_triage_autopilot_status_created on public.triage_autopilot_queue(status, created_at desc);
create index if not exists idx_triage_verification_issue_created on public.triage_verification_runs(internal_issue_id, created_at desc);

alter table if exists public.triage_autopilot_queue enable row level security;
alter table if exists public.triage_verification_runs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'triage_autopilot_queue'
      and policyname = 'deny_public_triage_autopilot_queue'
  ) then
    create policy deny_public_triage_autopilot_queue
      on public.triage_autopilot_queue
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'triage_verification_runs'
      and policyname = 'deny_public_triage_verification_runs'
  ) then
    create policy deny_public_triage_verification_runs
      on public.triage_verification_runs
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;
end
$$;

