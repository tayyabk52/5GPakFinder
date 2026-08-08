import { describe, it, expect, vi } from "vitest";
import { submitReport } from "@/server/reports/submitReport";
import type { Repository } from "@/server/reports/repository";
import type { ReportSubmission } from "@/features/coverage-reports/types";

function makeRepo(overrides: Partial<Repository> = {}): Repository {
  return {
    checkSubmissionGate: vi.fn(async () => "allowed" as const),
    insertReport: vi.fn(async () => {}),
    getCoverageCells: vi.fn(async () => []),
    ...overrides,
  };
}

const submission: ReportSubmission = {
  latitude: 31.5,
  longitude: 74.34,
  accuracyMeters: 10,
  isManualPin: false,
  operator: "Jazz",
  speed: {
    source: "mobile",
    downloadMbps: 120,
    uploadMbps: 20,
    pingMs: 20,
    speedtestUrl: null,
  },
  deviceFingerprint: "abc123def456",
};

describe("submitReport", () => {
  it("inserts a trust-scored, geohashed row and returns the score", async () => {
    const repo = makeRepo();
    const res = await submitReport({ submission, ipHash: "iphash", ipRegionFar: false, repository: repo });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.trustScore).toBeCloseTo(1, 5);
      expect(res.status).toBe("visible");
    }

    const row = (repo.insertReport as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(row.geohash).toHaveLength(7);
    expect(row.ip_hash).toBe("iphash");
    expect(row.trust_score).toBeCloseTo(1, 5);
    expect(row.speed_source).toBe("mobile");
  });

  it("does not insert and returns a reason when rate limited", async () => {
    const repo = makeRepo({ checkSubmissionGate: vi.fn(async () => "rate_limited" as const) });
    const res = await submitReport({ submission, ipHash: "x", ipRegionFar: false, repository: repo });

    expect(res.ok).toBe(false);
    expect(repo.insertReport).not.toHaveBeenCalled();
  });

  it("keeps visible status for a weak but still allowed submission", async () => {
    const repo = makeRepo();
    const weak: ReportSubmission = { ...submission, speed: null, accuracyMeters: null, isManualPin: true };
    const res = await submitReport({ submission: weak, ipHash: "x", ipRegionFar: true, repository: repo });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.status).toBe("visible");
    }
  });
});
