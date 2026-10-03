import { test, expect } from "./fixtures";

const routes = [
  "live",
  "audience",
  "audience/archive",
  "audience/history",
  "audience/progression",
  "audience/commands",
  "audience/greetings",
  "audience/awards",
  "studio",
  "settings/platforms",
  "settings/network",
  "settings/data",
  "settings/application",
  "settings/diagnostics",
  "about",
];

test("all workspaces and direct links remain reachable", async ({
  page,
  runtime,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of routes) {
    await page.goto(runtime.url + "/#" + route);
    await expect(
      page.locator("#workspace-" + route.split("/")[0]),
    ).toBeVisible();
    await expect(
      page.locator('.shell-nav__link[aria-current="page"]').first(),
    ).toBeVisible();
    if (route.startsWith("audience")) {
      const tab = route.split("/")[1] || "viewers";
      await expect(page.locator("#audience-" + tab + "-tab")).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await expect(page.locator("#audience-" + tab + "-panel")).toBeVisible();
    }
    if (route.startsWith("settings/"))
      await expect(
        page.locator("#settings-" + route.split("/")[1] + "-panel"),
      ).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("sidebar preference and browser history survive navigation", { tag: ["@browser"] }, async ({
  page,
  runtime,
}) => {
  await page.locator("#sidebar-toggle").click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-sidebar-state",
    "collapsed",
  );
  await page.locator('#side-primary-navigation a[href="#audience"]').click();
  await expect(page.locator("#workspace-audience")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#workspace-live")).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-sidebar-state",
    "collapsed",
  );
  await page.goto(runtime.url + "/#settings/about");
  await expect(page.locator("#workspace-about")).toBeVisible();
});

for (const size of [
  { width: 1280, height: 800 },
  { width: 800, height: 600 },
  { width: 390, height: 844 },
]) {
  test(`workspace geometry ${size.width}x${size.height}`, { tag: "@browser" }, async ({ page, runtime }) => {
    await page.setViewportSize(size);
    for (const route of ["live", "audience", "studio", "settings/application", "about"]) {
      await page.goto(runtime.url + "/#" + route);
      const workspace = page.locator("#workspace-" + route.split("/")[0]);
      await expect(workspace).toBeVisible();
      await expect(page.locator("#twitch-status")).not.toHaveText("-");
      if (route === "live") {
        const rewards = page.locator("#live-contracts-tab");
        await rewards.click();
        await expect(rewards).toHaveAttribute("aria-selected", "true");
        await expect(page.locator("#live-contracts-draft")).toBeVisible();
        await page.locator("#live-messages-tab").click();
        await expect(page.locator("#recent-messages-empty")).toBeVisible();
      }
      if (route === "audience") {
        await expect(page.locator("#audience-viewers-table-body tr")).toHaveCount(3);
      }
      if (route === "studio") {
        await page.locator('[data-studio-add-to-obs-action="done"]').click();
        const preview = page.frameLocator("#overlay-preview-frame");
        await expect(preview.locator(".message")).toHaveCount(4);
        await expect(preview.locator(".message").last()).toContainText(
          "Sample preview uses the same renderer as the OBS Browser Source.",
        );
        await expect(page.locator("#studio-add-to-obs-open")).toBeInViewport();
      }
      if (route === "settings/application") {
        const lastField = page.locator("#image-previews-max-per-message");
        await lastField.scrollIntoViewIfNeeded();
        await expect(lastField).toBeInViewport();
        // Trial click checks hit testing: a visible input can still be covered
        // by fixed navigation/footer chrome.
        await lastField.click({ trial: true });
        const save = page.locator("[data-section-save]");
        await save.scrollIntoViewIfNeeded();
        await expect(save).toBeInViewport();
      }
      await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth - innerWidth,
      ), { message: `${route}: no horizontal document overflow` }).toBeLessThanOrEqual(1);
      const navigation = page.locator('.shell-nav:visible a[aria-current="page"]').first();
      await navigation.scrollIntoViewIfNeeded();
      await expect(navigation).toBeInViewport();
      await navigation.click({ trial: true });
    }
  });
}
