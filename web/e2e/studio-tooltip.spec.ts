import { test, expect } from "./fixtures";

for (const viewport of [{ width: 1440, height: 900 }, { width: 1100, height: 700 }, { width: 520, height: 600 }, { width: 390, height: 844 }]) {
  test(`Studio tooltips are not clipped at ${viewport.width}`, async ({ page, runtime }, info) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/config", async route => {
      const response = await route.fetch();
      const config = await response.json();
      config.admin.time_locale = "ru-RU";
      await route.fulfill({ response, json: config });
    });
    await page.goto(runtime.url + "/?studio-tooltip#/studio");
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    const done = page.locator('[data-studio-add-to-obs-action="done"]');
    await done.click();
    await page.locator("#studio-mode-all").click();
    await expect(page.locator(".overlay-preview-stage")).toHaveCSS("overflow", "hidden");
    if (viewport.width >= 1100) {
      const scrolled = await page.locator(".studio-inspector__body").evaluate(el => {
        el.scrollTop = 100;
        const offset = el.scrollTop;
        el.scrollTop = 0;
        return offset;
      });
      expect(scrolled).toBeGreaterThan(0);
    }
    for (const id of ["overlay-preset-add", "overlay-preset-rename", "overlay-preset-duplicate", "overlay-preview-overflow-toggle"]) {
      const button = page.locator("#" + id);
      await button.hover();
      const tooltip = button.getByRole("tooltip");
      await expect(tooltip).toBeVisible();
      await page.waitForTimeout(150);
      await page.screenshot({ path: info.outputPath(id + ".png") });
      const clipping = await tooltip.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const problems: unknown[] = [];
        if (rect.left < 0 || rect.right > innerWidth || rect.top < 0 || rect.bottom > innerHeight) {
          problems.push({ viewport: true, rect: rect.toJSON() });
        }
        if (el.scrollHeight > el.clientHeight) problems.push({ clippedText: true });
        for (let parent = el.parentElement; parent; parent = parent.parentElement) {
          const css = getComputedStyle(parent);
          const box = parent.getBoundingClientRect();
          if ((css.overflowX !== "visible" && (rect.left < box.left - 1 || rect.right > box.right + 1)) ||
              (css.overflowY !== "visible" && (rect.top < box.top - 1 || rect.bottom > box.bottom + 1))) {
            problems.push({ parent: parent.className, rect: rect.toJSON(), box: box.toJSON() });
          }
        }
        return problems;
      });
      expect(clipping, id).toEqual([]);
      await page.mouse.move(0, 0);
      await button.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await expect(tooltip).toBeVisible();
      await button.evaluate(el => el.blur());
    }
  });
}
