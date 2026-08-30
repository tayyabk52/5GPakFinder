import { expect, test } from "@playwright/test";

const mobileViewports = [
  { name: "compact phone", width: 375, height: 667 },
  { name: "standard phone", width: 390, height: 844 },
];

for (const viewport of mobileViewports) {
  test(`map controls remain inside a ${viewport.name} viewport`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/map");

    const map = page.getByTestId("main-map-view");
    const reportButton = page.locator("#report-coverage-button");

    await expect(map).toBeVisible();
    await expect(reportButton).toBeVisible();

    const [mapBox, reportBox] = await Promise.all([
      map.boundingBox(),
      reportButton.boundingBox(),
    ]);

    expect(mapBox).not.toBeNull();
    expect(reportBox).not.toBeNull();
    expect(mapBox!.y + mapBox!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(reportBox!.y + reportBox!.height).toBeLessThanOrEqual(viewport.height);
    expect(reportBox!.y).toBeGreaterThanOrEqual(mapBox!.y);
  });
}
