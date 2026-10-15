import { test, expect } from "./fixtures";

test("recap captures level badges for admin, OBS and history", async ({ page, runtime }) => {
  const level = { id: "recruit", title: "Pilot", min_xp: 0, like_quota: 1, buff_quota: 1, announce: false, emblem: "star" };
  expect((await page.request.post(runtime.url + "/api/progression/levels/update", { data: level })).ok()).toBe(true);
  expect((await page.request.post(runtime.url + "/api/awards/grant", {
    data: { platform: "twitch", user_id: "e2e-viewer-0", award_id: "like" },
  })).ok()).toBe(true);
  await page.goto(runtime.url + "/#/live");
  await page.locator("#live-recap-button").click();
  await expect(page.locator(".live-recap-ranking .viewer-level-badge--star").first()).toBeVisible();
  await page.locator("#live-recap-show").click();
  await page.locator("#live-recap-confirm").click();
  await expect(page.locator("#live-recap-download")).toBeEnabled();
  expect((await page.request.post(runtime.url + "/api/progression/levels/update", { data: { ...level, title: "Captain", emblem: "laurel" } })).ok()).toBe(true);
  const overlay = await page.context().newPage();
  await overlay.goto(runtime.url + "/overlay/recap");
  await expect(overlay.locator(".recap-ranking .viewer-level-badge--star").first()).toBeVisible();
  await expect(overlay.locator(".recap-ranking .viewer-level-badge--star").first()).toHaveAttribute("title", "Level: Pilot");
  await expect(overlay.locator(".viewer-level-badge--laurel")).toHaveCount(0);
  await page.locator("#live-recap-hide").click();
  await page.locator("#live-recap-history-tab").click();
  await page.locator(".live-recap-history-row").first().click();
  await expect(page.locator(".live-recap-ranking .viewer-level-badge--star").first()).toBeVisible();
  await overlay.close();
});

test("recap sample badges fit themed rankings and legacy rows have no badge", async ({ page, runtime }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const theme of ["default", "dashboard", "cockpit_panel", "cockpit_popups", "g_rebels_popups"]) {
    await page.goto(runtime.url + "/overlay/recap?preview=sample&theme=" + theme);
    await expect(page.locator(".recap-ranking .viewer-level-badge")).toHaveCount(2);
    await expect(page.locator(".recap-ranking__row").nth(2).locator(".viewer-level-badge")).toHaveCount(0);
    await expect(page.locator(".recap-achievements .viewer-level-badge")).toHaveCount(0);
    expect(await page.locator(".recap-ranking__heading").evaluateAll(nodes => nodes.every(node => {
      const rect = node.getBoundingClientRect();
      return [...node.children].every(child => {
        const box = child.getBoundingClientRect();
        return box.left >= rect.left - 1 && box.right <= rect.right + 1;
      });
    })), theme).toBe(true);
    await page.screenshot({ path: info.outputPath(theme + ".png") });
  }
});
