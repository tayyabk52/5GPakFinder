import { describe, it, expect } from "vitest";
import { hashIp } from "@/server/reports/ipHash";

describe("hashIp", () => {
  it("returns a stable sha-256 hash for the same ip and salt", () => {
    const a = hashIp("203.0.113.9", "salt");
    const b = hashIp("203.0.113.9", "salt");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("changes when the salt changes", () => {
    const a = hashIp("203.0.113.9", "salt-a");
    const b = hashIp("203.0.113.9", "salt-b");
    expect(a).not.toBe(b);
  });
});
