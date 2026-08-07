import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/reports/repository", () => ({
  supabaseRepository: {
    checkRateLimit: vi.fn(async () => true),
    insertReport: vi.fn(async () => {}),
    getCoverageCells: vi.fn(async () => [
      {
        geohashPrefix: "tuvz",
        centerLat: 31.5,
        centerLng: 74.3,
        total: 3,
        confirmed: 3,
        notAvailable: 0,
        intermittent: 0,
        avgDownload: 120,
        avgUpload: 20,
        avgPing: 20,
        avgTrust: 0.8,
        jazzCount: 3,
        zongCount: 0,
        unknownCount: 0,
      },
    ]),
  },
}));

import { POST, GET } from "@/app/api/reports/route";
import { supabaseRepository } from "@/server/reports/repository";

const body = {
  latitude: 31.5,
  longitude: 74.34,
  accuracyMeters: 10,
  isManualPin: false,
  fiveGPresent: "yes",
  operator: "Jazz",
  speed: null,
  deviceFingerprint: "abc123def456",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/reports", () => {
  it("accepts a valid report and returns a trust score", async () => {
    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.9",
      },
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(typeof json.trustScore).toBe("number");
    expect(supabaseRepository.insertReport).toHaveBeenCalledTimes(1);
  });

  it("returns 400 on an invalid payload", async () => {
    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, fiveGPresent: "nope" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 429 when the repository reports rate-limited", async () => {
    (supabaseRepository.checkRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.9",
      },
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
  });
});

describe("GET /api/reports", () => {
  it("returns aggregated cells for a bbox", async () => {
    const request = new Request(
      "http://localhost/api/reports?minLat=30&minLng=73&maxLat=32&maxLng=75&zoom=12&verified=false"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.cells).toHaveLength(1);
    expect(json.cells[0].geohashPrefix).toBe("tuvz");
  });
});
