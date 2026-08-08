import { z } from "zod";

export const SuggestionSchema = z.object({
  category: z.enum(["map", "coverage_data", "network_status", "speed_test", "insights", "accessibility", "other"]),
  audience: z.enum(["me", "my_area", "everyone"]),
  title: z.string().trim().min(8).max(120),
  problem: z.string().trim().min(20).max(1000),
  proposal: z.string().trim().min(20).max(2000),
  pagePath: z.string().trim().regex(/^\/[a-z0-9/_-]*$/i).max(180),
  deviceFingerprint: z.string().min(6).max(128),
}).strict();

export type SuggestionInput = z.infer<typeof SuggestionSchema>;
