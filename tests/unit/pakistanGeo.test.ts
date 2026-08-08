import { describe, expect, it } from "vitest";
import { isKnownForeignRequest } from "@/server/geo/pakistan";

describe("Pakistan edge-country guard", () => {
  it("allows Pakistan and unknown edge locations", () => {
    expect(isKnownForeignRequest(new Request("https://example.test", { headers: { "x-vercel-ip-country": "PK" } }))).toBe(false);
    expect(isKnownForeignRequest(new Request("https://example.test"))).toBe(false);
  });

  it("rejects a known non-Pakistan edge location", () => {
    expect(isKnownForeignRequest(new Request("https://example.test", { headers: { "x-vercel-ip-country": "IN" } }))).toBe(true);
  });
});
