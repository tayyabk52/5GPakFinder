#!/usr/bin/env tsx
/**
 * Data build script: validate and copy sites GeoJSON to public/data/
 *
 * Usage:
 *   npm run data:build
 *
 * This script:
 *   1. Reads ../../maps_data/pakistan_5g_sites_master.geojson (relative to project root)
 *   2. Validates each feature with Zod
 *   3. Reports warnings for skipped/invalid records
 *   4. Writes validated output to public/data/sites.geojson
 *   5. Exits with code 1 if any fatal error occurs
 *
 * The output file is committed to the repo so the app can serve it statically.
 * Re-run this script after updating the source dataset.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  CellSiteFeatureCollectionSchema,
  CellSiteFeatureSchema,
} from "../src/features/cell-sites/schemas/cellSite.schema.ts";
import { inferJazzCity } from "../src/config/networks.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SOURCE_FILE = path.resolve(PROJECT_ROOT, "..", "maps_data", "pakistan_5g_sites_master.geojson");
const OUTPUT_DIR = path.resolve(PROJECT_ROOT, "public", "data");
const OUTPUT_FILE = path.resolve(OUTPUT_DIR, "sites.geojson");

console.log("═══════════════════════════════════════════════════");
console.log("  Pakistan 5G Map — Data Build Script");
console.log("═══════════════════════════════════════════════════\n");

// ── Step 1: Read source file ──────────────────────────────────────────────────

if (!fs.existsSync(SOURCE_FILE)) {
  console.error(`❌ Source file not found: ${SOURCE_FILE}`);
  console.error("   Ensure maps_data/ exists in the project parent directory.");
  process.exit(1);
}

console.log(`📂 Reading: ${SOURCE_FILE}`);
const raw = fs.readFileSync(SOURCE_FILE, "utf-8");

let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch (err) {
  console.error(`❌ Failed to parse JSON: ${err}`);
  process.exit(1);
}

// ── Step 2: Validate top-level structure ─────────────────────────────────────

const topLevel = parsed as Record<string, unknown>;
if (topLevel.type !== "FeatureCollection" || !Array.isArray(topLevel.features)) {
  console.error("❌ Source file is not a valid GeoJSON FeatureCollection.");
  process.exit(1);
}

const rawFeatures = topLevel.features as unknown[];
console.log(`\n📊 Total raw features: ${rawFeatures.length}\n`);

// ── Step 3: Validate each feature ─────────────────────────────────────────────

let validCount = 0;
let skippedCount = 0;
const validFeatures: z.infer<typeof CellSiteFeatureSchema>[] = [];
const stats: Record<string, number> = {};
const duplicateGroups = new Set<string>();

for (let i = 0; i < rawFeatures.length; i++) {
  const result = CellSiteFeatureSchema.safeParse(rawFeatures[i]);
  if (!result.success) {
    skippedCount++;
    const id = (rawFeatures[i] as Record<string, unknown>)?.id ?? `index-${i}`;
    console.warn(`⚠️  Skipped feature ${id}: ${result.error.issues[0]?.message}`);
    continue;
  }

  const feature = result.data;
  const provider = feature.properties.provider;
  stats[provider] = (stats[provider] ?? 0) + 1;

  if (feature.properties.duplicate_coordinate_group) {
    duplicateGroups.add(feature.properties.duplicate_coordinate_group);
  }

  validFeatures.push(feature);
  validCount++;
}

// ── Step 4: Report statistics ─────────────────────────────────────────────────

console.log("📈 Validation results:");
console.log(`   ✅ Valid features: ${validCount}`);
if (skippedCount > 0) {
  console.log(`   ❌ Skipped (invalid): ${skippedCount}`);
}

console.log("\n   By provider:");
for (const [provider, count] of Object.entries(stats)) {
  console.log(`   • ${provider}: ${count}`);
}

if (duplicateGroups.size > 0) {
  console.log(`\n   ⚡ Duplicate coordinate groups: ${duplicateGroups.size}`);
}

// ── Step 5: Jazz city inference check ─────────────────────────────────────────

const jazzFeatures = validFeatures.filter((f) => f.properties.provider === "Jazz");
let jazzCityResolved = 0;
let jazzCityUnresolved = 0;

for (const f of jazzFeatures) {
  const city = inferJazzCity(f.properties.site_name_source);
  if (city) jazzCityResolved++;
  else {
    jazzCityUnresolved++;
    console.warn(
      `   ℹ️  Jazz site with unresolved city prefix: ${f.properties.site_uid} (name: ${f.properties.site_name_source})`
    );
  }
}

console.log(
  `\n   Jazz city prefix resolution: ${jazzCityResolved}/${jazzFeatures.length} resolved`
);

// ── Step 6: Write output ──────────────────────────────────────────────────────

const outputCollection = {
  type: "FeatureCollection" as const,
  features: validFeatures,
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const outputJson = JSON.stringify(outputCollection, null, 2);
fs.writeFileSync(OUTPUT_FILE, outputJson, "utf-8");

const outputSizeKb = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(0);
console.log(`\n✅ Written: ${OUTPUT_FILE} (${outputSizeKb} KB)`);
console.log(`   Features: ${validCount}`);

if (skippedCount > 0) {
  console.warn(`\n⚠️  ${skippedCount} records were skipped due to validation errors.`);
  console.warn("   Review the warnings above before deploying.");
}

console.log("\n═══════════════════════════════════════════════════\n");
