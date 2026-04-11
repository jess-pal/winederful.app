create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid null references public.quiz_sessions(id) on delete set null,
  event_name text not null,
  route text null,
  question_id text null,
  question_index int null,
  persona_id text null,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text null,
  country_code text null,
  region text null,
  city text null,
  device_type text null,
  browser text null,
  os text null,
  referrer text null,
  source text null
);

create table if not exists public.quiz_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  rating int null check (rating between 1 and 3),
  feedback_text text null,
  felt_accurate boolean null,
  would_share boolean null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.product_insights (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type text not null,
  status text not null default 'open' check (status in ('open', 'approved', 'dismissed', 'resolved')),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  title text not null,
  summary text not null,
  evidence jsonb not null default '[]'::jsonb,
  metric_payload jsonb not null default '{}'::jsonb,
  period_start timestamptz null,
  period_end timestamptz null
);

create table if not exists public.product_recommendations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  insight_id uuid null references public.product_insights(id) on delete set null,
  type text not null,
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  title text not null,
  summary text not null,
  proposed_action jsonb not null default '{}'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'dismissed', 'implemented')),
  approved_by text null,
  approved_at timestamptz null
);

create table if not exists public.approved_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  recommendation_id uuid not null references public.product_recommendations(id) on delete cascade,
  action_type text not null,
  status text not null check (status in ('pending', 'draft_created', 'approved', 'implemented', 'failed')),
  result_payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_product_events_created_at on public.product_events(created_at desc);
create index if not exists idx_product_events_event_name on public.product_events(event_name);
create index if not exists idx_product_events_session_id on public.product_events(session_id, created_at desc);
create index if not exists idx_product_events_question_idx on public.product_events(question_index, created_at desc);
create index if not exists idx_quiz_feedback_session_id on public.quiz_feedback(session_id, created_at desc);
create index if not exists idx_product_insights_created on public.product_insights(created_at desc);
create index if not exists idx_product_recommendations_created on public.product_recommendations(created_at desc);
create index if not exists idx_product_recommendations_status on public.product_recommendations(approval_status, created_at desc);
