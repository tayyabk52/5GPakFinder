-- Live data performance migration
-- Run after the coverage and Network Status migrations.
-- These indexes match the app's production viewport and incident queries.

create index if not exists reports_visible_generation_viewport_idx
  on public.reports (network_generation, latitude, longitude)
  include (geohash, operator, download_mbps, upload_mbps, ping_ms, trust_score)
  where status = 'visible';

create index if not exists outage_reports_incident_viewport_idx
  on public.outage_reports (incident_id, latitude, longitude)
  include (geohash)
  where report_state = 'affected';

create index if not exists outage_reports_area_window_idx
  on public.outage_reports (operator, (left(geohash, 6)), report_state, created_at desc)
  include (device_fingerprint, trust_score, issue_type);

create index if not exists network_incidents_history_idx
  on public.network_incidents (operator, first_reported_at desc);

create index if not exists network_incidents_active_idx
  on public.network_incidents (operator, last_reported_at desc)
  where status <> 'resolved';

-- One round trip for the history page instead of three independent RPC calls.
create or replace function public.get_network_history_dashboard(p_days integer, p_operator text default null)
returns jsonb
language sql
stable
as $$
  with selected as materialized (
    select * from public.network_incidents
    where first_reported_at >= now() - make_interval(days => p_days)
      and (p_operator is null or operator = p_operator)
  ), issue_totals as (
    select s.operator, s.status, issue.key, sum((issue.value)::integer)::integer as total
    from selected s cross join lateral jsonb_each(s.issue_breakdown) issue
    group by s.operator, s.status, issue.key
  ), summaries as (
    select s.operator, s.status, count(*)::bigint as incident_count,
      percentile_cont(.5) within group (order by extract(epoch from (coalesce(s.resolved_at, now()) - s.first_reported_at)) / 60)::real as median_duration_minutes,
      sum(extract(epoch from (coalesce(s.resolved_at, now()) - s.first_reported_at)) / 60)::real as total_affected_minutes,
      coalesce((select jsonb_object_agg(key, total) from issue_totals it where it.operator = s.operator and it.status = s.status), '{}'::jsonb) as issue_breakdown
    from selected s group by s.operator, s.status
  ), daily as (
    select first_reported_at::date as day, count(*)::bigint as incident_count
    from selected group by first_reported_at::date order by first_reported_at::date
  ), overview as (
    select count(*)::bigint as incident_count,
      percentile_cont(.5) within group (order by extract(epoch from (coalesce(resolved_at, now()) - first_reported_at)) / 60)::real as median_duration_minutes,
      coalesce(sum(extract(epoch from (coalesce(resolved_at, now()) - first_reported_at)) / 60), 0)::real as total_affected_minutes
    from selected
  )
  select jsonb_build_object(
    'incidents', coalesce((select jsonb_agg(jsonb_build_object('operator', operator, 'status', status, 'incidentCount', incident_count, 'medianDurationMinutes', median_duration_minutes, 'totalAffectedMinutes', total_affected_minutes, 'issueBreakdown', issue_breakdown) order by operator, status) from summaries), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'incidentCount', incident_count) order by day) from daily), '[]'::jsonb),
    'overview', (select jsonb_build_object('incidentCount', incident_count, 'medianDurationMinutes', median_duration_minutes, 'totalAffectedMinutes', total_affected_minutes) from overview)
  );
$$;

analyze public.reports;
analyze public.outage_reports;
analyze public.network_incidents;
