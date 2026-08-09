import { describe, it, expect } from "vitest";
import { ReportSubmissionSchema } from "@/features/coverage-reports/schemas/report.schema";

const base = {
  latitude: 31.5,
  longitude: 74.34,
  accuracyMeters: 20,
  isManualPin: false,
  operator: "Jazz",
  networkGeneration: "5g",
  speed: null,
  deviceFingerprint: "abc123def456",
};

describe("ReportSubmissionSchema", () => {
  it("accepts a valid report without speed data", () => {
    expect(ReportSubmissionSchema.parse(base)).toMatchObject({ operator: "Jazz" });
  });

  it("rejects coordinates outside Pakistan bounds", () => {
    expect(() => ReportSubmissionSchema.parse({ ...base, latitude: 51.5 })).toThrow();
  });

  it("rejects unknown fields", () => {
    expect(() => ReportSubmissionSchema.parse({ ...base, fiveGPresent: "sometimes" })).toThrow();
  });

  it("rejects impossible download speed", () => {
    const speed = { source: "manual", downloadMbps: 99999, uploadMbps: 10, pingMs: 20, speedtestUrl: null };
    expect(() => ReportSubmissionSchema.parse({ ...base, speed })).toThrow();
  });

  it("accepts a valid speed sample with optional url", () => {
    const speed = { source: "manual", downloadMbps: 140, uploadMbps: 28, pingMs: 22, speedtestUrl: "https://www.speedtest.net/result/123" };
    expect(ReportSubmissionSchema.parse({ ...base, speed }).speed?.downloadMbps).toBe(140);
  });

  it.each([
    "https://www.speedtest.net/my-result/a/11797444683",
    "https://www.speedtest.net/result/a/11797444683",
    "https://www.speedtest.net/my-result/i/123456789",
    "https://www.speedtest.net/result/i/123456789",
  ])("accepts fetched mobile Speedtest URL %s", (speedtestUrl) => {
    const speed = { source: "mobile", downloadMbps: 175, uploadMbps: 42, pingMs: 18, speedtestUrl };
    expect(ReportSubmissionSchema.parse({ ...base, speed }).speed?.speedtestUrl).toBe(speedtestUrl);
  });

  it("rejects a null operator", () => {
    expect(() => ReportSubmissionSchema.parse({ ...base, operator: null })).toThrow();
  });

  it("requires an explicit 4G LTE or 5G selection", () => {
    expect(ReportSubmissionSchema.parse({ ...base, networkGeneration: "4g" }).networkGeneration).toBe("4g");
    expect(() => ReportSubmissionSchema.parse({ ...base, networkGeneration: "3g" })).toThrow();
  });
});
