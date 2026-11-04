import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

async function open(page: Page, url: string) {
  await page.goto(url + "/#/audience/progression");
  await expect(page.locator("#progression-level-new")).toBeEnabled();
}

async function contained(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  expect(box).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

test("progression guards catalog, record and route changes and retains filters", async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, runtime.url);
  const title = page.locator("#progression-level-title");
  const original = await title.inputValue();
  await title.fill("Unsaved level");
  await page.locator("#progression-achievement-tab").click();
  await page.locator("#discard-changes-cancel").click();
  await expect(title).toHaveValue("Unsaved level");
  await expect(page.locator("#progression-level-tab")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#progression-level-new").click();
  await page.keyboard.press("Escape");
  await expect(title).toHaveValue("Unsaved level");
  await page.locator("#audience-commands-tab").click();
  await page.locator("#discard-changes-cancel").click();
  await expect(title).toHaveValue("Unsaved level");
  await page.locator("#progression-achievement-tab").click();
  await page.locator("#discard-changes-confirm").click();
  await expect(page.locator("#progression-level-list")).toHaveCount(0);
  await page
    .locator("#progression-achievement-search")
    .fill("no matching achievement");
  await page
    .locator("#progression-achievement-filter")
    .selectOption("disabled");
  await expect(page.locator("#progression-achievement-empty")).toBeVisible();
  await page.locator("#progression-level-tab").click();
  await expect(title).toHaveValue(original);
  await page.locator("#progression-achievement-tab").click();
  await expect(page.locator("#progression-achievement-search")).toHaveValue(
    "no matching achievement",
  );
  await expect(page.locator("#progression-achievement-filter")).toHaveValue(
    "disabled",
  );
});

test("progression alerts protect drafts on Escape, backdrop and close and save independently @browser", async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 1100, height: 700 });
  await open(page, runtime.url);
  await page.locator("#progression-level-title").fill("Retained editor draft");
  await page.locator("#progression-alerts-open").click();
  const dialog = page.locator("#progression-alerts-dialog");
  const sound = page.locator("#progression-alert-sound");
  const original = await sound.inputValue();
  await sound.fill("chime");
  await page.keyboard.press("Escape");
  await expect(page.locator("#discard-changes-dialog")).toBeVisible();
  await page.locator("#discard-changes-cancel").click();
  await expect(sound).toHaveValue("chime");
  await expect(sound).toBeFocused();
  await page.mouse.click(2, 2);
  await page.locator("#discard-changes-cancel").click();
  await expect(dialog).toBeVisible();
  await page.locator("#progression-alerts-close").click();
  await page.locator("#discard-changes-confirm").click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("#progression-alerts-open")).toBeFocused();
  await expect(page.locator("#progression-level-title")).toHaveValue(
    "Retained editor draft",
  );
  await page.locator("#progression-alerts-open").click();
  await expect(sound).toHaveValue(original);
  await page.locator("#progression-level-alert-enabled").uncheck();
  await page.locator("#progression-submit-8").click();
  await expect(page.locator("#progression-settings-status")).toContainText(
    /saved/i,
  );
  await page.locator("#progression-alerts-close").click();
  await expect(page.locator("#progression-level-form")).toContainText(
    "Alerts for this category are disabled",
  );
  const settings = await (
    await page.request.get(runtime.url + "/api/progression/settings")
  ).json();
  expect(settings.level_enabled).toBe(false);
  await page.locator("#progression-achievement-tab").click();
  await page.locator("#discard-changes-confirm").click();
  await page.locator("#progression-level-tab").click();
  await page.locator("#progression-level-test").click();
  await expect(page.locator("#progression-status")).toContainText(/preview/i);
});

test("progression errors stay local and retry preserves the settings draft", async ({
  page,
  runtime,
}) => {
  await open(page, runtime.url);
  await page.route("**/api/progression/settings/update", (route) =>
    route.fulfill({ status: 503, json: { error: "Settings unavailable" } }),
  );
  await page.locator("#progression-alerts-open").click();
  await page.locator("#progression-alert-sound").fill("chime");
  await page.locator("#progression-submit-8").click();
  await expect(page.locator("#progression-settings-status")).toContainText(
    "Settings unavailable",
  );
  await expect(page.locator("#progression-alert-sound")).toHaveValue("chime");
  await page.unroute("**/api/progression/settings/update");
  await page.locator("#progression-submit-8").click();
  await expect(page.locator("#progression-settings-status")).toContainText(
    /saved/i,
  );
  await page.locator("#progression-alerts-close").click();
  await expect(page.locator("#progression-status")).toHaveCount(0);
});

test("progression compact editor returns to list with draft protection and keyboard focus @browser", async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, runtime.url);
  const first = page.locator('#progression-level-list [role="option"]').first();
  await expect(page.locator("#progression-level-form")).not.toBeVisible();
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#progression-level-title")).toBeFocused();
  await expect(page.locator("#progression-level-list")).not.toBeVisible();
  await page.locator("#progression-level-title").fill("Mobile draft");
  await page.locator("#progression-back").click();
  await page.locator("#discard-changes-cancel").click();
  await expect(page.locator("#progression-level-title")).toHaveValue(
    "Mobile draft",
  );
  await page.locator("#progression-back").click();
  await page.locator("#discard-changes-confirm").click();
  await expect(first).toBeFocused();
  await expect(page.locator("#progression-level-form")).not.toBeVisible();
});

for (const width of [1440, 1100, 1024, 1023, 520, 390]) {
  test(`progression actions and alert footer fit at ${width}px`, async ({
    page,
    runtime,
  }) => {
    await page.setViewportSize({ width, height: width <= 520 ? 600 : 700 });
    await page.addInitScript(() =>
      localStorage.setItem("commRelay.uiLocale", "ru"),
    );
    await open(page, runtime.url);
    if (width <= 1023)
      await page
        .locator('#progression-level-list [role="option"]')
        .first()
        .click();
    await contained(page, "#progression-alerts-open");
    await contained(page, "#progression-submit-1");
    await page
      .locator("#progression-level-buff-quota")
      .scrollIntoViewIfNeeded();
    await contained(page, "#progression-submit-1");
    await page.locator("#progression-alerts-open").click();
    await contained(page, "#progression-submit-8");
    await contained(page, "#progression-alerts-close");
    await page.locator("#progression-alert-duration").scrollIntoViewIfNeeded();
    await contained(page, "#progression-alert-duration");
    await contained(page, "#progression-submit-8");
    const overflowing = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    expect(overflowing).toBe(false);
  });
}

test("progression long catalog scrolls independently and load failure can be retried", async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.route("**/api/progression/levels", (route) =>
    route.fulfill({ status: 503, json: { error: "Levels unavailable" } }),
  );
  await page.goto(runtime.url + "/#/audience/progression");
  await expect(page.locator(".progression-load-status")).toContainText(
    "Levels unavailable",
  );
  await page.unroute("**/api/progression/levels");
  const { levels } = await (
    await page.request.get(runtime.url + "/api/progression/levels")
  ).json();
  await page.route("**/api/progression/levels", (route) =>
    route.fulfill({
      json: {
        levels: [
          ...levels,
          ...Array.from({ length: 40 }, (_, i) => ({
            ...levels[0],
            id: `fixture-${i}`,
            title: `Long catalog level ${i}`,
            min_xp: 10000 + i,
          })),
        ],
      },
    }),
  );
  await page.locator("#progression-retry").click();
  const list = page.locator("#progression-level-list");
  await expect(list.getByRole("option")).toHaveCount(levels.length + 40);
  await list.getByRole("option").first().focus();
  await page.keyboard.press("End");
  await expect(list.getByRole("option").last()).toBeFocused();
  await contained(page, "#progression-alerts-open");
  await contained(page, "#progression-submit-1");
  await page.locator(".progression-maintenance summary").click();
  await page.locator("#progression-reconcile").click();
  await expect(page.locator("#progression-maintenance-status")).not.toBeEmpty();
  await expect(page.locator("#progression-status")).toHaveCount(0);
});
