import { describe, it, expect } from "vitest";
import { mbpsFromTransfer, median } from "@/features/coverage-reports/hooks/speedMath";

describe("mbpsFromTransfer", () => {
  it("converts 5,000,000 bytes in 1000ms to 40 Mbps", () => {
    expect(mbpsFromTransfer(5_000_000, 1000)).toBeCloseTo(40, 1);
  });

  it("returns 0 when elapsed time is 0 or negative", () => {
    expect(mbpsFromTransfer(1000, 0)).toBe(0);
    expect(mbpsFromTransfer(1000, -5)).toBe(0);
  });
});

describe("median", () => {
  it("returns the middle value for an odd-length array", () => {
    expect(median([30, 10, 20])).toBe(20);
  });

  it("averages the two middle values for an even-length array", () => {
    expect(median([10, 20, 30, 40])).toBe(25);
  });

  it("returns 0 for an empty array", () => {
    expect(median([])).toBe(0);
  });
});
