import { afterEach, describe, expect, it, vi } from "vitest";
import { submitReport, fetchCoverageCells } from "@/features/coverage-reports/api/reportsClient";
import type { ReportSubmission } from "@/features/coverage-reports/types";

const body: ReportSubmission = {
  latitude: 31.5,
  longitude: 74.34,
  accuracyMeters: 10,
  isManualPin: false,
  operator: "Jazz",
  networkGeneration: "5g",
  speed: null,
  deviceFingerprint: "abc123def456",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reportsClient.submitReport", () => {
  it("returns ok result on 201", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true, trustScore: 0.8, status: "visible" }), { status: 201 }))
    );

    const result = await submitReport(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.trustScore).toBe(0.8);
    }
  });

  it("returns a friendly failure on 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: false, reason: "Too many reports recently." }), { status: 429 }))
    );

    const result = await submitReport(body);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/too many/i);
    }
  });
});

describe("reportsClient.fetchCoverageCells", () => {
  it("parses and returns cells", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              cells: [
                {
                  geohashPrefix: "tuvz",
                  centerLat: 31.5,
                  centerLng: 74.3,
                  total: 2,
                  avgDownload: null,
                  avgUpload: null,
                  avgPing: null,
                  avgTrust: 0.7,
                  jazzCount: 2,
                  jazzAvgDownload: null,
                  zongCount: 0,
                  zongAvgDownload: null,
                  ufoneCount: 0,
                  ufoneAvgDownload: null,
                },
              ],
            }),
            { status: 200 }
          )
      )
    );

    const cells = await fetchCoverageCells({ minLat: 30, minLng: 73, maxLat: 32, maxLng: 75, zoom: 12, verifiedOnly: false, generation: "5g" });
    expect(cells).toHaveLength(1);
    expect(cells[0].geohashPrefix).toBe("tuvz");
    const requestUrl = String((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(requestUrl).toContain("generation=5g");
  });

  it("keeps LTE cell requests separate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ cells: [] }), { status: 200 })));

    await fetchCoverageCells({ minLat: 30, minLng: 73, maxLat: 32, maxLng: 75, zoom: 12, verifiedOnly: false, generation: "4g" });

    const requestUrl = String((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(requestUrl).toContain("generation=4g");
  });

  it("returns [] on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));

    const cells = await fetchCoverageCells({ minLat: 30, minLng: 73, maxLat: 32, maxLng: 75, zoom: 12, verifiedOnly: false, generation: "5g" });
    expect(cells).toEqual([]);
  });
});
