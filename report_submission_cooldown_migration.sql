-- Reduce the minimum interval between reports while preserving all hourly,
-- daily, violation, and device-blocking limits.
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
     (last_ip_at is not null and last_ip_at > now() - interval '20 seconds') then
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

revoke execute on function public.check_report_submission(text, text) from public, anon, authenticated;
grant execute on function public.check_report_submission(text, text) to service_role;
