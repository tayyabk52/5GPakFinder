import { expect, test } from "@playwright/test";

const routes = [
  "/coverage",
  "/coverage/karachi",
  "/operators/jazz-5g-coverage",
  "/guides/how-to-check-5g-coverage-pakistan",
  "/compare/jazz-vs-zong-5g-pakistan",
  "/reports/pakistan-5g-rollout-august-2026",
  "/dataset-license/v1",
];

for (const route of routes) {
  test(`${route} is readable on a narrow mobile viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
}

for (const route of ["/5g-coverage-map-pakistan", "/insights/reddit-speedtests"]) {
  test(`${route} exposes a versioned Dataset license`, async ({ page }) => {
    await page.goto(route);
    const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
    const datasets = structuredData.map((value) => JSON.parse(value)).flat().filter((value) => value["@type"] === "Dataset");
    expect(datasets).toHaveLength(1);
    expect(datasets[0].license).toEqual({
      "@type": "CreativeWork",
      name: "5GPak Dataset Use Terms v1.0",
      url: "https://www.5gpakistan.app/dataset-license/v1",
    });
    await expect(page.getByRole("link", { name: "5GPak Dataset Use Terms v1.0" })).toBeVisible();
  });
}
