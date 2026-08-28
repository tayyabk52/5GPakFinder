create extension if not exists pgcrypto;

create table public.reddit_import_batches (
  id uuid primary key default gen_random_uuid(),
  dataset_version text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  source_sha256 text not null,
  inventory_sha256 text not null,
  source_post_count integer not null check (source_post_count > 0),
  source_date_from timestamptz,
  source_date_to timestamptz,
  provenance_note text not null,
  imported_at timestamptz not null default now(),
  published_at timestamptz
);
create unique index reddit_one_published_batch on public.reddit_import_batches ((status)) where status = 'published';

create table public.reddit_source_posts (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.reddit_import_batches(id) on delete cascade,
  post_id text not null,
  post_url text not null,
  title text not null,
  post_created_at timestamptz not null,
  content_type text not null,
  source_status text not null default 'available' check (source_status in ('available', 'deleted', 'removed', 'unavailable')),
  review_status text not null check (review_status in ('approved', 'needs_review', 'unresolved', 'excluded')),
  exclusion_reason text,
  source_checked_at timestamptz,
  unique (batch_id, post_id),
  unique (batch_id, post_url)
);

create table public.reddit_speed_observations (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.reddit_import_batches(id) on delete cascade,
  source_post_id uuid not null references public.reddit_source_posts(id) on delete cascade,
  observation_key text not null,
  access_type text not null,
  raw_connection_type text not null,
  generation text check (generation in ('4g', '5g')),
  reported_brand text,
  network_group text,
  download_mbps numeric(8,2) check (download_mbps > 0 and download_mbps <= 5000),
  upload_mbps numeric(8,2) check (upload_mbps > 0 and upload_mbps <= 5000),
  ping_ms numeric(8,2) check (ping_ms >= 1 and ping_ms <= 2000),
  jitter_ms numeric(8,2) check (jitter_ms >= 0 and jitter_ms <= 2000),
  city text,
  area text,
  latitude double precision check (latitude between 23 and 37),
  longitude double precision check (longitude between 60 and 78),
  location_method text not null check (location_method in ('source_coordinates', 'named_landmark', 'area_centroid', 'city_centroid', 'multi_area_centroid', 'unmapped')),
  location_confidence text not null check (location_confidence in ('high', 'medium', 'low', 'none')),
  location_note text,
  metrics_source text not null,
  extraction_confidence text not null check (extraction_confidence in ('high', 'medium', 'low', 'none')),
  review_status text not null check (review_status in ('approved', 'needs_review', 'unresolved', 'excluded')),
  exclusion_reason text,
  reviewer_note text,
  unique (batch_id, observation_key),
  check ((latitude is null) = (longitude is null)),
  check (location_method <> 'unmapped' or latitude is null)
);

create table public.reddit_observation_evidence (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.reddit_speed_observations(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('reddit_post', 'reddit_media', 'ookla_result', 'ocr')),
  canonical_url text not null,
  extraction_method text not null,
  extraction_confidence text not null check (extraction_confidence in ('high', 'medium', 'low', 'none')),
  unique (observation_id, evidence_type, canonical_url)
);

create index reddit_posts_batch_date_idx on public.reddit_source_posts (batch_id, post_created_at desc);
create index reddit_observations_public_idx on public.reddit_speed_observations (batch_id, review_status, generation, network_group);
create index reddit_observations_source_post_idx on public.reddit_speed_observations (source_post_id);
create index reddit_observations_map_idx on public.reddit_speed_observations (batch_id, latitude, longitude) where review_status = 'approved';

alter table public.reddit_import_batches enable row level security;
alter table public.reddit_source_posts enable row level security;
alter table public.reddit_speed_observations enable row level security;
alter table public.reddit_observation_evidence enable row level security;

revoke all on public.reddit_import_batches from public, anon, authenticated;
revoke all on public.reddit_source_posts from public, anon, authenticated;
revoke all on public.reddit_speed_observations from public, anon, authenticated;
revoke all on public.reddit_observation_evidence from public, anon, authenticated;
