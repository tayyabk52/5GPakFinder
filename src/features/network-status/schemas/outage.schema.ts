import { z } from "zod";

export const OutageSubmissionSchema = z.object({
  latitude: z.number().finite().min(23).max(37),
  longitude: z.number().finite().min(60).max(78),
  accuracyMeters: z.number().int().nonnegative().max(100000).nullable(),
  isManualPin: z.boolean(),
  operator: z.enum(["Jazz", "Zong", "Ufone"]),
  state: z.enum(["affected", "working"]),
  issueType: z.enum(["no_signal", "no_internet", "slow_data", "calls_sms", "specific_app"]).nullable(),
  deviceFingerprint: z.string().min(6).max(128),
}).strict().superRefine((value, ctx) => {
  if (value.state === "affected" && !value.issueType) ctx.addIssue({ code: "custom", message: "Choose the issue you are experiencing." });
  if (value.state === "working" && value.issueType) ctx.addIssue({ code: "custom", message: "A normal report cannot include an issue type." });
});
