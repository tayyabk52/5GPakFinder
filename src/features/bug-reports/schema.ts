import { z } from "zod";

export const BugReportSchema = z.object({
  category: z.enum(["map", "coverage", "network_status", "insights", "speed_test", "navigation", "other"]),
  impact: z.enum(["blocking", "major", "minor"]),
  title: z.string().trim().min(8).max(120),
  stepsToReproduce: z.string().trim().min(12).max(2000),
  expectedBehavior: z.string().trim().min(4).max(1000),
  actualBehavior: z.string().trim().min(4).max(1000),
  pagePath: z.string().trim().regex(/^\/[a-z0-9/_-]*$/i).max(180),
  deviceFingerprint: z.string().min(6).max(128),
}).strict();

export type BugReportInput = z.infer<typeof BugReportSchema>;
