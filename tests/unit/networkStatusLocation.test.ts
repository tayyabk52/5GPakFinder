import { describe, expect, it } from "vitest";
import { isPakistanLocation } from "@/features/network-status/location";
describe("network-status location validation", () => {
  it("accepts Pakistan coordinates and rejects invalid or out-of-country points", () => { expect(isPakistanLocation(31.52, 74.35)).toBe(true); expect(isPakistanLocation(40, 74.35)).toBe(false); expect(isPakistanLocation(31.52, 80)).toBe(false); expect(isPakistanLocation(Number.NaN, 74)).toBe(false); });
});
