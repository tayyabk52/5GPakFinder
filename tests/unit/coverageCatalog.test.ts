import { describe, expect, it } from "vitest";
import { SITE_DATASET } from "@/data/siteDataset";
import { COVERAGE_GUIDES } from "@/features/seo-coverage/content";
import { getCoverageCities, getCoverageOperators } from "@/server/coverage/catalog";

describe("coverage SEO catalogue", () => {
  it("derives stable city counts from the published GeoJSON", () => {
    const cities = getCoverageCities();
    expect(cities.map((city) => [city.name, city.totalSites])).toEqual([
      ["Karachi", 216], ["Lahore", 182], ["Islamabad", 164], ["Faisalabad", 79],
      ["Rawalpindi", 71], ["Multan", 62], ["Peshawar", 53], ["Quetta", 28],
    ]);
    for (const city of cities) {
      expect(Object.values(city.operatorCounts).reduce((sum, count) => sum + count, 0)).toBe(city.totalSites);
      expect(city.mapHref).toMatch(/^\/map\?lat=.*&lng=.*&zoom=11$/);
    }
  });

  it("keeps operator totals and provenance aligned with the release", () => {
    const operators = getCoverageOperators();
    expect(operators.map((operator) => [operator.name, operator.totalSites])).toEqual(SITE_DATASET.providers.map((provider) => [provider.name, provider.count]));
    expect(operators.every((operator) => operator.sourceUrl.startsWith("https://"))).toBe(true);
    expect(operators.every((operator) => operator.sourceReview.length > 40)).toBe(true);
  });

  it("publishes distinct, substantive guide pages", () => {
    expect(new Set(COVERAGE_GUIDES.map((guide) => guide.slug)).size).toBe(COVERAGE_GUIDES.length);
    expect(COVERAGE_GUIDES.every((guide) => guide.sections.length >= 3 && guide.questions.length >= 2)).toBe(true);
    expect(COVERAGE_GUIDES.some((guide) => guide.sections.some((section) => section.title.includes("Kya") || section.title.includes("kyun") || section.title.includes("karta")))).toBe(true);
  });
});
