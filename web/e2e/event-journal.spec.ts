import { test, expect } from "./fixtures";

test("live events show real awards, filters and durable history without changing chat", async ({ page, runtime }) => {
  await page.locator("#live-events-tab").click();
  await expect(page.locator(".live-events")).toContainText("No events in this category yet");
  const granted = await page.request.post(runtime.url + "/api/awards/grant", {
    data: { platform: "twitch", user_id: "e2e-viewer-0", award_id: "like" },
  });
  expect(granted.ok(), await granted.text()).toBeTruthy();
  await expect(page.locator(".live-events__entry")).toContainText("Night Owl");
  await expect(page.locator(".live-events__entry time")).toHaveText(/\d{2}:\d{2}:\d{2}/);
  await page.locator("#live-events-category").selectOption("commands");
  await expect(page.locator(".live-events__entry")).toHaveCount(0);
  await page.locator("#live-events-category").selectOption("reactions");
  await expect(page.locator(".live-events__entry")).toHaveCount(1);
  await runtime.restart();
  await page.reload();
  await page.locator("#live-events-tab").click();
  await expect(page.locator(".live-events__entry")).toContainText("Night Owl");
  await page.locator("#live-messages-tab").click();
  await expect(page.locator("#recent-messages > li")).toHaveCount(0);
});

for (const width of [1280, 390]) {
  test(`live events freeze reading, recover errors and fit Russian layout at ${width}`, async ({ page, runtime }, testInfo) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto(runtime.url + "/#/settings/application");
    await page.locator("#time-locale").selectOption("ru-RU");
    await page.locator("[data-section-save]").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await page.goto(runtime.url + "/#/live");
    const rows = Array.from({ length: 40 }, (_, i) => ({
      id: "event-" + i, kind: "like", viewer_name: "Очень длинное имя зрителя ".repeat(3), recipient_name: "Борис", label: "", points: 5, created_at: "2026-10-15T12:00:00.000Z",
    }));
    let response = { session_id: "session", entries: rows };
    let fail = false;
    await page.route("**/api/live-events?*", (route) => fail
      ? route.fulfill({ status: 503, json: { error: "offline" } })
      : route.fulfill({ json: response }));
    await page.locator("#live-events-tab").click();
    await expect(page.locator(".live-events__entry")).toHaveCount(40);
    const body = page.locator(".live-events__body");
    await body.evaluate((element) => { element.scrollTop = 200; element.dispatchEvent(new Event("scroll")); });
    await expect(page.getByRole("button", { name: "К новым событиям", exact: true })).toBeVisible();
    const before = await body.evaluate((element) => element.scrollTop);
    response = { ...response, entries: [{ ...rows[0], id: "new", viewer_name: "Новое событие" }, ...rows] };
    await expect(page.getByRole("button", { name: "Новых событий: 1" })).toBeVisible();
    expect(await body.evaluate((element) => element.scrollTop)).toBe(before);
    await expect(body).not.toContainText("Новое событие");
    await page.getByRole("button", { name: "Новых событий: 1" }).click();
    await expect(body).toContainText("Новое событие");
    fail = true;
    await expect(page.getByRole("alert")).toContainText("Не удалось обновить события");
    await expect(body).toContainText("Новое событие");
    fail = false;
    await page.getByRole("button", { name: "Повторить", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
    const bounds = await body.boundingBox();
    expect(bounds?.height).toBeGreaterThan(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await body.focus();
    await expect(body).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath("events.png") });
  });
}
