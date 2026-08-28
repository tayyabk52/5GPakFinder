import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { MANIFEST_PATH, ROOT, readReviewRows } from "./shared";

async function main() {
  const rows = await readReviewRows();
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Record<string, string | number>;
  const payload = JSON.stringify(rows.map((row) => ({ ...row,
    download_mbps: row.download_mbps === "" ? null : row.download_mbps,
    upload_mbps: row.upload_mbps === "" ? null : row.upload_mbps,
    ping_ms: row.ping_ms === "" ? null : row.ping_ms,
    jitter_ms: row.jitter_ms === "" ? null : row.jitter_ms,
    latitude: row.latitude === "" ? null : row.latitude,
    longitude: row.longitude === "" ? null : row.longitude,
  })));
  const version = String(manifest.datasetVersion).replaceAll("'", "''");
  const text = `-- Generated from data/reddit-speedtests/v1/review-decisions.csv. Do not edit by hand.
insert into public.reddit_import_batches (dataset_version, status, source_sha256, inventory_sha256, source_post_count, source_date_from, source_date_to, provenance_note)
values ('${version}', 'draft', '${manifest.sourceSha256}', '${manifest.inventorySha256}', ${manifest.sourcePostCount}, '${manifest.sourceDateFrom}', '${manifest.sourceDateTo}', '${String(manifest.collectionMethod).replaceAll("'", "''")}')
on conflict (dataset_version) do update set status = 'draft', source_sha256 = excluded.source_sha256, inventory_sha256 = excluded.inventory_sha256, source_post_count = excluded.source_post_count, source_date_from = excluded.source_date_from, source_date_to = excluded.source_date_to, provenance_note = excluded.provenance_note;

create temporary table reddit_seed_payload on commit drop as
select * from jsonb_to_recordset($reddit$${payload}$reddit$::jsonb) as x(observation_key text, post_id text, post_url text, source_title text, source_created_at timestamptz, content_type text, review_status text, exclusion_reason text, access_type text, raw_connection_type text, generation text, reported_brand text, network_group text, download_mbps numeric, upload_mbps numeric, ping_ms numeric, jitter_ms numeric, city text, area text, latitude double precision, longitude double precision, location_method text, location_confidence text, location_note text, metrics_source text, extraction_confidence text, speedtest_url text, evidence_url text, reviewer_note text);

with batch as (select id from public.reddit_import_batches where dataset_version = '${version}')
insert into public.reddit_source_posts (batch_id, post_id, post_url, title, post_created_at, content_type, review_status, exclusion_reason, source_checked_at)
select batch.id, p.post_id, p.post_url, p.source_title, p.source_created_at, p.content_type, p.review_status, nullif(p.exclusion_reason, ''), now() from reddit_seed_payload p cross join batch
on conflict (batch_id, post_id) do update set post_url = excluded.post_url, title = excluded.title, post_created_at = excluded.post_created_at, content_type = excluded.content_type, review_status = excluded.review_status, exclusion_reason = excluded.exclusion_reason, source_checked_at = excluded.source_checked_at;

with batch as (select id from public.reddit_import_batches where dataset_version = '${version}')
insert into public.reddit_speed_observations (batch_id, source_post_id, observation_key, access_type, raw_connection_type, generation, reported_brand, network_group, download_mbps, upload_mbps, ping_ms, jitter_ms, city, area, latitude, longitude, location_method, location_confidence, location_note, metrics_source, extraction_confidence, review_status, exclusion_reason, reviewer_note)
select batch.id, post.id, p.observation_key, p.access_type, p.raw_connection_type, nullif(p.generation, ''), nullif(p.reported_brand, ''), nullif(p.network_group, ''), p.download_mbps, p.upload_mbps, p.ping_ms, p.jitter_ms, nullif(p.city, ''), nullif(p.area, ''), p.latitude, p.longitude, p.location_method, p.location_confidence, nullif(p.location_note, ''), p.metrics_source, p.extraction_confidence, p.review_status, nullif(p.exclusion_reason, ''), nullif(p.reviewer_note, '')
from reddit_seed_payload p cross join batch join public.reddit_source_posts post on post.batch_id = batch.id and post.post_id = p.post_id
on conflict (batch_id, observation_key) do update set source_post_id = excluded.source_post_id, access_type = excluded.access_type, raw_connection_type = excluded.raw_connection_type, generation = excluded.generation, reported_brand = excluded.reported_brand, network_group = excluded.network_group, download_mbps = excluded.download_mbps, upload_mbps = excluded.upload_mbps, ping_ms = excluded.ping_ms, jitter_ms = excluded.jitter_ms, city = excluded.city, area = excluded.area, latitude = excluded.latitude, longitude = excluded.longitude, location_method = excluded.location_method, location_confidence = excluded.location_confidence, location_note = excluded.location_note, metrics_source = excluded.metrics_source, extraction_confidence = excluded.extraction_confidence, review_status = excluded.review_status, exclusion_reason = excluded.exclusion_reason, reviewer_note = excluded.reviewer_note;

with batch as (select id from public.reddit_import_batches where dataset_version = '${version}'), evidence as (
  select observation_key, 'reddit_post'::text evidence_type, post_url canonical_url, metrics_source, extraction_confidence from reddit_seed_payload
  union all select observation_key, 'reddit_media', evidence_url, metrics_source, extraction_confidence from reddit_seed_payload where evidence_url <> '' and evidence_url <> post_url and evidence_url <> speedtest_url
  union all select observation_key, 'ookla_result', speedtest_url, metrics_source, extraction_confidence from reddit_seed_payload where speedtest_url <> ''
)
insert into public.reddit_observation_evidence (observation_id, evidence_type, canonical_url, extraction_method, extraction_confidence)
select observation.id, evidence.evidence_type, evidence.canonical_url, evidence.metrics_source, evidence.extraction_confidence from evidence cross join batch join public.reddit_speed_observations observation on observation.batch_id = batch.id and observation.observation_key = evidence.observation_key
on conflict (observation_id, evidence_type, canonical_url) do update set extraction_method = excluded.extraction_method, extraction_confidence = excluded.extraction_confidence;

do $$
declare v_batch_id uuid; post_count integer; observation_count integer; approved_count integer;
begin
  select id into v_batch_id from public.reddit_import_batches where dataset_version = '${version}';
  select count(*) into post_count from public.reddit_source_posts where reddit_source_posts.batch_id = v_batch_id;
  select count(*), count(*) filter (where review_status = 'approved') into observation_count, approved_count from public.reddit_speed_observations where reddit_speed_observations.batch_id = v_batch_id;
  if post_count <> 83 or observation_count <> 83 or approved_count <> 49 then raise exception 'Reddit import reconciliation failed: posts %, observations %, approved %', post_count, observation_count, approved_count; end if;
  update public.reddit_import_batches set status = 'retired', published_at = null where status = 'published' and id <> v_batch_id;
  update public.reddit_import_batches set status = 'published', published_at = now() where id = v_batch_id;
end $$;
`;
  const output = path.join(ROOT, "supabase/migrations/202608280002_seed_reddit_speedtests.sql");
  await writeFile(output, text, "utf8");
  console.log(`Rendered ${rows.length} sanitized rows to ${path.relative(ROOT, output)}.`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
