import { test, expect } from "./fixtures";
for (const width of [1280, 800, 390]) {
  test(`@visual populated audience and dialogs ${width}`, async ({
    page,
    runtime,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const entry = "/#";
    await page.route("**/api/diagnostics", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: {
          ...(await response.json()),
          websocket_clients: 0,
          uptime_seconds: 0,
        },
      });
    });
    await page.goto(runtime.url + entry + "audience");
    await expect(page.locator("#audience-viewers-table-body tr")).toHaveCount(
      3,
    );
    await expect(page.locator("#twitch-status")).toHaveText(/disabled/i);
    await expect(page.locator("#audience-viewers-panel")).toHaveScreenshot(
      `audience-populated-${width}.png`,
      { animations: "disabled" },
    );
    await page
      .locator(".audience-viewers-table__name-button", { hasText: "Night Owl" })
      .click();
    await expect(page.locator("#viewer-display-name")).toHaveValue("Night Owl");
    await expect(page.locator("#viewer-reward-history-heading")).toBeVisible();
    await expect(
      page.locator(
        width >= 1024 ? "#audience-inspector" : "#audience-detail-sheet",
      ),
    ).toHaveScreenshot(`viewer-detail-${width}.png`, {
      animations: "disabled",
    });
    await page.goto(runtime.url + entry + "studio");
    await expect(page.locator("#studio-add-to-obs-dialog")).toBeVisible();
    await expect(page.locator("#studio-add-to-obs-dialog")).toHaveScreenshot(
      `obs-setup-${width}.png`,
      {
        animations: "disabled",
        mask: [page.locator("#studio-add-to-obs-dialog input")],
      },
    );
  });
}
