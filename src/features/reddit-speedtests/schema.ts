import { z } from "zod";

export const generationSchema = z.enum(["4g", "5g"]);
export const confidenceSchema = z.enum(["high", "medium", "low", "none"]);
export const reviewStatusSchema = z.enum(["approved", "needs_review", "unresolved", "excluded"]);
export const locationMethodSchema = z.enum(["source_coordinates", "named_landmark", "area_centroid", "city_centroid", "multi_area_centroid", "unmapped"]);

export const mapQuerySchema = z.object({
  minLat: z.coerce.number().min(23).max(37).default(23),
  minLng: z.coerce.number().min(60).max(78).default(60),
  maxLat: z.coerce.number().min(23).max(37).default(37),
  maxLng: z.coerce.number().min(60).max(78).default(78),
  generation: generationSchema.default("5g"),
  network: z.string().trim().max(40).optional(),
}).refine((value) => value.minLat < value.maxLat && value.minLng < value.maxLng, "Invalid map bounds");

export const reviewRowSchema = z.object({
  dataset_version: z.string().min(1),
  observation_key: z.string().min(1),
  post_id: z.string().regex(/^[a-z0-9]+$/),
  observation_index: z.coerce.number().int().min(0),
  source_created_at: z.string().datetime({ offset: true }),
  source_title: z.string().min(1),
  post_url: z.string().url().refine((url) => new URL(url).hostname.endsWith("reddit.com"), "Expected a Reddit URL"),
  content_type: z.string(),
  review_status: reviewStatusSchema,
  exclusion_reason: z.string(),
  access_type: z.string(),
  raw_connection_type: z.string(),
  generation: z.union([generationSchema, z.literal("")]),
  reported_brand: z.string(),
  network_group: z.string(),
  download_mbps: z.union([z.coerce.number().positive().max(5000), z.literal("")]),
  upload_mbps: z.union([z.coerce.number().positive().max(5000), z.literal("")]),
  ping_ms: z.union([z.coerce.number().min(1).max(2000), z.literal("")]),
  jitter_ms: z.union([z.coerce.number().min(0).max(2000), z.literal("")]),
  city: z.string(),
  area: z.string(),
  latitude: z.union([z.coerce.number().min(23).max(37), z.literal("")]),
  longitude: z.union([z.coerce.number().min(60).max(78), z.literal("")]),
  location_method: locationMethodSchema,
  location_confidence: confidenceSchema,
  location_note: z.string(),
  metrics_source: z.string(),
  extraction_confidence: confidenceSchema,
  speedtest_url: z.union([z.string().url(), z.literal("")]),
  evidence_url: z.union([z.string().url(), z.literal("")]),
  reviewer_note: z.string(),
}).superRefine((row, ctx) => {
  if (row.review_status === "approved" && (!row.generation || !row.reported_brand || row.download_mbps === "")) {
    ctx.addIssue({ code: "custom", message: "Approved observations require generation, brand, and download speed" });
  }
  if ((row.latitude === "") !== (row.longitude === "")) ctx.addIssue({ code: "custom", message: "Latitude and longitude must be supplied together" });
  if (row.location_method === "unmapped" && row.latitude !== "") ctx.addIssue({ code: "custom", message: "Unmapped rows cannot contain coordinates" });
});

export type ReviewRow = z.infer<typeof reviewRowSchema>;
