/**
 * Zod validation schema for GeoJSON features from the master dataset.
 * Based on direct inspection of pakistan_5g_sites_master.geojson.
 *
 * Key findings:
 * - Jazz features: 3 coordinates [lon, lat, altitude=0.0], altitude_m: 0.0 in properties
 * - Zong features: 2 coordinates [lon, lat], altitude_m: null in properties
 * - Properties do NOT include standalone latitude/longitude fields (use geometry.coordinates)
 * - site_uid regex allows jazz-XXXX and zong-XXXX (4 digit index)
 */

import { z } from "zod";

export const CellSitePropertiesSchema = z.object({
  site_uid: z
    .string()
    .min(1)
    .regex(/^((jazz|zong)-\d{4}|pk-5g-.*)$/, "site_uid must match pattern like jazz-0001 or pk-5g-isb-01"),
  provider: z.string().min(1),
  source_index: z.number().int().nonnegative(),
  site_name_source: z.string(),
  display_name: z.string().min(1),
  city_source: z.string(),
  geometry_type: z.string(),
  record_kind: z.string(),
  is_named: z.boolean().optional().default(false),
  duplicate_coordinate_group: z.string(),
  source_dataset: z.string(),
  source_url: z.string().url(),
  retrieved_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "retrieved_at must be YYYY-MM-DD"),
  accuracy_note: z.string(),
  // altitude_m is 0.0 for Jazz, null for Zong — both are valid
  altitude_m: z.union([z.number(), z.null()]).optional().default(null),
});

export const CellSiteGeometrySchema = z.object({
  type: z.literal("Point"),
  // GeoJSON coordinate order: [longitude, latitude] with optional altitude
  coordinates: z
    .array(z.number())
    .min(2)
    .max(3)
    .refine(
      (coords) => {
        const [lon, lat] = coords;
        // Pakistan bbox roughly: lat 23-37, lon 60-78
        return (
          typeof lon === "number" &&
          typeof lat === "number" &&
          lon >= -180 &&
          lon <= 180 &&
          lat >= -90 &&
          lat <= 90
        );
      },
      { message: "Coordinates out of valid WGS84 range" }
    ),
});

export const CellSiteFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.string().optional(),
  geometry: CellSiteGeometrySchema,
  properties: CellSitePropertiesSchema,
});

export const CellSiteFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(CellSiteFeatureSchema),
});

export type ValidatedCellSiteFeature = z.infer<typeof CellSiteFeatureSchema>;
export type ValidatedCellSiteProperties = z.infer<typeof CellSitePropertiesSchema>;
