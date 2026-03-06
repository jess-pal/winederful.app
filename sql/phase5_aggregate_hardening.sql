create index if not exists idx_quiz_sessions_ip_hash_created_at on public.quiz_sessions(ip_hash, created_at desc);
create index if not exists idx_quiz_sessions_ip_ua_created_at on public.quiz_sessions(ip_hash, user_agent_hash, created_at desc);
