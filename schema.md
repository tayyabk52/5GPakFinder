# Supabase Schema — Community 5G Coverage Reports

Run this whole file in the Supabase SQL editor (Project → SQL → New query → paste → Run).
Re-running is safe: it uses `create ... if not exists` and `create or replace`.

## Tunable constants

Rate limits live inside `check_rate_limit` below. To change them, edit these
three values and re-run the function block:
- per-IP hourly cap: `5`
- per-device daily cap: `10`
- minimum seconds between submissions from one IP: `300`

```sql
-- Extensions --------------------------------------------------------------
create extension if not exists pgcrypto;  -- gen_random_uuid()

-- Tables ------------------------------------------------------------------
create table if not exists public.reports (
  id                  uuid primary key default gen_random_uuid(),
  latitude            double precision not null,
  longitude           double precision not null,
  geohash             text not null,
  accuracy_meters     integer,
  is_manual_pin       boolean not null default false,
  operator            text not null check (operator in ('Jazz','Zong','Ufone')),
  speed_source        text check (speed_source in ('desktop','mobile','manual')),
  download_mbps       real,
  upload_mbps         real,
  ping_ms             integer,
  speedtest_url       text,
  device_model        text,
  carrier             text,
  isp                 text,
  server_name         text,
  wifi_device_model   text,
  device_fingerprint  text not null,
  ip_hash             text not null,
  trust_score         real not null,
  status              text not null default 'visible' check (status in ('visible','hidden')),
  created_at          timestamptz not null default now()
);

create index if not exists reports_geohash_idx      on public.reports (geohash);
create index if not exists reports_lat_lng_idx       on public.reports (latitude, longitude);
create index if not exists reports_created_at_idx    on public.reports (created_at);
create index if not exists reports_visible_idx       on public.reports (status) where status = 'visible';

create table if not exists public.report_submissions_log (
  id                  uuid primary key default gen_random_uuid(),
  ip_hash             text not null,
  device_fingerprint  text not null,
  created_at          timestamptz not null default now()
);

create index if not exists submissions_ip_idx     on public.report_submissions_log (ip_hash, created_at);
create index if not exists submissions_device_idx on public.report_submissions_log (device_fingerprint, created_at);

-- Device abuse controls ----------------------------------------------------
-- Blocks are permanent unless an administrator explicitly removes the row.
create table if not exists public.blocked_report_devices (
  device_fingerprint  text primary key,
  reason              text not null,
  blocked_at          timestamptz not null default now()
);

create table if not exists public.report_submission_violations (
  id                  uuid primary key default gen_random_uuid(),
  ip_hash             text not null,
  device_fingerprint  text not null,
  reason              text not null,
  created_at          timestamptz not null default now()
);

create index if not exists submission_violations_device_idx
  on public.report_submission_violations (device_fingerprint, created_at);

-- To block a device manually, run:
-- insert into public.blocked_report_devices (device_fingerprint, reason)
-- values ('fingerprint-from-audit-log', 'Manual moderation block');

-- This is the only submission gate used by the API. Advisory locks make the
-- check-and-log sequence atomic across concurrent requests.
create or replace function public.check_report_submission(p_ip_hash text, p_fingerprint text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ip_hour_count integer;
  device_day_count integer;
  last_ip_at timestamptz;
  violation_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('ip:' || p_ip_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended('fp:' || p_fingerprint, 0));

  if exists (select 1 from blocked_report_devices where device_fingerprint = p_fingerprint) then
    return 'blocked';
  end if;

  select count(*) into ip_hour_count from report_submissions_log
    where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
  select count(*) into device_day_count from report_submissions_log
    where device_fingerprint = p_fingerprint and created_at > now() - interval '1 day';
  select max(created_at) into last_ip_at from report_submissions_log where ip_hash = p_ip_hash;

  if ip_hour_count >= 5 or device_day_count >= 10 or
     (last_ip_at is not null and last_ip_at > now() - interval '300 seconds') then
    insert into report_submission_violations (ip_hash, device_fingerprint, reason)
      values (p_ip_hash, p_fingerprint, 'rate_limit');
    select count(*) into violation_count from report_submission_violations
      where device_fingerprint = p_fingerprint and created_at > now() - interval '1 day';
    if violation_count >= 20 then
      insert into blocked_report_devices (device_fingerprint, reason)
        values (p_fingerprint, 'Automatically blocked after repeated rate-limit violations')
        on conflict (device_fingerprint) do nothing;
      return 'blocked';
    end if;
    return 'rate_limited';
  end if;

  insert into report_submissions_log (ip_hash, device_fingerprint) values (p_ip_hash, p_fingerprint);
  return 'allowed';
end;
$$;

-- Rate limiter ------------------------------------------------------------
-- Atomically checks caps; only logs the attempt when it is allowed, so a
-- rejected attempt does not push the sliding window forward.
create or replace function public.check_rate_limit(p_ip_hash text, p_fingerprint text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ip_hour_count    integer;
  device_day_count integer;
  last_ip_at       timestamptz;
begin
  select count(*) into ip_hour_count
    from report_submissions_log
    where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
  if ip_hour_count >= 5 then return false; end if;

  select count(*) into device_day_count
    from report_submissions_log
    where device_fingerprint = p_fingerprint and created_at > now() - interval '1 day';
  if device_day_count >= 10 then return false; end if;

  select max(created_at) into last_ip_at
    from report_submissions_log
    where ip_hash = p_ip_hash;
  if last_ip_at is not null and last_ip_at > now() - interval '300 seconds' then
    return false;
  end if;

  insert into report_submissions_log (ip_hash, device_fingerprint)
    values (p_ip_hash, p_fingerprint);
  return true;
end;
$$;

-- Aggregation -------------------------------------------------------------
create or replace function public.get_coverage_cells(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  p_precision integer,
  p_min_trust real,
  p_verified_only boolean
)
returns table (
  geohash_prefix text,
  center_lat double precision,
  center_lng double precision,
  total bigint,
  avg_download real,
  avg_upload real,
  avg_ping real,
  avg_trust real,
  jazz_count bigint,
  jazz_avg_download real,
  zong_count bigint,
  zong_avg_download real,
  ufone_count bigint,
  ufone_avg_download real
)
language sql
stable
as $$
  select
    left(geohash, p_precision)                                   as geohash_prefix,
    avg(latitude)                                                as center_lat,
    avg(longitude)                                               as center_lng,
    count(*)                                                     as total,
    avg(download_mbps)                                           as avg_download,
    avg(upload_mbps)                                             as avg_upload,
    avg(ping_ms)::real                                           as avg_ping,
    avg(trust_score)                                             as avg_trust,
    count(*) filter (where operator = 'Jazz')                    as jazz_count,
    avg(download_mbps) filter (where operator = 'Jazz')          as jazz_avg_download,
    count(*) filter (where operator = 'Zong')                    as zong_count,
    avg(download_mbps) filter (where operator = 'Zong')          as zong_avg_download,
    count(*) filter (where operator = 'Ufone')                   as ufone_count,
    avg(download_mbps) filter (where operator = 'Ufone')         as ufone_avg_download
  from public.reports
  where status = 'visible'
    and trust_score >= p_min_trust
    and (not p_verified_only or trust_score >= 0.75)
    and latitude between min_lat and max_lat
    and longitude between min_lng and max_lng
  group by left(geohash, p_precision);
$$;

-- Row Level Security ------------------------------------------------------
-- All app traffic uses the service-role key (bypasses RLS). Enabling RLS with
-- no anon policies denies direct anon/client access. To later expose a public
-- read of aggregated data, grant execute on get_coverage_cells to anon.
alter table public.reports enable row level security;
alter table public.report_submissions_log enable row level security;
alter table public.blocked_report_devices enable row level security;
alter table public.report_submission_violations enable row level security;
```
