import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_DATASET } from "@/data/siteDataset";
import { deriveCityForSite } from "@/features/cell-sites/utils/siteUtils";
import type { CellSiteFeatureCollection } from "@/types/cell-site";

export const COVERAGE_OPERATORS = ["Jazz", "Zong", "Ufone / Onic"] as const;
export type CoverageOperator = (typeof COVERAGE_OPERATORS)[number];

type CityDefinition = {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
};

const CITY_DEFINITIONS: CityDefinition[] = [
  { slug: "karachi", name: "Karachi", latitude: 24.8607, longitude: 67.0011 },
  { slug: "lahore", name: "Lahore", latitude: 31.5204, longitude: 74.3587 },
  { slug: "islamabad", name: "Islamabad", latitude: 33.6844, longitude: 73.0479 },
  { slug: "faisalabad", name: "Faisalabad", latitude: 31.4504, longitude: 73.135 },
  { slug: "rawalpindi", name: "Rawalpindi", latitude: 33.5651, longitude: 73.0169 },
  { slug: "multan", name: "Multan", latitude: 30.1575, longitude: 71.5249 },
  { slug: "peshawar", name: "Peshawar", latitude: 34.0151, longitude: 71.5249 },
  { slug: "quetta", name: "Quetta", latitude: 30.1798, longitude: 66.975 },
];

export type CoverageCitySummary = CityDefinition & {
  totalSites: number;
  operatorCounts: Record<CoverageOperator, number>;
  leadingOperator: CoverageOperator;
  mapHref: string;
};

export type CoverageOperatorSummary = {
  slug: string;
  name: CoverageOperator;
  totalSites: number;
  sourceName: string;
  sourceUrl: string;
  accuracy: string;
  sourceReview: string;
  cityCounts: Array<{ city: string; slug: string | null; count: number }>;
};

const OPERATOR_SLUGS: Record<CoverageOperator, string> = {
  Jazz: "jazz-5g-coverage",
  Zong: "zong-5g-coverage",
  "Ufone / Onic": "ufone-onic-5g-coverage",
};

let cachedCollection: CellSiteFeatureCollection | null = null;

function getCollection() {
  if (!cachedCollection) {
    const path = join(process.cwd(), "public", "data", "sites.geojson");
    cachedCollection = JSON.parse(readFileSync(path, "utf8")) as CellSiteFeatureCollection;
  }
  return cachedCollection;
}

function emptyOperatorCounts(): Record<CoverageOperator, number> {
  return { Jazz: 0, Zong: 0, "Ufone / Onic": 0 };
}

export function getCoverageCities(): CoverageCitySummary[] {
  const collection = getCollection();
  return CITY_DEFINITIONS.map((definition) => {
    const operatorCounts = emptyOperatorCounts();
    for (const feature of collection.features) {
      if (deriveCityForSite(feature.properties) !== definition.name) continue;
      const provider = feature.properties.provider as CoverageOperator;
      if (provider in operatorCounts) operatorCounts[provider] += 1;
    }
    const totalSites = Object.values(operatorCounts).reduce((sum, count) => sum + count, 0);
    const leadingOperator = COVERAGE_OPERATORS.reduce((leader, operator) =>
      operatorCounts[operator] > operatorCounts[leader] ? operator : leader
    );
    const mapParams = new URLSearchParams({
      lat: definition.latitude.toFixed(4),
      lng: definition.longitude.toFixed(4),
      zoom: "11",
    });
    return {
      ...definition,
      totalSites,
      operatorCounts,
      leadingOperator,
      mapHref: `/map?${mapParams.toString()}`,
    };
  });
}

export function getCoverageCity(slug: string) {
  return getCoverageCities().find((city) => city.slug === slug) ?? null;
}

export function getCoverageOperators(): CoverageOperatorSummary[] {
  const collection = getCollection();
  const pageCities = new Map(CITY_DEFINITIONS.map((city) => [city.name, city.slug]));
  return COVERAGE_OPERATORS.map((name) => {
    const cityCounts = new Map<string, number>();
    let totalSites = 0;
    for (const feature of collection.features) {
      if (feature.properties.provider !== name) continue;
      totalSites += 1;
      const city = deriveCityForSite(feature.properties) ?? "Location not classified";
      cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
    }
    const provider = SITE_DATASET.providers.find((item) => item.name === name);
    if (!provider) throw new Error(`Missing SITE_DATASET entry for ${name}`);
    return {
      slug: OPERATOR_SLUGS[name],
      name,
      totalSites,
      sourceName: provider.sourceName,
      sourceUrl: provider.sourceUrl,
      accuracy: provider.accuracy,
      sourceReview: provider.sourceReview,
      cityCounts: [...cityCounts.entries()]
        .map(([city, count]) => ({ city, count, slug: pageCities.get(city) ?? null }))
        .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city)),
    };
  });
}

export function getCoverageOperator(slug: string) {
  return getCoverageOperators().find((operator) => operator.slug === slug) ?? null;
}

export function getCoverageReviewFacts() {
  return {
    retrievedAt: SITE_DATASET.retrievedAt,
    reviewedAt: SITE_DATASET.reviewedAt,
    totalSites: getCollection().features.length,
  };
}
