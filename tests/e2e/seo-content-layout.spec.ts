import { expect, test } from "@playwright/test";

const routes = [
  "/coverage",
  "/coverage/karachi",
  "/operators/jazz-5g-coverage",
  "/guides/how-to-check-5g-coverage-pakistan",
  "/compare/jazz-vs-zong-5g-pakistan",
  "/reports/pakistan-5g-rollout-august-2026",
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
