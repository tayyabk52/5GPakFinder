-- Separate LTE and 5G coverage/speed evidence.
-- Run once in Supabase SQL Editor after the coverage schema.

alter table public.reports
  add column if not exists network_generation text not null default '5g'
  check (network_generation in ('4g', '5g'));

create index if not exists reports_generation_lookup_idx
  on public.reports (network_generation, status, geohash, created_at desc);

-- The app validates this too. Keeping validation in the database prevents a
-- future direct RPC consumer from querying an accidental mixed dataset.
create or replace function public.validate_coverage_generation(p_generation text)
returns text
language plpgsql
immutable
as $$
begin
  if p_generation not in ('4g', '5g') then
    raise exception 'Unsupported network generation';
  end if;
  return p_generation;
end;
$$;

-- Existing reports predate technology selection and remain classified as 5G.
-- New reports must explicitly choose 5G or 4G LTE in the app.
create or replace function public.get_coverage_cells(
  min_lat double precision, min_lng double precision, max_lat double precision, max_lng double precision,
  p_precision integer, p_min_trust real, p_verified_only boolean, p_generation text default '5g'
)
returns table (
  geohash_prefix text, center_lat double precision, center_lng double precision, total bigint,
  avg_download real, avg_upload real, avg_ping real, avg_trust real,
  jazz_count bigint, jazz_avg_download real, zong_count bigint, zong_avg_download real,
  ufone_count bigint, ufone_avg_download real
)
language sql stable as $$
  select left(geohash, p_precision), avg(latitude), avg(longitude), count(*),
    avg(download_mbps), avg(upload_mbps), avg(ping_ms)::real, avg(trust_score)::real,
    count(*) filter (where operator = 'Jazz'), avg(download_mbps) filter (where operator = 'Jazz'),
    count(*) filter (where operator = 'Zong'), avg(download_mbps) filter (where operator = 'Zong'),
    count(*) filter (where operator = 'Ufone'), avg(download_mbps) filter (where operator = 'Ufone')
  from public.reports
  where status = 'visible' and network_generation = public.validate_coverage_generation(p_generation) and trust_score >= p_min_trust
    and (not p_verified_only or trust_score >= .75)
    and latitude between min_lat and max_lat and longitude between min_lng and max_lng
  group by left(geohash, p_precision);
$$;
