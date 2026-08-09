import { describe, expect, it } from "vitest";
import { MIN_SITE_ZOOM, siteTargetSearchParams } from "@/features/map/siteNavigation";
import type { CellSiteFeature } from "@/types/cell-site";

const site = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [73.0479, 33.6844] },
  properties: { site_uid: "ufone-test-site" },
} as CellSiteFeature;

describe("siteTargetSearchParams", () => {
  it("replaces stale user-location coordinates with the selected site", () => {
    const current = new URLSearchParams("lat=31.520400&lng=74.358700&zoom=13&network=Ufone");
    const params = siteTargetSearchParams(current, site, 13);

    expect(params.get("site")).toBe("ufone-test-site");
    expect(params.get("lat")).toBe("33.684400");
    expect(params.get("lng")).toBe("73.047900");
    expect(params.get("zoom")).toBe(String(MIN_SITE_ZOOM));
    expect(params.get("network")).toBe("Ufone");
  });

  it("does not zoom out when a site is selected at close range", () => {
    const params = siteTargetSearchParams(new URLSearchParams(), site, 16.5);
    expect(params.get("zoom")).toBe("16.5");
  });
});
