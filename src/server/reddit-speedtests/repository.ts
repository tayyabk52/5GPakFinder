import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RedditMapCollection, RedditObservation, RedditSummary, RedditSummaryGroup } from "@/features/reddit-speedtests/types";

type DbRow = Record<string, unknown>;

const numberOrNull = (value: unknown) => value == null ? null : Number(value);
const textOrNull = (value: unknown) => typeof value === "string" && value ? value : null;

function percentile(values: number[], value: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * value;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return sorted[lower + 1] == null ? sorted[lower] : sorted[lower] + fraction * (sorted[lower + 1] - sorted[lower]);
}

function summarizeGroup(name: string, rows: RedditObservation[]): RedditSummaryGroup {
  const downloads = rows.flatMap((row) => row.downloadMbps == null ? [] : [row.downloadMbps]);
  const pings = rows.flatMap((row) => row.pingMs == null ? [] : [row.pingMs]);
  return {
    name,
    observationCount: rows.length,
    postCount: new Set(rows.map((row) => row.postId)).size,
    medianDownload: percentile(downloads, .5),
    meanDownload: downloads.length ? downloads.reduce((sum, item) => sum + item, 0) / downloads.length : null,
    p90Download: percentile(downloads, .9),
    medianPing: percentile(pings, .5),
  };
}

async function publishedBatch() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const manifest = JSON.parse(await readFile(path.join(process.cwd(), "data/reddit-speedtests/v1/manifest.json"), "utf8")) as Record<string, unknown>;
    return { id: "local-snapshot", dataset_version: manifest.datasetVersion, source_post_count: manifest.sourcePostCount, source_date_from: manifest.sourceDateFrom, source_date_to: manifest.sourceDateTo };
  }
  const { data, error } = await createSupabaseServerClient().from("reddit_import_batches").select("id,dataset_version,source_post_count,source_date_from,source_date_to").eq("status", "published").maybeSingle();
  if (error) throw error;
  return data as DbRow | null;
}

export async function getRedditObservations(): Promise<RedditObservation[]> {
  const batch = await publishedBatch();
  if (!batch) return [];
  if (batch.id === "local-snapshot") {
    const records = parse(await readFile(path.join(process.cwd(), "data/reddit-speedtests/v1/review-decisions.csv"), "utf8"), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
    return records.map((row) => ({
      id: row.observation_key, observationKey: row.observation_key, postId: row.post_id, title: row.source_title, postUrl: row.post_url, createdAt: row.source_created_at,
      accessType: row.access_type, generation: (row.generation || null) as RedditObservation["generation"], reportedBrand: row.reported_brand || null, networkGroup: row.network_group || null,
      downloadMbps: row.download_mbps ? Number(row.download_mbps) : null, uploadMbps: row.upload_mbps ? Number(row.upload_mbps) : null, pingMs: row.ping_ms ? Number(row.ping_ms) : null, jitterMs: row.jitter_ms ? Number(row.jitter_ms) : null,
      city: row.city || null, area: row.area || null, latitude: row.latitude ? Number(row.latitude) : null, longitude: row.longitude ? Number(row.longitude) : null,
      locationMethod: row.location_method as RedditObservation["locationMethod"], locationConfidence: row.location_confidence as RedditObservation["locationConfidence"], locationNote: row.location_note || null,
      metricsSource: row.metrics_source, extractionConfidence: row.extraction_confidence as RedditObservation["extractionConfidence"], reviewStatus: row.review_status as RedditObservation["reviewStatus"],
      exclusionReason: row.exclusion_reason || null, evidenceUrl: row.evidence_url || null, speedtestUrl: row.speedtest_url || null, reviewerNote: row.reviewer_note || null,
    }));
  }
  const client = createSupabaseServerClient();
  const { data, error } = await client.from("reddit_speed_observations").select("*, reddit_source_posts!inner(post_id,post_url,title,post_created_at), reddit_observation_evidence(evidence_type,canonical_url)").eq("batch_id", batch.id).order("observation_key");
  if (error) throw error;
  return (data as DbRow[]).map((row) => {
    const post = row.reddit_source_posts as DbRow;
    const evidence = (row.reddit_observation_evidence as DbRow[] | null) ?? [];
    const speedtest = evidence.find((item) => item.evidence_type === "ookla_result");
    const sourceEvidence = evidence.find((item) => item.evidence_type === "reddit_media") ?? evidence.find((item) => item.evidence_type === "reddit_post");
    return {
      id: String(row.id), observationKey: String(row.observation_key), postId: String(post.post_id), title: String(post.title), postUrl: String(post.post_url), createdAt: String(post.post_created_at),
      accessType: String(row.access_type), generation: row.generation as RedditObservation["generation"], reportedBrand: textOrNull(row.reported_brand), networkGroup: textOrNull(row.network_group),
      downloadMbps: numberOrNull(row.download_mbps), uploadMbps: numberOrNull(row.upload_mbps), pingMs: numberOrNull(row.ping_ms), jitterMs: numberOrNull(row.jitter_ms),
      city: textOrNull(row.city), area: textOrNull(row.area), latitude: numberOrNull(row.latitude), longitude: numberOrNull(row.longitude), locationMethod: row.location_method as RedditObservation["locationMethod"],
      locationConfidence: row.location_confidence as RedditObservation["locationConfidence"], locationNote: textOrNull(row.location_note), metricsSource: String(row.metrics_source), extractionConfidence: row.extraction_confidence as RedditObservation["extractionConfidence"],
      reviewStatus: row.review_status as RedditObservation["reviewStatus"], exclusionReason: textOrNull(row.exclusion_reason), evidenceUrl: sourceEvidence ? String(sourceEvidence.canonical_url) : null,
      speedtestUrl: speedtest ? String(speedtest.canonical_url) : null, reviewerNote: textOrNull(row.reviewer_note),
    };
  });
}

export async function getRedditObservation(postId: string) {
  return (await getRedditObservations()).find((row) => row.postId === postId) ?? null;
}

export async function getRedditSummary(generation: "4g" | "5g"): Promise<RedditSummary | null> {
  const batch = await publishedBatch();
  if (!batch) return null;
  const all = await getRedditObservations();
  const approved = all.filter((row) => row.reviewStatus === "approved" && row.generation === generation && row.downloadMbps != null);
  const group = (key: "networkGroup" | "city") => [...new Set(approved.map((row) => row[key]).filter((value): value is string => Boolean(value)))].map((name) => summarizeGroup(name, approved.filter((row) => row[key] === name))).sort((a, b) => b.observationCount - a.observationCount);
  const total = summarizeGroup("All", approved);
  return {
    datasetVersion: String(batch.dataset_version), sourcePostCount: Number(batch.source_post_count), observationCount: approved.length,
    mappedObservationCount: approved.filter((row) => row.latitude != null).length, unresolvedCount: all.filter((row) => row.reviewStatus === "unresolved").length,
    excludedCount: all.filter((row) => row.reviewStatus === "excluded").length, needsReviewCount: all.filter((row) => row.reviewStatus === "needs_review").length,
    dateFrom: textOrNull(batch.source_date_from), dateTo: textOrNull(batch.source_date_to), medianDownload: total.medianDownload, meanDownload: total.meanDownload,
    p90Download: total.p90Download, medianPing: total.medianPing, networks: group("networkGroup"), cities: group("city"),
  };
}

export async function getRedditMapData(input: { minLat: number; minLng: number; maxLat: number; maxLng: number; generation: "4g" | "5g"; network?: string }): Promise<RedditMapCollection> {
  const rows = (await getRedditObservations()).filter((row) => row.reviewStatus === "approved" && row.generation === input.generation && row.downloadMbps != null && row.latitude != null && row.longitude != null && row.latitude >= input.minLat && row.latitude <= input.maxLat && row.longitude >= input.minLng && row.longitude <= input.maxLng && (!input.network || row.reportedBrand === input.network || row.networkGroup === input.network));
  return { type: "FeatureCollection", features: rows.map((row) => ({ type: "Feature", id: row.id, geometry: { type: "Point", coordinates: [row.longitude!, row.latitude!] }, properties: { observationId: row.id, postId: row.postId, title: row.title, postUrl: row.postUrl, createdAt: row.createdAt, generation: row.generation!, reportedBrand: row.reportedBrand!, networkGroup: row.networkGroup!, downloadMbps: row.downloadMbps!, uploadMbps: row.uploadMbps, pingMs: row.pingMs, city: row.city, area: row.area, locationMethod: row.locationMethod, locationConfidence: row.locationConfidence, metricsSource: row.metricsSource, extractionConfidence: row.extractionConfidence } })) };
}
