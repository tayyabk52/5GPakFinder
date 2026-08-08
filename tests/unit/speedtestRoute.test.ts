import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/speedtest/download/route";
import { POST } from "@/app/api/speedtest/upload/route";

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
