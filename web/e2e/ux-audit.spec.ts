import { test, expect } from "./fixtures";

test("empty chat offers setup only for a loaded all-disabled configuration", async ({
  page,
  runtime,
}) => {
  await expect(
    page.getByRole("link", { name: "Connect a platform" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Connect a platform" }).click();
  await expect(page.locator("#settings-platforms-panel")).toBeVisible();
  // Enabled but disconnected is a waiting state, not first-time setup.
  await page.route("**/api/config", async (route) => {
    const response = await route.fetch();
    const config = await response.json();
    config.twitch.enabled = true;
    await route.fulfill({ json: config });
  });
  await page.goto(runtime.url + "/#/live");
  await page.reload();
  await expect(page.locator("#recent-messages-empty")).toContainText(
    "No messages",
  );
  await expect(
    page.getByRole("link", { name: "Connect a platform" }),
  ).toHaveCount(0);
});

test("offline save retains edits, explains retry and scopes success to its section", async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + "/#/settings/data");
  await page.locator("#streamer-display-name").fill("O’Brien 朴기철");
  await page.route("**/api/config/update", (route) =>
    route.abort("internetdisconnected"),
  );
  await page.locator("[data-section-save]").click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Your edits are still in the form" }),
  ).toBeVisible();
  await expect(page.locator("#streamer-display-name")).toHaveValue(
    "O’Brien 朴기철",
  );
  await page.unroute("**/api/config/update");
  await page.locator("[data-section-save]").click();
  await expect(page.locator("[data-section-save]")).toBeDisabled();
  await expect(page.locator(".settings-section > .notice")).toContainText(
    "saved",
  );
  await page.locator("#settings-diagnostics-tab").click();
  await expect(page.locator(".settings-section > .notice")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Application status" }),
  ).toBeVisible();
});

test("collapsed Studio label stays inside compact OBS action", async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(runtime.url + "/#/studio");
  await expect(page.locator("#studio-add-to-obs-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const toggle = page.locator("#studio-surface-collapse");
  await toggle.click();
  for (const width of [320, 375, 390, 520, 768]) {
    await page.setViewportSize({ width, height: 700 });
    const label = page
      .locator(".studio-add-to-obs-open__label")
      .filter({ visible: true });
    await expect(label).toBeVisible();
    await expect
      .poll(async () =>
        label.evaluate((node) => {
          const text = node.getBoundingClientRect(),
            button = node.closest("button")!.getBoundingClientRect();
          return (
            text.width > 0 &&
            text.x >= button.x &&
            text.right <= button.right + 1 &&
            text.bottom <= button.bottom + 1
          );
        }),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("inspector, progression lists and media previews expose valid accessible semantics", async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(runtime.url + "/#/audience");
  await page.getByRole("button", { name: "PixelFox", exact: true }).click();
  await expect(page.locator("#audience-inspector")).not.toHaveAttribute(
    "aria-modal",
  );
  await page.goto(runtime.url + "/#/audience/progression");
  const levels = page.getByRole("listbox", { name: "Levels", exact: true });
  await expect(levels).toBeVisible();
  await expect(
    page.getByRole("listbox", { name: "Achievements", exact: true }),
  ).toBeVisible();
  await levels.getByRole("option").first().focus();
  await page.keyboard.press("End");
  await expect(levels.getByRole("option").last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(levels.getByRole("option").first()).toBeFocused();
  await page.goto(runtime.url + "/#/audience/awards");
  await page.locator("#awards-create-button").click();
  await expect(page.locator("#award-image-preview")).toHaveRole("group");
  await expect(
    page.locator('#awards-list [role="option"]').first(),
  ).toHaveAttribute("tabindex", "0");
  await page.goto(runtime.url + "/#/audience/greetings");
  await expect(page.locator("#greeting-image-preview")).toHaveRole("group");
});

test("achievement subject uses catalog names and preserves unavailable IDs with retry", async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + "/#/audience/progression");
  await page.locator("#progression-achievement-new").click();
  await page.locator("#progression-achievement-name").fill("Named rule");
  await page
    .locator("#progression-achievement-metric")
    .selectOption("award_count");
  const subject = page.locator("#progression-achievement-subject");
  const awards = (
    await (await page.request.get(runtime.url + "/api/awards")).json()
  ).awards;
  await subject.selectOption(awards[0].id);
  await expect(subject.locator("option:checked")).toHaveText(awards[0].name);
  await expect(page.locator("#progression-achievement-form")).toContainText(
    awards[0].name,
  );
  await page
    .locator("#progression-achievement-form button[type=submit]")
    .click();
  await expect(page.locator("#progression-achievement-id")).not.toHaveValue("");
  const id = await page.locator("#progression-achievement-id").inputValue();
  const saved = (
    await (
      await page.request.get(runtime.url + "/api/progression/achievements")
    ).json()
  ).achievements.find((a: { id: string }) => a.id === id);
  expect(saved.revision.subject_id).toBe(awards[0].id);
  expect(saved.revision.subject_label).toBe(awards[0].name);
  await page.route("**/api/awards", (route) =>
    route.fulfill({ json: { awards: [] } }),
  );
  await page.reload();
  await page.getByRole("option", { name: /Named rule/ }).click();
  await expect(subject).toHaveValue(awards[0].id);
  await expect(subject.locator("option:checked")).toContainText("Unavailable:");
  await page.unroute("**/api/awards");
  await page.route("**/api/commands", (route) =>
    route.fulfill({ status: 503, json: { error: "Fixture offline" } }),
  );
  await page.reload();
  await page.getByRole("option", { name: /Named rule/ }).click();
  await expect(
    page.getByText("Could not load awards and commands.", { exact: false }),
  ).toBeVisible();
  await page.unroute("**/api/commands");
  await page
    .locator("#progression-subject-field")
    .getByRole("button", { name: "Retry" })
    .click();
  await expect(
    page.getByText("Could not load awards and commands.", { exact: false }),
  ).toHaveCount(0);
  await page
    .locator("#progression-achievement-metric")
    .selectOption("command_count");
  await expect(subject).toHaveValue("");
  await expect(subject.locator("option").nth(1)).toHaveText(/^!/);
});

test.describe("large directory", () => {
  test.use({ viewerCount: 1003 });
  test("bounds rows while preserving global sorting, search, draft guards and focus", async ({
    page,
    runtime,
  }, info) => {
    const start = Date.now();
    await page.goto(runtime.url + "/#/audience");
    const rows = page.locator("#audience-viewers-table-body tr");
    await expect(rows).toHaveCount(50);
    await info.attach("directory-timing.json", {
      body: JSON.stringify({
        viewers: 1003,
        rows: 50,
        navigationToRowsMs: Date.now() - start,
      }),
      contentType: "application/json",
    });
    const next = page.getByRole("button", {
      name: "Next page",
      exact: true,
    });
    await next.click();
    await expect(page.locator(".audience-pagination")).toContainText(
      "51–100 of 1003",
    );
    const opener = rows.first().getByRole("button");
    await opener.click();
    await page.locator("#viewer-display-name").fill("Unsaved pagination draft");
    await next.click();
    await expect(page.locator("#discard-changes-dialog")).toBeVisible();
    await page.locator("#discard-changes-cancel").click();
    await expect(page.locator("#viewer-display-name")).toHaveValue(
      "Unsaved pagination draft",
    );
    await next.click();
    await page.locator("#discard-changes-confirm").click();
    await expect(page.locator(".audience-pagination")).toContainText(
      "101–150 of 1003",
    );
    await expect(page.locator("#audience-inspector")).toHaveCount(0);
    await page.locator("#viewers-search").fill("Viewer 0999");
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText("Viewer 0999");
    await page.locator("#viewers-search").fill("");
    await expect(rows).toHaveCount(50);
    await page.locator("#audience-sort-viewer").click();
    await expect(rows.first()).toContainText("Viewer 0999");
    await rows.first().getByRole("button").click();
    await page.locator("#audience-inspector-close").click();
    await expect(rows.first().getByRole("button")).toBeFocused();
  });
});

test("Russian settings explain runtime, proxy and offline recovery without raw keys", async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + "/#/settings/application");
  await page.locator("#time-locale").selectOption("ru-RU");
  await page.locator("[data-section-save]").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page.locator("#settings-diagnostics-tab").click();
  await expect(
    page.getByRole("heading", { name: "Состояние приложения" }),
  ).toBeVisible();
  await page.locator("#settings-platforms-tab").click();
  await expect(
    page.getByText("Для Twitch пока недоступно.", { exact: false }),
  ).toContainText("«Сеть»");
  await page.locator("#settings-data-tab").click();
  await expect(
    page.getByText("XP начисляется без баннера", { exact: false }),
  ).not.toContainText("eligible");
  await page.locator("#streamer-display-name").fill("Черновик стримера");
  await page.route("**/api/config/update", (route) => route.abort());
  await page.locator("[data-section-save]").click();
  await expect(page.locator(".settings-section > .notice")).toContainText(
    "Изменения остались в форме",
  );
  await expect(page.locator("#streamer-display-name")).toHaveValue(
    "Черновик стримера",
  );
});
