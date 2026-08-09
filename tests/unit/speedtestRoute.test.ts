import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/speedtest/download/route";
import { POST } from "@/app/api/speedtest/upload/route";
import { POST as resolveSpeedtest } from "@/app/api/speedtest/resolve/route";

describe("speedtest download", () => {
  it("returns the requested number of bytes", async () => {
    const request = new Request("http://localhost/api/speedtest/download?bytes=1024");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBe(1024);
  });

  it("caps oversized requests", async () => {
    const request = new Request("http://localhost/api/speedtest/download?bytes=999999999");
    const response = await GET(request);

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeLessThanOrEqual(10 * 1024 * 1024);
  });
});

describe("speedtest upload", () => {
  it("reports the received byte count", async () => {
    const request = new Request("http://localhost/api/speedtest/upload", {
      method: "POST",
      body: new Uint8Array(2048),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.bytes).toBe(2048);
  });

  it("rejects oversized upload payloads", async () => {
    const request = new Request("http://localhost/api/speedtest/upload", {
      method: "POST",
      headers: { "content-length": String(11 * 1024 * 1024) },
    });
    expect((await POST(request)).status).toBe(413);
  });
});

describe("speedtest resolve", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["desktop", "https://www.speedtest.net/result/123456789", "https://www.speedtest.net/api/result/123456789"],
    ["mobile", "https://www.speedtest.net/result/a/11797444683", "https://www.speedtest.net/api/result/a/11797444683"],
    ["mobile", "https://www.speedtest.net/my-result/a/11797444683", "https://www.speedtest.net/api/result/a/11797444683"],
    ["mobile", "https://www.speedtest.net/result/i/123456789", "https://www.speedtest.net/api/result/i/123456789"],
    ["mobile", "https://www.speedtest.net/my-result/i/123456789", "https://www.speedtest.net/api/result/i/123456789"],
  ] as const)("resolves %s result URL %s in its own namespace", async (source, resultUrl, apiUrl) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      id: 11797444683,
      download: 392122,
      upload: 41246,
      latency: 13,
      connection: "cellular",
    }));

    const request = new Request("http://localhost/api/speedtest/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: resultUrl }),
    });

    const response = await resolveSpeedtest(request);
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(apiUrl, expect.any(Object));

    const json = await response.json();
    expect(json).toMatchObject({
      ok: true,
      data: {
        source,
        resultUrl,
        downloadMbps: 392.12,
        uploadMbps: 41.25,
        pingMs: 13,
      },
    });
  });

  it("does not fall back to a colliding desktop result ID", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ message: "Result not found" }, { status: 404 }),
    );
    const request = new Request("http://localhost/api/speedtest/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://www.speedtest.net/my-result/a/11797444683" }),
    });

    const response = await resolveSpeedtest(request);
    expect(response.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.speedtest.net/api/result/a/11797444683",
      expect.any(Object),
    );
  });
});
