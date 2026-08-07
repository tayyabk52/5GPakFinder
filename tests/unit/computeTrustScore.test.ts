import { describe, it, expect } from "vitest";
import { computeTrustScore } from "@/features/coverage-reports/trust/computeTrustScore";
import type { SpeedSample } from "@/features/coverage-reports/types";

const inApp: SpeedSample = { source: "in_app", downloadMbps: 120, uploadMbps: 20, pingMs: 20, speedtestUrl: null };
const manualLink: SpeedSample = { source: "manual", downloadMbps: 120, uploadMbps: 20, pingMs: 20, speedtestUrl: "https://www.speedtest.net/result/1" };
const manualNoLink: SpeedSample = { source: "manual", downloadMbps: 120, uploadMbps: 20, pingMs: 20, speedtestUrl: null };

describe("computeTrustScore", () => {
  it("returns base 0.50 for a bare report with no speed and >100m accuracy", () => {
    expect(computeTrustScore({ speed: null, accuracyMeters: 500, isManualPin: false, ipRegionFar: false })).toBeCloseTo(0.5, 5);
  });

  it("weights in-app and manual+link equally", () => {
    const a = computeTrustScore({ speed: inApp, accuracyMeters: 500, isManualPin: false, ipRegionFar: false });
    const b = computeTrustScore({ speed: manualLink, accuracyMeters: 500, isManualPin: false, ipRegionFar: false });
    expect(a).toBeCloseTo(b, 5);
    expect(a).toBeCloseTo(0.8, 5); // 50 + 30
  });

  it("gives manual-without-link less than manual-with-link", () => {
    const withLink = computeTrustScore({ speed: manualLink, accuracyMeters: 500, isManualPin: false, ipRegionFar: false });
    const noLink = computeTrustScore({ speed: manualNoLink, accuracyMeters: 500, isManualPin: false, ipRegionFar: false });
    expect(noLink).toBeLessThan(withLink);
    expect(noLink).toBeCloseTo(0.68, 5); // 50 + 18
  });

  it("adds accuracy bonus and clamps to 1.0", () => {
    // 50 + 30 (in-app) + 20 (<30m) = 100 -> 1.0
    expect(computeTrustScore({ speed: inApp, accuracyMeters: 10, isManualPin: false, ipRegionFar: false })).toBeCloseTo(1, 5);
  });

  it("subtracts for manual pin and clamps to >= 0", () => {
    // 50 - 5 (manual pin) - 20 (geo far) = 25 -> 0.25
    expect(computeTrustScore({ speed: null, accuracyMeters: null, isManualPin: true, ipRegionFar: true })).toBeCloseTo(0.25, 5);
  });

  it("applies the ip-region penalty", () => {
    const near = computeTrustScore({ speed: null, accuracyMeters: 50, isManualPin: false, ipRegionFar: false });
    const far = computeTrustScore({ speed: null, accuracyMeters: 50, isManualPin: false, ipRegionFar: true });
    expect(near - far).toBeCloseTo(0.2, 5);
  });
});
