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
    const checkSubmissionGate = vi.fn(async () => "allowed" as const);
    const result = await runAntiFraud({
      submission,
      ipHash: "iphash",
      ipRegionFar: false,
      checkSubmissionGate,
    });

    expect(result.pass).toBe(true);
    expect(checkSubmissionGate).toHaveBeenCalledWith("iphash", submission.deviceFingerprint);
  });

  it("returns a friendly reason when rate-limited", async () => {
    const result = await runAntiFraud({
      submission,
      ipHash: "iphash",
      ipRegionFar: false,
      checkSubmissionGate: vi.fn(async () => "rate_limited" as const),
    });

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/too many reports/i);
  });

  it("rejects a permanently blocked device", async () => {
    const result = await runAntiFraud({
      submission,
      ipHash: "iphash",
      ipRegionFar: false,
      checkSubmissionGate: vi.fn(async () => "blocked" as const),
    });

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/can no longer submit/i);
  });
});
