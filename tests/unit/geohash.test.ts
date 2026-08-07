import { describe, it, expect } from "vitest";
import { encodeGeohash, geohashCenter, geohashBbox, precisionForZoom } from "@/features/coverage-reports/geohash/geohash";

describe("geohash", () => {
  it("encodes Lahore to a precision-7 hash", () => {
    const h = encodeGeohash(31.5204, 74.3587, 7);
    expect(h).toHaveLength(7);
    expect(typeof h).toBe("string");
  });

  it("round-trips center within the cell", () => {
    const h = encodeGeohash(31.5204, 74.3587, 7);
    const c = geohashCenter(h);
    expect(Math.abs(c.lat - 31.5204)).toBeLessThan(0.01);
    expect(Math.abs(c.lon - 74.3587)).toBeLessThan(0.01);
  });

  it("returns a bbox that contains the encoded point", () => {
    const h = encodeGeohash(31.5204, 74.3587, 7);
    const b = geohashBbox(h);
    expect(31.5204).toBeGreaterThanOrEqual(b.minLat);
    expect(31.5204).toBeLessThanOrEqual(b.maxLat);
    expect(74.3587).toBeGreaterThanOrEqual(b.minLon);
    expect(74.3587).toBeLessThanOrEqual(b.maxLon);
  });

  it("maps zoom to precision per the spec", () => {
    expect(precisionForZoom(3)).toBe(4);
    expect(precisionForZoom(7)).toBe(5);
    expect(precisionForZoom(9)).toBe(6);
    expect(precisionForZoom(11)).toBe(7);
    expect(precisionForZoom(16)).toBe(7);
  });
});
