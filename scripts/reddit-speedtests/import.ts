import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { MANIFEST_PATH, nullableNumber, readReviewRows } from "./shared";

async function main() {
const commit = process.argv.includes("--commit");
const rows = await readReviewRows();
const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as { datasetVersion: string; sourceSha256: string; inventorySha256: string; sourcePostCount: number; sourceDateFrom: string; sourceDateTo: string; collectionMethod: string };
console.log(`Validated ${rows.length} rows for ${manifest.datasetVersion}. Mode: ${commit ? "COMMIT" : "DRY RUN"}.`);
if (!commit) process.exit(0);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --commit.");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: batch, error: batchError } = await supabase.from("reddit_import_batches").upsert({ dataset_version: manifest.datasetVersion, status: "draft", source_sha256: manifest.sourceSha256, inventory_sha256: manifest.inventorySha256, source_post_count: manifest.sourcePostCount, source_date_from: manifest.sourceDateFrom, source_date_to: manifest.sourceDateTo, provenance_note: manifest.collectionMethod }, { onConflict: "dataset_version" }).select("id").single();
if (batchError) throw batchError;

const postRows = [...new Map(rows.map((row) => [row.post_id, row])).values()].map((row) => ({ batch_id: batch.id, post_id: row.post_id, post_url: row.post_url, title: row.source_title, post_created_at: row.source_created_at, content_type: row.content_type, review_status: row.review_status, exclusion_reason: row.exclusion_reason || null }));
const { data: posts, error: postsError } = await supabase.from("reddit_source_posts").upsert(postRows, { onConflict: "batch_id,post_id" }).select("id,post_id");
if (postsError) throw postsError;
const postMap = new Map(posts.map((post) => [post.post_id, post.id]));

const observations = rows.map((row) => ({ batch_id: batch.id, source_post_id: postMap.get(row.post_id), observation_key: row.observation_key, access_type: row.access_type, raw_connection_type: row.raw_connection_type, generation: row.generation || null, reported_brand: row.reported_brand || null, network_group: row.network_group || null, download_mbps: nullableNumber(row.download_mbps), upload_mbps: nullableNumber(row.upload_mbps), ping_ms: nullableNumber(row.ping_ms), jitter_ms: nullableNumber(row.jitter_ms), city: row.city || null, area: row.area || null, latitude: nullableNumber(row.latitude), longitude: nullableNumber(row.longitude), location_method: row.location_method, location_confidence: row.location_confidence, location_note: row.location_note || null, metrics_source: row.metrics_source, extraction_confidence: row.extraction_confidence, review_status: row.review_status, exclusion_reason: row.exclusion_reason || null, reviewer_note: row.reviewer_note || null }));
const { data: saved, error: observationError } = await supabase.from("reddit_speed_observations").upsert(observations, { onConflict: "batch_id,observation_key" }).select("id,observation_key");
if (observationError) throw observationError;
const observationMap = new Map(saved.map((row) => [row.observation_key, row.id]));

const evidence = rows.flatMap((row) => {
  const id = observationMap.get(row.observation_key);
  const values = [{ evidence_type: "reddit_post", canonical_url: row.post_url }, ...(row.speedtest_url ? [{ evidence_type: "ookla_result", canonical_url: row.speedtest_url }] : []), ...(row.evidence_url && row.evidence_url !== row.post_url && row.evidence_url !== row.speedtest_url ? [{ evidence_type: "reddit_media", canonical_url: row.evidence_url }] : [])];
  return values.map((item) => ({ observation_id: id, ...item, extraction_method: row.metrics_source, extraction_confidence: row.extraction_confidence }));
});
const { error: evidenceError } = await supabase.from("reddit_observation_evidence").upsert(evidence, { onConflict: "observation_id,evidence_type,canonical_url" });
if (evidenceError) throw evidenceError;
console.log(`Imported ${postRows.length} posts and ${observations.length} observations as draft batch ${batch.id}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
