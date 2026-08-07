import { describe, it, expect } from "vitest";
import { trustTier, statusForTrust, CONFIDENCE_COLORS } from "@/features/coverage-reports/trust/trustTiers";

describe("trustTiers", () => {
  it("maps scores to tiers", () => {
    expect(trustTier(0.9)).toBe("very-high");
    expect(trustTier(0.65)).toBe("high");
    expect(trustTier(0.5)).toBe("medium");
    expect(trustTier(0.3)).toBe("low");
    expect(trustTier(0.1)).toBe("hidden");
  });

  it("derives visibility status at the 0.20 threshold", () => {
    expect(statusForTrust(0.2)).toBe("visible");
    expect(statusForTrust(0.19)).toBe("hidden");
  });

  it("exposes a color for every non-hidden tier", () => {
    expect(CONFIDENCE_COLORS["very-high"]).toMatch(/^#/);
    expect(CONFIDENCE_COLORS["low"]).toMatch(/^#/);
  });
});
