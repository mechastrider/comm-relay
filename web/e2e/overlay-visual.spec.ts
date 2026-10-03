import { test, expect } from "./fixtures";

// Sample mode uses production renderers with fixed local content, no platforms.
// Every theme spans all three themed surfaces; rectangle fitting is checked
// separately in operator-polish rather than multiplying this visual matrix.
for (const surface of ["chat", "leaderboard", "alert"]) {
  test(`@visual OBS ${surface} themes`, async ({ page, runtime }) => {
    await page.setViewportSize({ width: 640, height: 480 });
    const path = surface === "chat" ? "/overlay" : `/overlay/${surface}`;
    for (const theme of ["default", "dashboard", "cockpit_panel", "cockpit_popups", "g_rebels_popups"]) {
      await page.goto(`${runtime.url}${path}?preview=sample&theme=${theme}&preview_background=dark`);
      if (surface === "chat") {
        await expect(page.locator(".message")).toHaveCount(4);
        await expect(page.locator(".message").last()).toContainText("Sample preview uses the same renderer");
      } else if (surface === "leaderboard") {
        await expect(page.locator(".leaderboard-row")).toHaveCount(5);
      } else {
        await expect(page.locator("#alert-root")).toContainText("Spotter");
      }
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${surface}-${theme}.png`, { animations: "disabled" });
    }
  });
}
