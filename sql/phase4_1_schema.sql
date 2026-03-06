create table if not exists public.triage_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  report_date date not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  summary_text text not null,
  report_payload jsonb not null default '{}'::jsonb,
  generated_by text not null check (generated_by in ('system', 'admin')),
  generated_by_id text null
);

create unique index if not exists idx_triage_reports_report_date on public.triage_reports(report_date);
create index if not exists idx_triage_reports_created on public.triage_reports(created_at desc);
