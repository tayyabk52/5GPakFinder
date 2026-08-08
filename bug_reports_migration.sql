-- Anonymous bug reporting, ready for a future admin panel.
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('map','coverage','network_status','insights','speed_test','navigation','other')),
  impact text not null check (impact in ('blocking','major','minor')),
  title text not null check (char_length(title) between 8 and 120),
  steps_to_reproduce text not null check (char_length(steps_to_reproduce) between 12 and 2000),
  expected_behavior text not null check (char_length(expected_behavior) between 4 and 1000),
  actual_behavior text not null check (char_length(actual_behavior) between 4 and 1000),
  page_path text not null, device_fingerprint text not null, ip_hash text not null,
  user_agent text, status text not null default 'new' check (status in ('new','triaged','in_progress','resolved','closed')),
  admin_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists bug_reports_admin_queue_idx on public.bug_reports (status, impact, created_at desc);
create table if not exists public.bug_submission_log (id uuid primary key default gen_random_uuid(), ip_hash text not null, device_fingerprint text not null, created_at timestamptz not null default now());
create table if not exists public.blocked_bug_devices (device_fingerprint text primary key, reason text not null, blocked_at timestamptz not null default now());
create or replace function public.check_bug_submission(p_ip_hash text, p_fingerprint text) returns text language plpgsql security definer set search_path=public as $$
declare n integer; begin
  if exists (select 1 from blocked_bug_devices where device_fingerprint=p_fingerprint) then return 'blocked'; end if;
  select count(*) into n from bug_submission_log where device_fingerprint=p_fingerprint and created_at > now()-interval '1 hour';
  if n >= 3 or (select count(*) from bug_submission_log where ip_hash=p_ip_hash and created_at > now()-interval '1 hour') >= 10 then return 'rate_limited'; end if;
  insert into bug_submission_log(ip_hash,device_fingerprint) values(p_ip_hash,p_fingerprint); return 'allowed';
end $$;
alter table public.bug_reports enable row level security;
alter table public.bug_submission_log enable row level security;
alter table public.blocked_bug_devices enable row level security;
