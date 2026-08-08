-- Structured, anonymous feature suggestions. Run after the base schema and
-- security_hardening_migration.sql in the Supabase SQL Editor.
create table if not exists public.feature_suggestions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('map','coverage_data','network_status','speed_test','insights','accessibility','other')),
  audience text not null check (audience in ('me','my_area','everyone')),
  title text not null check (char_length(title) between 8 and 120),
  problem text not null check (char_length(problem) between 20 and 1000),
  proposal text not null check (char_length(proposal) between 20 and 2000),
  page_path text not null, device_fingerprint text not null, ip_hash text not null,
  status text not null default 'new' check (status in ('new','under_review','planned','declined','released')),
  admin_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists feature_suggestions_review_idx on public.feature_suggestions (status, category, created_at desc);
create table if not exists public.suggestion_submission_log (id uuid primary key default gen_random_uuid(), ip_hash text not null, device_fingerprint text not null, created_at timestamptz not null default now());
create index if not exists suggestion_submission_limit_idx on public.suggestion_submission_log (ip_hash, device_fingerprint, created_at desc);
create table if not exists public.blocked_suggestion_devices (device_fingerprint text primary key, reason text not null, blocked_at timestamptz not null default now());
create or replace function public.check_suggestion_submission(p_ip_hash text, p_fingerprint text) returns text language plpgsql security definer set search_path=public as $$
declare v_device_count integer; v_ip_count integer; begin
  perform pg_advisory_xact_lock(hashtextextended('suggestion:' || p_fingerprint, 0));
  if exists (select 1 from public.blocked_suggestion_devices where device_fingerprint = p_fingerprint) then return 'blocked'; end if;
  select count(*) into v_device_count from public.suggestion_submission_log where device_fingerprint = p_fingerprint and created_at > now() - interval '1 day';
  select count(*) into v_ip_count from public.suggestion_submission_log where ip_hash = p_ip_hash and created_at > now() - interval '1 day';
  if v_device_count >= 3 or v_ip_count >= 10 then return 'rate_limited'; end if;
  insert into public.suggestion_submission_log(ip_hash, device_fingerprint) values (p_ip_hash, p_fingerprint);
  return 'allowed';
end $$;
alter table public.feature_suggestions enable row level security;
alter table public.suggestion_submission_log enable row level security;
alter table public.blocked_suggestion_devices enable row level security;
revoke all on table public.feature_suggestions, public.suggestion_submission_log, public.blocked_suggestion_devices from anon, authenticated;
revoke execute on function public.check_suggestion_submission(text, text) from public, anon, authenticated;
grant execute on function public.check_suggestion_submission(text, text) to service_role;
