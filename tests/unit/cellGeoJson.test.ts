import { describe, it, expect } from "vitest";
import { cellsToPointFC, cellsToPolygonFC, coverageColor, speedColor } from "@/features/coverage-reports/map/cellGeoJson";
import type { CoverageCell } from "@/features/coverage-reports/types";

const cell: CoverageCell = {
  geohashPrefix: "tuvz5",
  centerLat: 31.5,
  centerLng: 74.3,
  total: 10,
  avgDownload: 120,
  avgUpload: 20,
  avgPing: 20,
  avgTrust: 0.82,
  jazzCount: 7,
  zongCount: 3,
  ufoneCount: 0,
  jazzAvgDownload: 120,
  zongAvgDownload: 130,
  ufoneAvgDownload: null,
};

describe("cellGeoJson", () => {
  it("builds a point FeatureCollection weighted by avgTrust", () => {
    const fc = cellsToPointFC([cell], "coverage");
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features[0].geometry.type).toBe("Point");
    expect(fc.features[0].geometry.coordinates).toEqual([74.3, 31.5]);
    expect(fc.features[0].properties?.weight).toBeCloseTo(0.82, 5);
  });

  it("builds a polygon FeatureCollection with a fill color", () => {
    const fc = cellsToPolygonFC([cell], "coverage");
    expect(fc.features[0].geometry.type).toBe("Polygon");
    expect(fc.features[0].properties?.color).toMatch(/^#/);
  });

  it("colors a high-confirmation cell green", () => {
    expect(coverageColor(cell)).toBe("#10b981");
  });

  it("colors a low sample cell gray", () => {
    const spotty = { ...cell, total: 2 };
    expect(coverageColor(spotty)).toBe("#9ca3af");
  });

  it("uses low-data gray for speed with too few samples", () => {
    const noSpeed = { ...cell, avgDownload: null, total: 1 };
    expect(speedColor(noSpeed)).toBe("#9ca3af");
  });

  it("colors fast speed blue", () => {
    expect(speedColor(cell)).toBe("#3b82f6");
  });
});
