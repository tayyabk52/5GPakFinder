#!/usr/bin/env tsx
/**
 * Data validation script — read-only, does not write any files.
 *
 * Usage:
 *   npm run data:validate
 *
 * Reports:
 * - Total records
 * - Provider breakdown
 * - Duplicate coordinate groups
 * - Unnamed sites
 * - Jazz city prefix coverage
 * - Invalid/malformed records
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { CellSiteFeatureSchema } from "../src/features/cell-sites/schemas/cellSite.schema.ts";
import { inferJazzCity } from "../src/config/networks.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_FILE = path.resolve(__dirname, "..", "..", "maps_data", "pakistan_5g_sites_master.geojson");

console.log("═══════════════════════════════════════════════════");
console.log("  Pakistan 5G Map — Data Validation Report");
console.log("═══════════════════════════════════════════════════\n");

if (!fs.existsSync(SOURCE_FILE)) {
  console.error(`❌ Source file not found: ${SOURCE_FILE}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf-8"));
const features = raw.features ?? [];
console.log(`Total raw features: ${features.length}\n`);

let valid = 0;
let invalid = 0;
let unnamed = 0;
const byProvider: Record<string, number> = {};
const dupGroups = new Set<string>();
const unresolvedJazzPrefixes = new Set<string>();

for (const feature of features) {
  const result = CellSiteFeatureSchema.safeParse(feature);
  if (!result.success) {
    invalid++;
    const id = feature?.id ?? "unknown";
    console.warn(`  ⚠ INVALID [${id}]: ${result.error.issues[0]?.message}`);
    continue;
  }
  valid++;
  const p = result.data.properties;
  byProvider[p.provider] = (byProvider[p.provider] ?? 0) + 1;
  if (!p.is_named) unnamed++;
  if (p.duplicate_coordinate_group) dupGroups.add(p.duplicate_coordinate_group);
  if (p.provider === "Jazz") {
    const city = inferJazzCity(p.site_name_source);
    if (!city) unresolvedJazzPrefixes.add(p.site_name_source.slice(0, 3));
  }
}

console.log("Results:");
console.log(`  ✅ Valid:   ${valid}`);
console.log(`  ❌ Invalid: ${invalid}`);
console.log(`  ❓ Unnamed: ${unnamed}`);
console.log("\nBy provider:");
for (const [p, c] of Object.entries(byProvider)) {
  console.log(`  ${p}: ${c}`);
}
if (dupGroups.size > 0) {
  console.log(`\nDuplicate coordinate groups: ${dupGroups.size} (${[...dupGroups].join(", ")})`);
}
if (unresolvedJazzPrefixes.size > 0) {
  console.log(
    `\n⚠ Jazz prefixes without city mapping: ${[...unresolvedJazzPrefixes].join(", ")}`
  );
  console.log("  Consider adding them to JAZZ_CITY_PREFIX_MAP in src/config/networks.ts");
}

console.log("\n═══════════════════════════════════════════════════\n");
if (invalid > 0) process.exit(1);
