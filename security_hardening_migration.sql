-- Production security hardening. Run after all existing schema migrations.
-- The application uses SUPABASE_SERVICE_ROLE_KEY only on the server. These
-- revocations ensure browser/public Supabase keys cannot read raw reports,
-- fingerprints, IP hashes, logs, or write directly to protected tables.

create table if not exists public.speedtest_request_log (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  request_kind text not null check (request_kind in ('download', 'upload', 'resolve')),
  created_at timestamptz not null default now()
);
create index if not exists speedtest_request_log_limit_idx
  on public.speedtest_request_log (ip_hash, request_kind, created_at desc);

create or replace function public.check_speedtest_request(p_ip_hash text, p_kind text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_limit integer;
  v_window interval;
begin
  if p_ip_hash is null or length(p_ip_hash) < 32 or p_kind not in ('download', 'upload', 'resolve') then
    raise exception 'Invalid speedtest request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('speedtest:' || p_kind || ':' || p_ip_hash, 0));
  v_limit := case p_kind when 'download' then 12 when 'upload' then 8 else 8 end;
  v_window := case p_kind when 'resolve' then interval '1 hour' else interval '10 minutes' end;

  select count(*) into v_count from public.speedtest_request_log
    where ip_hash = p_ip_hash and request_kind = p_kind and created_at > now() - v_window;
  if v_count >= v_limit then return 'rate_limited'; end if;

  insert into public.speedtest_request_log(ip_hash, request_kind) values (p_ip_hash, p_kind);
  return 'allowed';
end;
$$;

alter table public.speedtest_request_log enable row level security;

revoke all on table public.reports, public.report_submissions_log, public.blocked_report_devices,
  public.report_submission_violations, public.outage_reports, public.network_incidents,
  public.outage_submission_log, public.outage_submission_violations, public.blocked_outage_devices,
  public.bug_reports, public.bug_submission_log, public.blocked_bug_devices,
  public.speedtest_request_log from anon, authenticated;

revoke execute on function public.check_report_submission(text, text) from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, text) from public, anon, authenticated;
revoke execute on function public.check_outage_submission(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.check_bug_submission(text, text) from public, anon, authenticated;
revoke execute on function public.check_speedtest_request(text, text) from public, anon, authenticated;
revoke execute on function public.get_coverage_cells(double precision, double precision, double precision, double precision, integer, real, boolean, text) from public, anon, authenticated;
revoke execute on function public.get_affected_cells(double precision, double precision, double precision, double precision, integer, text) from public, anon, authenticated;
revoke execute on function public.get_network_history(integer, text) from public, anon, authenticated;
revoke execute on function public.get_network_history_overview(integer, text) from public, anon, authenticated;
revoke execute on function public.get_network_history_daily(integer, text) from public, anon, authenticated;
revoke execute on function public.get_network_history_dashboard(integer, text) from public, anon, authenticated;
revoke execute on function public.reconcile_network_incidents() from public, anon, authenticated;

grant execute on function public.check_report_submission(text, text) to service_role;
grant execute on function public.check_rate_limit(text, text) to service_role;
grant execute on function public.check_outage_submission(text, text, text, text) to service_role;
grant execute on function public.check_bug_submission(text, text) to service_role;
grant execute on function public.check_speedtest_request(text, text) to service_role;
grant execute on function public.get_coverage_cells(double precision, double precision, double precision, double precision, integer, real, boolean, text) to service_role;
grant execute on function public.get_affected_cells(double precision, double precision, double precision, double precision, integer, text) to service_role;
grant execute on function public.get_network_history(integer, text) to service_role;
grant execute on function public.get_network_history_overview(integer, text) to service_role;
grant execute on function public.get_network_history_daily(integer, text) to service_role;
grant execute on function public.get_network_history_dashboard(integer, text) to service_role;
grant execute on function public.reconcile_network_incidents() to service_role;
