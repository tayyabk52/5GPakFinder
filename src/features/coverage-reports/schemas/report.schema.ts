import { z } from "zod";

const speedSchema = z.object({
  source: z.enum(["desktop", "mobile", "manual"]),
  downloadMbps: z.number().positive().max(5000).nullable(),
  uploadMbps: z.number().positive().max(5000).nullable(),
  pingMs: z.number().int().min(1).max(2000).nullable(),
  speedtestUrl: z.string().url().max(255).nullable(),
  deviceModel: z.string().max(255).nullable().optional(),
  carrier: z.string().max(255).nullable().optional(),
  isp: z.string().max(255).nullable().optional(),
  serverName: z.string().max(255).nullable().optional(),
  isWifi: z.boolean().optional().default(false),
  wifiDeviceModel: z.string().regex(/^[a-zA-Z0-9\-\s]*$/, "Invalid characters").max(50).nullable().optional(),
}).strict().superRefine((speed, context) => {
  const hasMeasurement = speed.downloadMbps !== null || speed.uploadMbps !== null || speed.pingMs !== null;
  if (!hasMeasurement) {
    context.addIssue({ code: "custom", message: "Speed data must include at least one measurement." });
  }

  if ((speed.source === "desktop" || speed.source === "mobile") &&
      (!speed.speedtestUrl || !/^https:\/\/(?:www\.)?speedtest\.net\/(?:result\/\d+|(?:result|my-result)\/[ai]\/\d+)\/?$/i.test(speed.speedtestUrl))) {
    context.addIssue({ code: "custom", message: "Fetched results require a valid Speedtest result URL." });
  }
});

export const ReportSubmissionSchema = z.object({
  latitude: z.number().finite().min(23).max(37),
  longitude: z.number().finite().min(60).max(78),
  accuracyMeters: z.number().int().nonnegative().nullable(),
  isManualPin: z.boolean(),
  operator: z.enum(["Jazz", "Zong", "Ufone"]),
  networkGeneration: z.enum(["4g", "5g"]),
  speed: speedSchema.nullable(),
  deviceFingerprint: z.string().min(6).max(128),
}).strict();

export const CoverageCellSchema = z.object({
  geohashPrefix: z.string().min(1).max(9),
  centerLat: z.number(),
  centerLng: z.number(),
  total: z.number().int().nonnegative(),
  avgDownload: z.number().nullable(),
  avgUpload: z.number().nullable(),
  avgPing: z.number().nullable(),
  avgTrust: z.number(),
  jazzCount: z.number().int().nonnegative(),
  jazzAvgDownload: z.number().nullable(),
  zongCount: z.number().int().nonnegative(),
  zongAvgDownload: z.number().nullable(),
  ufoneCount: z.number().int().nonnegative(),
  ufoneAvgDownload: z.number().nullable(),
});

export const CoverageCellsResponseSchema = z.object({
  cells: z.array(CoverageCellSchema),
});
