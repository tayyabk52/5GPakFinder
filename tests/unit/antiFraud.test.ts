import { describe, it, expect, vi } from "vitest";
import { runAntiFraud } from "@/server/reports/antiFraud";
import type { ReportSubmission } from "@/features/coverage-reports/types";

const submission: ReportSubmission = {
  latitude: 31.5,
  longitude: 74.34,
  accuracyMeters: 10,
  isManualPin: false,
  operator: "Jazz",
  speed: null,
  deviceFingerprint: "abc123def456",
};

describe("runAntiFraud", () => {
  it("passes when the repository allows the submission", async () => {
    const checkRateLimit = vi.fn(async () => true);
    const result = await runAntiFraud({
      submission,
      ipHash: "iphash",
      ipRegionFar: false,
      checkRateLimit,
    });

    expect(result.pass).toBe(true);
    expect(checkRateLimit).toHaveBeenCalledWith("iphash", submission.deviceFingerprint);
  });

  it("returns a friendly reason when rate-limited", async () => {
    const result = await runAntiFraud({
      submission,
      ipHash: "iphash",
      ipRegionFar: false,
      checkRateLimit: vi.fn(async () => false),
    });

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/too many reports/i);
  });
});
