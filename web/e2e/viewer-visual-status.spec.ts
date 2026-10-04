import { test, expect } from "./fixtures";

test("viewer visual previews cover themes and keep large magazines bounded", async ({ page, runtime }, info) => {
  const statusReads: string[] = [];
  page.on("request", request => { if (request.url().endsWith("/api/viewers/status")) statusReads.push(request.url()); });
  await page.setViewportSize({ width: 420, height: 900 });
  for (const theme of ["default", "dashboard", "cockpit_panel", "cockpit_popups", "g_rebels_popups"]) {
    await page.goto(runtime.url + "/overlay?preview=sample&theme=" + theme + "&message_ttl_seconds=0");
    await expect(page.locator(".message")).toHaveCount(4);
    await expect(page.locator(".viewer-level-badge")).toHaveCount(4);
    await expect(page.locator(".viewer-ammo--like").nth(2)).toContainText("73 / 100");
    await expect(page.locator(".viewer-ammo--like").nth(2).locator(".viewer-ammo__round")).toHaveCount(0);
    await expect.poll(() => page.locator(".message").evaluateAll(nodes => nodes.flatMap(node => {
      const rect = node.getBoundingClientRect();
      const children = [...node.querySelectorAll(".viewer-ammo, .viewer-level-badge, .message__text")];
      const clipped = children.some(child => {
        const box = child.getBoundingClientRect();
        return box.left < rect.left - 1 || box.right > rect.right + 1;
      });
      return rect.left < -1 || rect.right > innerWidth + 1 || clipped
        ? [{ left: rect.left, right: rect.right, clipped }] : [];
    })), { message: theme }).toEqual([]);
    if (theme.startsWith("cockpit") || theme === "g_rebels_popups") {
      expect(await page.locator(".message").evaluateAll(nodes => nodes.every(node =>
        node.querySelector(".message__text")!.getBoundingClientRect().width > node.getBoundingClientRect().width / 2,
      )), theme).toBe(true);
    }
    expect(await page.locator(".message").first().evaluate(node => {
      const slot = node.querySelector(".message__reward-slot")!;
      const text = node.querySelector(".message__text")!;
      const before = text.getBoundingClientRect();
      const beforeCard = node.getBoundingClientRect();
      const identity = node.querySelector(".message__identity")!.getBoundingClientRect();
      const style = getComputedStyle(node);
      const topInset = identity.top - beforeCard.top - parseFloat(style.paddingTop) - parseFloat(style.borderTopWidth);
      slot.querySelector(".message__reward-name")!.textContent = "A long award name";
      slot.querySelector(".message__reward-points")!.textContent = "+100";
      slot.removeAttribute("aria-hidden");
      const after = text.getBoundingClientRect();
      const afterCard = node.getBoundingClientRect();
      const rewardBelow = slot.getBoundingClientRect().top >= after.bottom;
      slot.querySelector(".message__reward-name")!.textContent = "";
      slot.querySelector(".message__reward-points")!.textContent = "";
      slot.setAttribute("aria-hidden", "true");
      return rewardBelow && Math.abs(topInset) < 1
        && Math.abs((before.y - beforeCard.y) - (after.y - afterCard.y)) < 1
        && Math.abs(before.width - after.width) < 1;
    }), theme + " no empty top row; award follows the body").toBe(true);
    await page.screenshot({ path: info.outputPath(theme + ".png") });
    for (const width of [320, 800, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.locator(".message").evaluateAll(nodes => nodes.every(node => {
        const header = node.querySelector(".message__identity")!.getBoundingClientRect();
        const status = node.querySelector(".message__status")!.getBoundingClientRect();
        const text = node.querySelector(".message__text")!.getBoundingClientRect();
        const card = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const contentWidth = card.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
          - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
        return Math.abs(status.right - header.right) < 2 && status.left >= header.left - 1
          && text.top >= header.bottom - 1 && Math.abs(text.width - contentWidth) < 2
          && status.right <= innerWidth && node.scrollWidth <= node.clientWidth + 1;
      })), { message: theme + " header at " + width }).toBe(true);
    }
    await page.setViewportSize({ width: 420, height: 900 });
  }
  await page.goto(runtime.url + "/overlay?preview=sample&show_level_badges=0&show_command_ammo=0");
  await expect(page.locator(".message")).toHaveCount(4);
  await expect(page.locator(".viewer-level-badge, .viewer-ammo")).toHaveCount(0);
  await page.goto(runtime.url + "/overlay/leaderboard?preview=sample&show_level_badges=1");
  await expect(page.locator(".viewer-level-badge")).toHaveCount(5);
  await page.goto(runtime.url + "/overlay/leaderboard?preview=sample&show_level_badges=0");
  await expect(page.locator(".leaderboard-row")).toHaveCount(5);
  await expect(page.locator(".viewer-level-badge")).toHaveCount(0);
  expect(statusReads).toEqual([]);
});

test("viewer visual emblem editor persists and Audience shows exact stocks", async ({ page, runtime }) => {
  await page.goto(runtime.url + "/#/audience/progression");
  await page.locator('#progression-level-list [role="option"]').first().click();
  const emblem = page.locator("#progression-level-emblem");
  await emblem.selectOption("star");
  await expect(page.locator("#progression-level-form .viewer-level-badge--star")).toHaveCount(1);
  await page.locator("#progression-submit-1").click();
  await expect(page.locator("#progression-submit-1")).toBeEnabled();
  await page.reload();
  await page.locator('#progression-level-list [role="option"]').first().click();
  await expect(emblem).toHaveValue("star");
  await page.goto(runtime.url + "/#/audience");
  await page.locator("#audience-viewers-table-body tr").first().getByRole("button").click();
  await expect(page.locator(".audience-detail__progression .viewer-level-badge--star")).toHaveCount(1);
  await expect(page.locator(".audience-detail__progression .viewer-ammo--like")).toContainText("1 / 1");
  await expect(page.locator(".audience-detail__progression .viewer-ammo--buff")).toContainText("1 / 1");
});

test("viewer visual production snapshots restore identity and refresh after level edits", async ({ page, runtime }) => {
  const level = { id: "recruit", title: "Pilot", min_xp: 0, like_quota: 100, buff_quota: 5, announce: false, emblem: "star" };
  expect((await page.request.post(runtime.url + "/api/progression/levels/update", { data: level })).ok()).toBe(true);
  await page.route("**/api/messages/recent?*", route => route.fulfill({ json: { messages: [{ id: "visual-message", platform: "twitch", user_id: "e2e-viewer-0", username: "Night Owl", message: "A restored message", timestamp: new Date().toISOString() }] } }));
  await page.goto(runtime.url + "/overlay?message_ttl_seconds=0");
  await expect(page.locator(".viewer-level-badge--star")).toHaveCount(1);
  await expect(page.locator(".viewer-ammo--like")).toContainText("100 / 100");
  expect((await page.request.post(runtime.url + "/api/progression/levels/update", { data: { ...level, like_quota: 9, emblem: "laurel" } })).ok()).toBe(true);
  await expect(page.locator(".viewer-level-badge--laurel")).toHaveCount(1);
  await expect(page.locator(".viewer-ammo--like")).toContainText("9 / 9");
  await page.route("**/api/viewers/status", route => route.fulfill({ status: 503, json: { error: "Unavailable" } }));
  await expect(page.locator(".viewer-ammo")).toHaveCount(0, { timeout: 7000 });
  await expect(page.locator(".message__text")).toHaveText("A restored message");
  await page.unroute("**/api/viewers/status");
  await expect(page.locator(".viewer-ammo--like")).toContainText("9 / 9", { timeout: 7000 });
});

test("viewer visual Studio switches default on and persist independently", async ({ page, runtime }) => {
  await page.evaluate(() => localStorage.setItem("commRelay.studio.obsSetupState", "completed"));
  await page.goto(runtime.url + "/#/studio");
  const badges = page.locator("#overlay-chat-show-level-badges");
  const ammo = page.locator("#overlay-chat-show-command-ammo");
  await expect(badges).toBeChecked();
  await expect(ammo).toBeChecked();
  await ammo.uncheck();
  const save = page.locator("#studio-publish");
  await save.click();
  await expect(save).toBeDisabled();
  await page.reload();
  await expect(ammo).not.toBeChecked();
  await expect(badges).toBeChecked();
  const cfg = await (await page.request.get(runtime.url + "/api/config")).json();
  const active = cfg.overlay.presets.find((preset: { id: string }) => preset.id === cfg.overlay.active_preset_id);
  expect(active.surfaces.chat.show_command_ammo).toBe(false);
  expect(active.surfaces.leaderboard.show_level_badges).not.toBe(false);
});
