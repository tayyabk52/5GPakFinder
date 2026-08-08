-- Pakistan-only report guard
-- Run after the base coverage and Network Status schemas.
-- API routes additionally reject a known foreign Vercel edge country before an
-- insert. This constraint protects the tables from direct/service-side writes.

create or replace function public.is_pakistan_report_coordinate(
  p_latitude double precision,
  p_longitude double precision
)
returns boolean
language sql
immutable
strict
as $$
  select p_latitude between 23 and 37 and p_longitude between 60 and 78;
$$;

alter table public.reports
  drop constraint if exists reports_pakistan_coordinate_check;
alter table public.reports
  add constraint reports_pakistan_coordinate_check
  check (public.is_pakistan_report_coordinate(latitude, longitude));

alter table public.outage_reports
  drop constraint if exists outage_reports_pakistan_coordinate_check;
alter table public.outage_reports
  add constraint outage_reports_pakistan_coordinate_check
  check (public.is_pakistan_report_coordinate(latitude, longitude));
