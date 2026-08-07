import { describe, it, expect } from "vitest";
import { CellSiteFeatureSchema } from "@/features/cell-sites/schemas/cellSite.schema";

// Minimal valid Jazz feature (3 coordinates, altitude_m: number)
const validJazzFeature = {
  type: "Feature" as const,
  id: "jazz-0001",
  geometry: {
    type: "Point" as const,
    coordinates: [73.07526, 31.41332, 0.0],
  },
  properties: {
    site_uid: "jazz-0001",
    provider: "Jazz",
    source_index: 1,
    site_name_source: "FSD7646",
    display_name: "FSD7646",
    city_source: "",
    geometry_type: "Point",
    record_kind: "provider_published_5g_site",
    is_named: true,
    duplicate_coordinate_group: "",
    source_dataset: "Jazz official 5G KML point placemarks",
    source_url: "https://jazz.com.pk/KML_Coverage_map/5G_Active_Sites_with_Overlay.kml",
    retrieved_at: "2026-08-07",
    accuracy_note: "Exact coordinate value published in the provider KML; not independently surveyed.",
    altitude_m: 0.0,
  },
};

// Minimal valid Zong feature (2 coordinates, altitude_m: null)
const validZongFeature = {
  type: "Feature" as const,
  id: "zong-0001",
  geometry: {
    type: "Point" as const,
    coordinates: [74.3446, 31.5118],
  },
  properties: {
    site_uid: "zong-0001",
    provider: "Zong",
    source_index: 1,
    site_name_source: "Libery Market",
    display_name: "Libery Market",
    city_source: "Lahore",
    geometry_type: "Point",
    record_kind: "provider_published_5g_site",
    is_named: true,
    duplicate_coordinate_group: "",
    source_dataset: "Zong official 5G coverage map LOCS array",
    source_url: "https://www.zong.com.pk/5g-coverage-map",
    retrieved_at: "2026-08-07",
    accuracy_note: "Exact coordinate value published in the provider map source; not independently surveyed.",
    altitude_m: null,
  },
};

describe("CellSiteFeatureSchema", () => {
  it("validates a valid Jazz feature", () => {
    const result = CellSiteFeatureSchema.safeParse(validJazzFeature);
    expect(result.success).toBe(true);
  });

  it("validates a valid Zong feature with null altitude", () => {
    const result = CellSiteFeatureSchema.safeParse(validZongFeature);
    expect(result.success).toBe(true);
  });

  it("rejects a feature with out-of-range latitude", () => {
    const invalid = {
      ...validJazzFeature,
      geometry: { ...validJazzFeature.geometry, coordinates: [73.0, 999.0] },
    };
    const result = CellSiteFeatureSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a feature with invalid site_uid format", () => {
    const invalid = {
      ...validJazzFeature,
      properties: { ...validJazzFeature.properties, site_uid: "invalid-uid" },
    };
    const result = CellSiteFeatureSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a feature with empty display_name", () => {
    const invalid = {
      ...validJazzFeature,
      properties: { ...validJazzFeature.properties, display_name: "" },
    };
    const result = CellSiteFeatureSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a feature with invalid date format", () => {
    const invalid = {
      ...validJazzFeature,
      properties: { ...validJazzFeature.properties, retrieved_at: "07-08-2026" },
    };
    const result = CellSiteFeatureSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a feature with invalid URL", () => {
    const invalid = {
      ...validJazzFeature,
      properties: { ...validJazzFeature.properties, source_url: "not-a-url" },
    };
    const result = CellSiteFeatureSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
