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

test("sidebar preference and browser history survive navigation", async ({
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
  test(`@visual workspace baseline ${size.width}x${size.height}`, async ({
    page,
    runtime,
  }) => {
    await page.setViewportSize(size);
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
    await page.reload();
    await expect(page.locator("#live-browser-clients")).toContainText("0");
    await page.addStyleTag({
      content:
        "* { animation: none !important; transition: none !important; caret-color: transparent !important; }",
    });
    for (const route of process.env.COMM_RELAY_E2E_VISUAL_ROUTES?.split(
      ",",
    ) ?? ["live", "audience", "studio", "settings/application", "about"]) {
      await page.goto(runtime.url + "/#" + route);
      await expect(
        page.locator("#workspace-" + route.split("/")[0]),
      ).toBeVisible();
      await expect(page.locator("#twitch-status")).not.toHaveText("-");
      if (route === "studio") {
        const setup = page.locator("#studio-add-to-obs-dialog");
        if (await setup.isVisible())
          await page.locator('[data-studio-add-to-obs-action="done"]').click();
        await expect(page.locator("#overlay-preview-frame")).toHaveAttribute(
          "src",
          /overlay/,
        );
        // Sample messages arrive on staggered timers. A loaded iframe (or two
        // identical screenshots) can still contain only the first message.
        const preview = page.frameLocator("#overlay-preview-frame");
        await expect(preview.locator(".message")).toHaveCount(4);
        await expect(preview.locator(".message").last()).toContainText(
          "Sample preview uses the same renderer as the OBS Browser Source.",
        );
      }
      // Collect differences for every workspace, not just the first route.
      await expect.soft(page).toHaveScreenshot(
        route.replaceAll("/", "-") + `-${size.width}.png`,
        {
          fullPage: true,
          animations: "disabled",
          mask: [
            page.locator("#shell-status-bar"),
            page.locator("#recent-messages"),
            page.locator("#audience-viewers-panel tbody"),
          ],
        },
      );
    }
  });
}
