import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { SITE_DATASET } from "@/data/siteDataset";
import { COVERAGE_GUIDES } from "@/features/seo-coverage/content";
import { getCoverageCities, getCoverageOperators } from "@/server/coverage/catalog";

const UPDATED = new Date(`${SITE_DATASET.reviewedAt}T00:00:00+05:00`);

const routes = [
  "/",
  "/5g-coverage-map-pakistan",
  "/coverage",
  "/compare/jazz-vs-zong-5g-pakistan",
  "/reports/pakistan-5g-rollout-august-2026",
  "/map",
  "/insights",
  "/insights/reddit-speedtests",
  "/network-status",
  "/network-history",
  "/methodology",
  "/about",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const generatedRoutes = [
    ...getCoverageCities().map((city) => `/coverage/${city.slug}` as const),
    ...getCoverageOperators().map((operator) => `/operators/${operator.slug}` as const),
    ...COVERAGE_GUIDES.map((guide) => `/guides/${guide.slug}` as const),
  ];
  return [...routes, ...generatedRoutes].map((route) => ({ url: absoluteUrl(route), lastModified: UPDATED }));
}
