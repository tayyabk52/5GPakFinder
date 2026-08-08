-- Coverage Insights aggregate API
-- Run once in Supabase SQL Editor. It returns aggregates only; no raw locations or identifiers.

-- A default parameter does not make this a no-argument function in Postgres;
-- drop the real text signature so this migration is safe to re-run.
drop function if exists public.get_coverage_insights(text);

create function public.get_coverage_insights(p_generation text default '5g')
returns jsonb
language sql
stable
as $$
  with visible_reports as (
    select * from public.reports where status = 'visible' and trust_score >= .45 and network_generation = public.validate_coverage_generation(p_generation)
  ),
  city_bounds(name, min_lat, max_lat, min_lng, max_lng) as (
    values
      ('Karachi', 24.70::double precision, 25.16::double precision, 66.85::double precision, 67.38::double precision),
      ('Lahore', 31.30::double precision, 31.70::double precision, 74.10::double precision, 74.55::double precision),
      ('Islamabad', 33.55::double precision, 33.85::double precision, 72.80::double precision, 73.28::double precision),
      ('Rawalpindi', 33.45::double precision, 33.75::double precision, 72.85::double precision, 73.20::double precision),
      ('Faisalabad', 31.25::double precision, 31.55::double precision, 72.95::double precision, 73.25::double precision),
      ('Peshawar', 33.90::double precision, 34.15::double precision, 71.40::double precision, 71.75::double precision)
  ),
  city_stats as (
    select c.name, count(r.*)::integer as report_count,
      count(r.*) filter (where r.download_mbps is not null)::integer as speed_sample_count,
      avg(r.download_mbps)::real as avg_download,
      avg(r.upload_mbps)::real as avg_upload,
      avg(r.ping_ms)::real as avg_ping,
      avg(r.trust_score)::real as avg_trust,
      max(r.created_at) as last_report_at
    from city_bounds c left join visible_reports r
      on r.latitude between c.min_lat and c.max_lat and r.longitude between c.min_lng and c.max_lng
    group by c.name
  ),
  operator_stats as (
    select operator, count(*)::integer as report_count,
      count(*) filter (where download_mbps is not null)::integer as speed_sample_count,
      avg(download_mbps)::real as avg_download,
      avg(upload_mbps)::real as avg_upload,
      avg(ping_ms)::real as avg_ping
    from visible_reports group by operator
  )
  select jsonb_build_object(
    'totalReports', (select count(*)::integer from visible_reports),
    'speedSampleCount', (select count(*)::integer from visible_reports where download_mbps is not null),
    'averageDownload', (select avg(download_mbps)::real from visible_reports),
    'averageUpload', (select avg(upload_mbps)::real from visible_reports),
    'averagePing', (select avg(ping_ms)::real from visible_reports),
    'averageTrust', (select avg(trust_score)::real from visible_reports),
    'lastReportAt', (select max(created_at) from visible_reports),
    'operators', coalesce((select jsonb_agg(jsonb_build_object('operator', operator, 'reportCount', report_count, 'speedSampleCount', speed_sample_count, 'averageDownload', avg_download, 'averageUpload', avg_upload, 'averagePing', avg_ping) order by operator) from operator_stats), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(jsonb_build_object('city', name, 'reportCount', report_count, 'speedSampleCount', speed_sample_count, 'averageDownload', avg_download, 'averageUpload', avg_upload, 'averagePing', avg_ping, 'averageTrust', avg_trust, 'lastReportAt', last_report_at) order by report_count desc, name) from city_stats), '[]'::jsonb)
  );
$$;
