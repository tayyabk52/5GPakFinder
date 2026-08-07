import { z } from "zod";

const speedSchema = z.object({
  source: z.enum(["in_app", "manual"]),
  downloadMbps: z.number().positive().max(5000).nullable(),
  uploadMbps: z.number().positive().max(5000).nullable(),
  pingMs: z.number().int().min(1).max(2000).nullable(),
  speedtestUrl: z.string().url().max(255).nullable(),
});

export const ReportSubmissionSchema = z.object({
  latitude: z.number().min(23).max(37),
  longitude: z.number().min(60).max(78),
  accuracyMeters: z.number().int().nonnegative().nullable(),
  isManualPin: z.boolean(),
  fiveGPresent: z.enum(["yes", "no", "maybe"]),
  operator: z.enum(["Jazz", "Zong"]).nullable(),
  speed: speedSchema.nullable(),
  deviceFingerprint: z.string().min(6).max(128),
});

export const CoverageCellSchema = z.object({
  geohashPrefix: z.string().min(1).max(7),
  centerLat: z.number(),
  centerLng: z.number(),
  total: z.number().int().nonnegative(),
  confirmed: z.number().int().nonnegative(),
  notAvailable: z.number().int().nonnegative(),
  intermittent: z.number().int().nonnegative(),
  avgDownload: z.number().nullable(),
  avgUpload: z.number().nullable(),
  avgPing: z.number().nullable(),
  avgTrust: z.number(),
  jazzCount: z.number().int().nonnegative(),
  zongCount: z.number().int().nonnegative(),
  unknownCount: z.number().int().nonnegative(),
});

export const CoverageCellsResponseSchema = z.object({
  cells: z.array(CoverageCellSchema),
});
