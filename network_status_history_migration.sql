-- Network Status lifecycle + History migration
-- Run once in Supabase SQL Editor after the original Network Status schema.

create index if not exists outage_reports_incident_created_idx
  on public.outage_reports (incident_id, created_at desc);

create or replace function public.refresh_network_incident(p_incident_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_incident public.network_incidents%rowtype;
  v_affected_15 integer;
  v_cells_15 integer;
  v_affected_30 integer;
  v_cells_30 integer;
  v_normal integer;
  v_last_affected timestamptz;
  v_status text;
  v_breakdown jsonb;
begin
  select * into v_incident from public.network_incidents where id = p_incident_id for update;
  if not found then return; end if;

  select
    count(distinct device_fingerprint) filter (where trust_score >= .6 and created_at >= now() - interval '15 minutes'),
    count(distinct geohash) filter (where trust_score >= .6 and created_at >= now() - interval '15 minutes'),
    count(distinct device_fingerprint) filter (where trust_score >= .6 and created_at >= now() - interval '30 minutes'),
    count(distinct geohash) filter (where trust_score >= .6 and created_at >= now() - interval '30 minutes'),
    max(created_at)
  into v_affected_15, v_cells_15, v_affected_30, v_cells_30, v_last_affected
  from public.outage_reports
  where operator = v_incident.operator
    and left(geohash, 6) = v_incident.geohash_prefix
    and report_state = 'affected';

  select count(distinct device_fingerprint) into v_normal
  from public.outage_reports
  where operator = v_incident.operator
    and left(geohash, 6) = v_incident.geohash_prefix
    and report_state = 'working'
    and created_at > coalesce(v_last_affected, v_incident.last_reported_at);

  if v_last_affected is null or v_last_affected < now() - interval '90 minutes' then
    v_status := 'resolved';
  elsif v_normal >= 3 then
    v_status := 'recovering';
  elsif v_affected_30 >= 8 and v_cells_30 >= 3 then
    v_status := 'high_agreement';
  else
    v_status := 'possible';
  end if;

  select coalesce(jsonb_object_agg(issue_type, report_count), '{}'::jsonb) into v_breakdown
  from (
    select issue_type, count(*)::integer as report_count
    from public.outage_reports
    where incident_id = p_incident_id and report_state = 'affected'
    group by issue_type
  ) counts;

  update public.network_incidents
  set status = v_status,
      last_reported_at = coalesce(v_last_affected, v_incident.last_reported_at),
      resolved_at = case when v_status = 'resolved' then coalesce(v_incident.resolved_at, now()) else null end,
      report_total = (select count(*) from public.outage_reports where incident_id = p_incident_id and report_state = 'affected'),
      unique_device_total = (select count(distinct device_fingerprint) from public.outage_reports where incident_id = p_incident_id and report_state = 'affected'),
      normal_confirmations = v_normal,
      confidence = least(.98, greatest(.35, (.45 + least(v_affected_30, 8)::real / 16 + least(v_cells_30, 3)::real / 12))),
      issue_breakdown = v_breakdown
  where id = p_incident_id;
end;
$$;

create or replace function public.evaluate_network_area(p_operator text, p_geohash_prefix text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_incident_id uuid;
  v_affected_15 integer;
  v_cells_15 integer;
  v_affected_30 integer;
  v_cells_30 integer;
  v_initial_status text;
begin
  select id into v_incident_id
  from public.network_incidents
  where operator = p_operator and geohash_prefix = p_geohash_prefix
    and status <> 'resolved' and last_reported_at >= now() - interval '90 minutes'
  order by last_reported_at desc limit 1;

  if v_incident_id is null then
    select
      count(distinct device_fingerprint) filter (where trust_score >= .6 and created_at >= now() - interval '15 minutes'),
      count(distinct geohash) filter (where trust_score >= .6 and created_at >= now() - interval '15 minutes'),
      count(distinct device_fingerprint) filter (where trust_score >= .6 and created_at >= now() - interval '30 minutes'),
      count(distinct geohash) filter (where trust_score >= .6 and created_at >= now() - interval '30 minutes')
    into v_affected_15, v_cells_15, v_affected_30, v_cells_30
    from public.outage_reports
    where operator = p_operator and left(geohash, 6) = p_geohash_prefix and report_state = 'affected';

    if v_affected_30 >= 8 and v_cells_30 >= 3 then v_initial_status := 'high_agreement';
    elsif v_affected_15 >= 3 and v_cells_15 >= 2 then v_initial_status := 'possible';
    else return;
    end if;

    insert into public.network_incidents (operator, geohash_prefix, status, first_reported_at, last_reported_at)
    select p_operator, p_geohash_prefix, v_initial_status, min(created_at), max(created_at)
    from public.outage_reports
    where operator = p_operator and left(geohash, 6) = p_geohash_prefix
      and report_state = 'affected' and created_at >= now() - interval '30 minutes'
    returning id into v_incident_id;
  end if;

  update public.outage_reports
  set incident_id = v_incident_id
  where operator = p_operator and left(geohash, 6) = p_geohash_prefix
    and incident_id is null and created_at >= now() - interval '90 minutes';

  perform public.refresh_network_incident(v_incident_id);
end;
$$;

create or replace function public.on_outage_report_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.evaluate_network_area(new.operator, left(new.geohash, 6));
  return new;
end;
$$;

drop trigger if exists outage_report_lifecycle on public.outage_reports;
create trigger outage_report_lifecycle
after insert on public.outage_reports
for each row execute function public.on_outage_report_insert();

create or replace function public.get_affected_cells(
  min_lat double precision, min_lng double precision, max_lat double precision, max_lng double precision,
  p_precision integer, p_operator text default null
)
returns table(geohash_prefix text, center_lat double precision, center_lng double precision, operator text,
  report_count bigint, confidence real, status text, first_reported_at timestamptz, issue_breakdown jsonb)
language sql stable as $$
  select left(r.geohash, p_precision), avg(r.latitude)::double precision, avg(r.longitude)::double precision,
    i.operator, count(*)::bigint, i.confidence, i.status, i.first_reported_at, i.issue_breakdown
  from public.network_incidents i
  join public.outage_reports r on r.incident_id = i.id and r.report_state = 'affected'
  where i.status <> 'resolved' and r.latitude between min_lat and max_lat and r.longitude between min_lng and max_lng
    and (p_operator is null or i.operator = p_operator)
  group by left(r.geohash, p_precision), i.id;
$$;

create or replace function public.get_network_history(p_days integer, p_operator text default null)
returns table(operator text, status text, incident_count bigint, median_duration_minutes real,
  total_affected_minutes real, issue_breakdown jsonb)
language sql stable as $$
  with selected as (
    select * from public.network_incidents
    where first_reported_at >= now() - make_interval(days => p_days)
      and (p_operator is null or operator = p_operator)
  ), issue_totals as (
    select s.operator, s.status, issue.key, sum((issue.value)::integer)::integer as total
    from selected s cross join lateral jsonb_each(s.issue_breakdown) issue
    group by s.operator, s.status, issue.key
  )
  select s.operator, s.status, count(*)::bigint,
    percentile_cont(.5) within group (order by extract(epoch from (coalesce(s.resolved_at, now()) - s.first_reported_at)) / 60)::real,
    sum(extract(epoch from (coalesce(s.resolved_at, now()) - s.first_reported_at)) / 60)::real,
    coalesce((select jsonb_object_agg(key, total) from issue_totals it where it.operator = s.operator and it.status = s.status), '{}'::jsonb)
  from selected s group by s.operator, s.status;
$$;

create or replace function public.get_network_history_overview(p_days integer, p_operator text default null)
returns table(incident_count bigint, median_duration_minutes real, total_affected_minutes real)
language sql stable as $$
  select count(*)::bigint,
    percentile_cont(.5) within group (order by extract(epoch from (coalesce(resolved_at, now()) - first_reported_at)) / 60)::real,
    coalesce(sum(extract(epoch from (coalesce(resolved_at, now()) - first_reported_at)) / 60), 0)::real
  from public.network_incidents
  where first_reported_at >= now() - make_interval(days => p_days)
    and (p_operator is null or operator = p_operator);
$$;

create or replace function public.get_network_history_daily(p_days integer, p_operator text default null)
returns table(day date, incident_count bigint)
language sql stable as $$
  select first_reported_at::date, count(*)::bigint
  from public.network_incidents
  where first_reported_at >= now() - make_interval(days => p_days)
    and (p_operator is null or operator = p_operator)
  group by first_reported_at::date order by first_reported_at::date;
$$;

create or replace function public.reconcile_network_incidents()
returns void language plpgsql security definer set search_path = public as $$
declare v_area record; v_incident record;
begin
  for v_area in select distinct operator, left(geohash, 6) as geohash_prefix from public.outage_reports
    where report_state = 'affected' and created_at >= now() - interval '30 minutes'
  loop perform public.evaluate_network_area(v_area.operator, v_area.geohash_prefix); end loop;
  for v_incident in select id from public.network_incidents where status <> 'resolved'
  loop perform public.refresh_network_incident(v_incident.id); end loop;
end;
$$;
