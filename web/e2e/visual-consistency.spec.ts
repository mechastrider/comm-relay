import { test, expect } from "./fixtures";

for (const locale of ["ru-RU", "en-GB"]) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1100, height: 700 }, { width: 390, height: 844 }]) {
    test(`shared action geometry and form sections ${locale} ${viewport.width}`, async ({ page, runtime }) => {
      await page.setViewportSize(viewport);
      await page.route("**/api/config", async route => {
        const response = await route.fetch();
        const config = await response.json();
        config.admin.time_locale = locale;
        await route.fulfill({ response, json: config });
      });
      await page.reload();
      const minimum = viewport.width <= 620 ? 44 : 38;
      for (const route of ["audience/greetings", "audience/awards", "audience/commands", "audience/progression", "audience", "settings/application", "settings/diagnostics", "studio", "live", "about"]) {
        await page.goto(runtime.url + "/#/" + route);
        await expect(page.locator("#workspace-" + route.split("/")[0])).toBeVisible();
        if (route === "studio") {
          const close = page.locator('[data-studio-add-to-obs-action="done"]');
          if (await close.isVisible()) await close.click();
          await expect(page.locator("#overlay-preset-add")).toBeVisible();
        }
        const controls = page.locator(".btn-physical, .icon-btn");
        await expect.poll(async () => controls.count()).toBeGreaterThan(1);
        const failures = await controls.evaluateAll((elements, minimum) => elements.filter((el) => el.checkVisibility()).flatMap((el) => {
          const box = el.getBoundingClientRect();
          const css = getComputedStyle(el);
          return box.height < minimum - 0.5 || css.fontSize !== "12px" || (el.classList.contains("icon-btn") && Math.abs(box.width - box.height) > 0.5)
            ? [{ id: el.id, height: box.height, width: box.width, font: css.fontSize }] : [];
        }), minimum);
        expect(failures, route).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), route).toBeLessThanOrEqual(1);
        if (route === "audience/greetings" || route === "audience/awards") {
          const sections = page.locator(".form-section");
          await expect(sections).toHaveCount(4);
          for (const section of await sections.all()) {
            await expect(section).toHaveCSS("border-top-width", "1px");
            await expect(section).toHaveCSS("border-top-style", "solid");
            await expect(section.locator(":scope > legend")).toHaveCSS("font-size", "12px");
          }
          const save = page.locator(route.endsWith("greetings") ? "#greetings-save" : "#awards-save-button");
          await expect(save).toHaveCSS("color", "rgb(51, 204, 102)");
          const last = page.locator(route.endsWith("greetings") ? "#greeting-duration" : "#award-duration-input");
          await last.scrollIntoViewIfNeeded();
          await expect(last).toBeInViewport();
        }
      }
    });
  }
}

test("command sections follow the selected action and retain field state", async ({ page, runtime }) => {
  await page.goto(runtime.url + "/#/audience/commands");
  await page.locator("#commands-create-button").click();
  const action = page.locator("#command-action-input");
  await action.selectOption("alert");
  await expect(page.locator(".form-section:visible")).toHaveCount(6);
  await page.locator("#command-splash-input").fill("Hello {viewer}");
  await action.selectOption("buff");
  await expect(page.locator(".form-section:visible")).toHaveCount(3);
  await expect(page.locator("#command-points-input")).toBeVisible();
  await action.selectOption("alert");
  await expect(page.locator("#command-splash-input")).toHaveValue("Hello {viewer}");
  await page.locator("#audience-greetings-tab").click();
  await expect(page.locator("#discard-changes-dialog")).toBeVisible();
  await page.locator("#discard-changes-confirm").click();
  const chip = page.locator(".catalog-template-chip").first();
  await chip.hover();
  await expect(chip).toHaveCSS("border-top-color", "rgb(212, 160, 23)");
  await chip.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(chip).toHaveCSS("outline-style", "solid");
});

test("greeting field errors retain their border and focus after grouping", async ({ page, runtime }) => {
  await page.goto(runtime.url + "/#/audience/greetings");
  await page.route("**/api/greetings/update", route => route.fulfill({
    status: 422,
    json: { error: "Check greeting", fields: { splash_template: "Invalid template", duration_ms: "Invalid duration" } },
  }));
  await page.locator("#greetings-save").click();
  for (const id of ["greeting-template", "greeting-duration"]) {
    await expect(page.locator("#" + id)).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#" + id)).toHaveCSS("border-top-color", "rgb(255, 98, 104)");
  }
  await expect(page.locator("#greeting-template")).toBeFocused();
});

for (const locale of ["ru-RU", "en-GB"]) {
  for (const width of [1440, 1100, 390]) {
    test(`action tooltips keep whole words ${locale} at ${width}px`, async ({ page, runtime }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.route("**/api/config", async route => {
        const response = await route.fetch();
        const config = await response.json();
        config.admin.time_locale = locale;
        await route.fulfill({ response, json: config });
      });
      await page.reload();
      for (const id of ["live-recap-button", "new-stream-button", "audience-new-stream-button"]) {
        if (id.startsWith("audience-")) await page.goto(runtime.url + "/#/audience");
        await expect(page.locator("html")).toHaveAttribute("lang", locale === "ru-RU" ? "ru" : "en");
        const button = page.locator("#" + id);
        await button.hover();
        const tooltip = button.getByRole("tooltip");
        await expect(tooltip).toBeVisible();
        const measurement = await tooltip.evaluate(el => {
          const box = el.getBoundingClientRect();
          const node = el.firstChild!;
          const splitWords = [...(node.textContent || "").matchAll(/[\p{L}\p{N}]+/gu)].filter(match => {
            const range = document.createRange();
            range.setStart(node, match.index!);
            range.setEnd(node, match.index! + match[0].length);
            return range.getClientRects().length > 1;
          }).map(match => match[0]);
          return { width: box.width, left: box.left, right: box.right, splitWords };
        });
        expect(measurement.splitWords, id).toEqual([]);
        expect(measurement.width).toBeGreaterThan(150);
        expect(measurement.left).toBeGreaterThanOrEqual(0);
        expect(measurement.right).toBeLessThanOrEqual(width);
        await page.mouse.move(0, 0);
        await button.focus();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
        await expect(tooltip).toBeVisible();
      }
    });
  }
}
