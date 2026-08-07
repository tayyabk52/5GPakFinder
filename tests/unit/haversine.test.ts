import { describe, it, expect } from "vitest";
import { haversineDistanceKm, formatDistance } from "@/lib/haversine";

describe("haversineDistanceKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistanceKm(33.72, 73.09, 33.72, 73.09)).toBe(0);
  });

  it("calculates Karachi to Islamabad distance (approx 1100-1200 km)", () => {
    // Karachi: 24.86, 67.01 | Islamabad: 33.72, 73.06
    const dist = haversineDistanceKm(24.86, 67.01, 33.72, 73.06);
    expect(dist).toBeGreaterThan(1050);
    expect(dist).toBeLessThan(1250);
  });

  it("calculates short distance correctly (< 5 km)", () => {
    // Two points ~1 km apart in Islamabad
    const dist = haversineDistanceKm(33.7206, 73.0566, 33.7295, 73.0552);
    expect(dist).toBeGreaterThan(0.8);
    expect(dist).toBeLessThan(1.2);
  });

  it("handles southern hemisphere coordinates", () => {
    const dist = haversineDistanceKm(-33.87, 151.21, -33.87, 151.21);
    expect(dist).toBe(0);
  });
});

describe("formatDistance", () => {
  it("shows metres for sub-kilometre distances", () => {
    expect(formatDistance(0.5)).toBe("500 m");
    expect(formatDistance(0.123)).toBe("123 m");
  });

  it("shows km for distances >= 1 km", () => {
    expect(formatDistance(1.0)).toBe("1.0 km");
    expect(formatDistance(12.34)).toBe("12.3 km");
  });

  it("rounds to one decimal for km", () => {
    expect(formatDistance(5.67)).toBe("5.7 km");
  });
});
