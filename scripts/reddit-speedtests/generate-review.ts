import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { REDDIT_DATASET_VERSION } from "../../src/features/reddit-speedtests/types";
import { DATA_DIR, MANIFEST_PATH, REVIEW_PATH, sha256 } from "./shared";

type RawRow = Record<string, string>;
type Coordinates = { lat: number; lng: number; method: string; confidence: string; note: string };

const sourcePath = process.argv[2] ?? "C:/Users/hp/Downloads/pakistani_tech_speedtests.csv";
const inventoryPath = process.argv[3] ?? "C:/Users/hp/Downloads/pakistani_tech_speedtests_inventory.csv";

const cityCoordinates: Record<string, [number, number]> = {
  Charsadda: [34.1494, 71.7428], Faisalabad: [31.4504, 73.135], Gujranwala: [32.1877, 74.1945], Hyderabad: [25.396, 68.3578],
  Islamabad: [33.6844, 73.0479], Karachi: [24.8607, 67.0011], Lahore: [31.5204, 74.3587], Multan: [30.1575, 71.5249], Rawalpindi: [33.5651, 73.0169],
};

const areaCoordinates: Record<string, [number, number]> = {
  "Islamabad|Bahria Town Phase 7": [33.526, 73.123], "Islamabad|F-11": [33.684, 72.989], "Islamabad|F-6": [33.7294, 73.0753], "Islamabad|F-7": [33.7211, 73.055],
  "Karachi|North Karachi": [24.9773, 67.0691], "Karachi|Shahrah-e-Faisal": [24.8724, 67.0714],
  "Lahore|Anarkali": [31.573, 74.3095], "Lahore|DHA": [31.4697, 74.4143], "Lahore|Faisal Town": [31.4781, 74.3037], "Lahore|Gulberg": [31.5102, 74.3441],
  "Lahore|Jinnah Hospital": [31.4847, 74.2964], "Lahore|Johar Town": [31.4697, 74.2728], "Multan|Gulgasht": [30.2022, 71.4732],
  "Rawalpindi|Commercial Market": [33.6321, 73.0667], "Rawalpindi|Kohistan Enclave": [33.715, 72.81], "Rawalpindi|Saddar": [33.5966, 73.052],
};

const multiAreaCoordinates: Record<string, [number, number]> = {
  "Lahore|Anarkali;CPID": [31.573, 74.3095], "Lahore|Faisal Town;Link Road;Jinnah Hospital": [31.484, 74.303], "Lahore|Hall Road;Mall Road": [31.568, 74.321],
};

const csv = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

function inferBrand(row: RawRow) {
  const brands = row.networks_all.split(";").map((value) => value.trim()).filter(Boolean);
  if (brands.length === 1) return brands[0];
  const title = row.title.toLowerCase();
  return ["Onic", "Ufone", "Jazz", "Zong", "Telenor", "SCO"].find((brand) => title.includes(brand.toLowerCase())) ?? "";
}

function locate(row: RawRow): Coordinates {
  if (row.post_id === "1uayolz") return { lat: 33.7212591, lng: 73.0573808, method: "source_coordinates", confidence: "high", note: "Coordinates stated in the source post; displayed as source supplied." };
  if (!row.city) return { lat: NaN, lng: NaN, method: "unmapped", confidence: "none", note: "No named location was available." };
  const key = `${row.city}|${row.area}`;
  const multi = multiAreaCoordinates[key];
  if (multi) return { lat: multi[0], lng: multi[1], method: "multi_area_centroid", confidence: "low", note: `Approximate centre selected for the multiple areas reported: ${row.area}.` };
  const area = areaCoordinates[key];
  if (area) return { lat: area[0], lng: area[1], method: row.area.match(/Hospital|Market|Enclave/) ? "named_landmark" : "area_centroid", confidence: "medium", note: `Approximate centre of ${row.area}, ${row.city}; not the test device's GPS position.` };
  const city = cityCoordinates[row.city];
  if (city) return { lat: city[0], lng: city[1], method: "city_centroid", confidence: "low", note: `Approximate centre of ${row.city}; the source did not provide a more precise test location.` };
  return { lat: NaN, lng: NaN, method: "unmapped", confidence: "none", note: "Named location could not be placed confidently." };
}

function classify(row: RawRow, brand: string) {
  const cellular = ["5G", "4G/LTE", "4G+"].includes(row.connection_type);
  const comparison = /\bvs\.?\b|comparison/i.test(row.title) || row.connection_type === "mixed_comparison";
  if (!cellular) return { status: "excluded", reason: row.connection_type ? `Non-cellular or ambiguous access type: ${row.connection_type}.` : "Not a speed-test observation." };
  if (!row.download_mbps) return { status: "unresolved", reason: "No single verified download result was extracted." };
  if (!brand) return { status: "needs_review", reason: "A single reported network could not be identified." };
  if (comparison) return { status: "needs_review", reason: "Comparison post requires result-by-result attribution." };
  if (row.post_id === "1vnoy0i") return { status: "needs_review", reason: "Upload value is anomalous and requires screenshot verification." };
  return { status: "approved", reason: "" };
}

const headers = ["dataset_version", "observation_key", "post_id", "observation_index", "source_created_at", "source_title", "post_url", "content_type", "review_status", "exclusion_reason", "access_type", "raw_connection_type", "generation", "reported_brand", "network_group", "download_mbps", "upload_mbps", "ping_ms", "jitter_ms", "city", "area", "latitude", "longitude", "location_method", "location_confidence", "location_note", "metrics_source", "extraction_confidence", "speedtest_url", "evidence_url", "reviewer_note"];

async function main() {
const raw = parse(await readFile(sourcePath, "utf8"), { columns: true, skip_empty_lines: true, bom: true }) as RawRow[];
const rows = raw.map((row) => {
  const brand = inferBrand(row);
  const review = classify(row, brand);
  const location = locate(row);
  const generation = row.connection_type === "5G" ? "5g" : ["4G/LTE", "4G+"].includes(row.connection_type) ? "4g" : "";
  const speedtest = row.ookla_result_urls.split(";").find(Boolean) ?? "";
  const evidence = speedtest || row.media_urls.split(";").find(Boolean) || row.post_url;
  return [REDDIT_DATASET_VERSION, `${row.post_id}:0`, row.post_id, 0, row.created_at_utc, row.title, row.post_url, row.content_type, review.status, review.reason, generation ? "cellular" : row.connection_type.toLowerCase() || "unknown", row.connection_type, generation, brand, brand === "Onic" || brand === "Ufone" ? "Ufone / Onic" : brand, row.download_mbps, row.upload_mbps, row.ping_ms, row.jitter_ms, row.city, row.area, Number.isFinite(location.lat) ? location.lat : "", Number.isFinite(location.lng) ? location.lng : "", location.method, location.confidence, location.note, row.metrics_source || "not_extracted", row.metrics_confidence || "none", speedtest, evidence, review.status === "approved" ? "Approved from one clearly attributed cellular result in the supplied snapshot." : "Requires the reasoned outcome recorded in exclusion_reason."];
});

await mkdir(DATA_DIR, { recursive: true });
await writeFile(REVIEW_PATH, [headers, ...rows].map((row) => row.map(csv).join(",")).join("\n") + "\n", "utf8");
const dates = raw.map((row) => row.created_at_utc).filter(Boolean).sort();
await writeFile(MANIFEST_PATH, JSON.stringify({
  datasetVersion: REDDIT_DATASET_VERSION,
  source: "r/PakistaniTech posts supplied as CSV",
  sourcePostCount: raw.length,
  sourceDateFrom: dates[0],
  sourceDateTo: dates.at(-1),
  sourceSha256: await sha256(sourcePath),
  inventorySha256: await sha256(inventoryPath),
  generatedAt: "2026-08-28T00:00:00+05:00",
  collectionMethod: "Imported from the supplied CSV. The original collection transport and authorization record were not supplied.",
  reviewMethod: "Deterministic first pass; ambiguous comparisons, missing metrics, anomalous OCR, and non-cellular rows are not approved.",
  locationMethod: "Source coordinates where explicitly stated; otherwise reviewed representative landmark, area, or city centroids. These are not device GPS positions.",
}, null, 2) + "\n", "utf8");
console.log(`Generated ${rows.length} review rows in ${path.relative(process.cwd(), REVIEW_PATH)}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
