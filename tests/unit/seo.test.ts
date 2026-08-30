import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { SITE_DATASET } from "@/data/siteDataset";
import { createPageMetadata, SITE_ORIGIN } from "@/lib/seo";

describe("SEO discovery controls", () => {
  it("publishes one canonical origin and only indexable sitemap routes", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(SITE_ORIGIN).toBe("https://www.5gpakistan.app");
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((url) => url.startsWith(`${SITE_ORIGIN}/`) || url === SITE_ORIGIN)).toBe(true);
    expect(urls).toContain(`${SITE_ORIGIN}/5g-coverage-map-pakistan`);
    expect(urls).toContain(`${SITE_ORIGIN}/methodology`);
    expect(urls).not.toContain(`${SITE_ORIGIN}/bug-report`);
    expect(urls).not.toContain(`${SITE_ORIGIN}/suggestions`);
  });

  it("allows public crawling, excludes API endpoints, and declares the sitemap", () => {
    const value = robots();
    expect(value.rules).toEqual({ userAgent: "*", allow: "/", disallow: "/api/" });
    expect(value.sitemap).toBe(`${SITE_ORIGIN}/sitemap.xml`);
    expect(value.host).toBe(SITE_ORIGIN);
  });

  it("builds canonical index and noindex metadata consistently", () => {
    const publicPage = createPageMetadata({ title: "Coverage", description: "Description", path: "/map" });
    const utilityPage = createPageMetadata({ title: "Report", description: "Description", path: "/bug-report", index: false });

    expect(publicPage.alternates).toEqual({ canonical: "/map" });
    expect(publicPage.robots).toMatchObject({ index: true, follow: true });
    expect(publicPage.openGraph).toMatchObject({ url: "/map", locale: "en_PK", siteName: "5GPak" });
    expect(utilityPage.robots).toEqual({ index: false, follow: true });
  });
});

describe("published site dataset facts", () => {
  it("matches the GeoJSON release used by the map", () => {
    const collection = JSON.parse(readFileSync("public/data/sites.geojson", "utf8")) as {
      features: Array<{ properties: { provider: string; retrieved_at: string; source_url: string } }>;
    };
    const providerCounts = Object.fromEntries(SITE_DATASET.providers.map((provider) => [provider.name, provider.count]));
    const actualCounts: Record<string, number> = {};

    for (const feature of collection.features) {
      const provider = feature.properties.provider;
      actualCounts[provider] = (actualCounts[provider] ?? 0) + 1;
      expect(feature.properties.retrieved_at).toBe(SITE_DATASET.retrievedAt);
      expect(SITE_DATASET.providers.some((item) => item.sourceUrl === feature.properties.source_url)).toBe(true);
    }

    expect(collection.features).toHaveLength(SITE_DATASET.totalSites);
    expect(actualCounts).toEqual(providerCounts);
  });
});
