import { test, expect } from "./fixtures";

test("React Settings saves only its section and restores persisted state", { tag: ["@core"] }, async ({
  page,
  runtime,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(runtime.url + "/#/settings/data");
  await expect(page.locator("#streamer-display-name")).toBeVisible();
  await page.locator("#streamer-display-name").fill("React fixture");
  await expect(page.locator("[data-section-save]")).toBeEnabled();
  await page.locator("[data-section-save]").click();
  await expect(page.locator("[data-section-save]")).toBeDisabled();
  await page.reload();
  await expect(page.locator("#streamer-display-name")).toHaveValue(
    "React fixture",
  );
  const config = await (
    await page.request.get(runtime.url + "/api/config")
  ).json();
  expect(config.streamer_display_name).toBe("React fixture");
  expect(config.twitch.enabled).toBe(false);
  expect(errors).toEqual([]);
});

test("React Settings keeps dirty edits when navigation is cancelled", async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + "/#/settings/data");
  await page.locator("#streamer-display-name").fill("Unpublished edit");
  await page.locator("#settings-application-tab").click();
  await expect(page.locator("#discard-changes-dialog")).toBeVisible();
  await page.locator("#discard-changes-cancel").click();
  await expect(page.locator("#streamer-display-name")).toHaveValue(
    "Unpublished edit",
  );
  await page.locator("#settings-application-tab").click();
  await page.locator("#discard-changes-confirm").click();
  await expect(page.locator("#settings-application-panel")).toBeVisible();
});

test("React Live tabs, contract lifecycle and recap capture use the real API", async ({
  page,
  runtime,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(runtime.url + "/#/live");
  await expect(page.locator("#workspace-live")).toBeVisible();
  await page.locator("#live-leaderboard-tab").click();
  await page.locator("#live-leaderboard-period").selectOption("all");
  await expect(page.locator("#live-leaderboard-table-body")).toContainText(
    "Night Owl",
  );
  await page.locator("#live-statistics-tab").click();
  await expect(page.locator("#live-statistics-list")).toContainText("3");
  await page.locator("#live-contracts-tab").click();
  await expect(page.locator("#live-contract-reward option")).not.toHaveCount(1);
  await page.locator("#live-contract-title").fill("React contract");
  await page
    .locator("#live-contract-objective")
    .fill("Verify the migrated controls");
  const reward = await page
    .locator("#live-contract-reward option")
    .nth(1)
    .getAttribute("value");
  await page.locator("#live-contract-reward").selectOption(reward!);
  await page.locator("#live-contract-open").click();
  await expect(page.locator("#live-contract-active-title")).toHaveText(
    "React contract",
  );
  await page.locator("#live-contract-close").click();
  await page.locator("#live-contract-close-confirm").click();
  await expect(page.locator("#live-contracts-draft")).toBeVisible();
  await page.locator("#live-recap-button").click();
  await expect(page.locator("#live-recap-show")).toBeEnabled();
  await page.locator("#live-recap-show").click();
  await page.locator("#live-recap-confirm").click();
  await expect(page.locator("#live-recap-download")).toBeEnabled();
  await page.locator("#live-recap-hide").click();
  await expect(page.locator("#live-recap-hide")).toHaveCount(0);
  await page.locator("#live-recap-history-tab").click();
  await expect(page.locator(".live-recap-history-row")).toHaveCount(1);
  await page.locator(".live-recap-history-row").click();
  await expect(page.locator("#live-recap-back")).toBeVisible();
  await page.locator("#live-recap-close").click();
  await expect(page.locator("#live-recap-dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("React catalog CRUD, aliases, action-specific payload and draft navigation", { tag: ["@core"] }, async ({
  page,
  runtime,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(runtime.url + "/#/audience/commands");
  await page.locator("#commands-create-button").click();
  await page.locator("#command-trigger-input").fill("reactcheck");
  await page.locator("#command-aliases-input").fill("reactalias");
  await page.locator("#command-action-input").selectOption("show_leaderboard");
  await page.locator("#commands-save-button").click();
  const created = page.locator('#commands-list [role="option"]', {
    hasText: "!reactcheck",
  });
  await expect(created).toBeVisible();
  await expect(created).toContainText("!reactalias");
  const response = await page.request.get(runtime.url + "/api/commands");
  const commands = (await response.json()).commands;
  expect(
    commands.find((item: { trigger: string }) => item.trigger === "reactcheck")
      .action,
  ).toBe("show_leaderboard");
  await page.locator("#command-trigger-input").fill("draft");
  await page.locator("#audience-awards-tab").click();
  await expect(page.locator("#discard-changes-dialog")).toBeVisible();
  await page.locator("#discard-changes-cancel").click();
  await expect(page.locator("#command-trigger-input")).toHaveValue("draft");
  await page.locator("#command-trigger-input").fill("reactcheck");
  await page.locator("#commands-delete-button").click();
  await page.locator("#catalog-delete-confirm").click();
  await expect(created).toHaveCount(0);
  await page.locator("#audience-awards-tab").click();
  await page.locator("#awards-create-button").click();
  await page.locator("#award-name-input").fill("React Award");
  await page.locator("#award-splash-input").fill("Thank you {viewer}");
  await page.locator("#award-points-input").fill("42");
  await page.locator("#awards-save-button").click();
  await expect(
    page.locator('#awards-list [role="option"]', { hasText: "React Award" }),
  ).toContainText("42");
  await page.reload();
  await page
    .locator('#awards-list [role="option"]', { hasText: "React Award" })
    .click();
  await expect(page.locator("#award-points-input")).toHaveValue("42");
  await page.locator("#awards-delete-button").click();
  await page.locator("#catalog-delete-confirm").click();
  await expect(
    page.locator('#awards-list [role="option"]', { hasText: "React Award" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("React greetings and progression persist edits and protect the baseline level", async ({
  page,
  runtime,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(runtime.url + "/#/audience/greetings");
  await expect(page.locator("#greeting-template")).toBeVisible();
  await page.locator("#greeting-template").fill("Hello {viewer} from React");
  await page.locator("#greetings-save").click();
  await expect(page.locator("#greetings-status")).toContainText(/saved/i);
  await page.reload();
  await expect(page.locator("#greeting-template")).toHaveValue(
    "Hello {viewer} from React",
  );
  await page.locator("#greetings-test").click();
  await expect(page.locator("#greetings-test")).toBeEnabled();
  await page.locator("#audience-progression-tab").click();
  await expect(page.locator("#progression-level-xp")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(page.locator("#progression-level-delete")).toBeDisabled();
  await page.locator("#progression-level-new").click();
  await page.locator("#progression-level-title").fill("React Level");
  await page.locator("#progression-level-xp").fill("1234567");
  await page.locator('#progression-level-form button[type="submit"]').click();
  await expect(page.locator("#progression-level-list")).toContainText(
    "React Level",
  );
  await page.locator("#progression-level-delete").click();
  await page.locator("#discard-changes-confirm").click();
  await expect(page.locator("#progression-level-list")).not.toContainText(
    "React Level",
  );
  await page.locator("#progression-achievement-new").click();
  await page.locator("#progression-achievement-name").fill("React Achievement");
  await page.locator("#progression-achievement-target").fill("3");
  await page
    .locator('#progression-achievement-form button[type="submit"]')
    .click();
  await expect(page.locator("#progression-achievement-list")).toContainText(
    "React Achievement",
  );
  await page.locator("#progression-achievement-target").fill("4");
  await page
    .locator('#progression-achievement-form button[type="submit"]')
    .click();
  await expect(page.locator("#discard-changes-dialog")).toBeVisible();
  await page.locator("#discard-changes-confirm").click();
  await expect(page.locator("#progression-status")).toContainText(/saved/i);
  await page.locator("#progression-achievement-delete").click();
  await page.locator("#discard-changes-confirm").click();
  await expect(page.locator("#progression-achievement-list")).not.toContainText(
    "React Achievement",
  );
  expect(errors).toEqual([]);
});

test("React viewer editing, responsive draft preservation, portrait and merge persist", { tag: ["@browser"] }, async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + "/#/audience");
  await expect(page.locator("#audience-viewers-table-body tr")).toHaveCount(3);
  await page
    .locator(".audience-viewers-table__name-button", { hasText: "Night Owl" })
    .click();
  await expect(page.locator("#viewer-display-name")).toHaveValue("Night Owl");
  await page.locator("#viewer-display-name").fill("Renamed Owl");
  await page.setViewportSize({ width: 800, height: 600 });
  await expect(page.locator("#audience-detail-sheet")).toBeVisible();
  await expect(page.locator("#viewer-display-name")).toHaveValue("Renamed Owl");
  await page.locator("#audience-sheet-close").click();
  await page.locator("#discard-changes-cancel").click();
  await page.locator(".audience-detail__name-field button").click();
  await expect(page.locator(".audience-detail__title")).toHaveText(
    "Renamed Owl",
  );
  await page.locator("#viewer-leaderboard-hidden").check();
  await expect(page.locator("#viewer-leaderboard-hidden")).toBeChecked();
  const portrait = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 8;
    canvas.getContext("2d")!.fillRect(0, 0, 8, 8);
    return canvas.toDataURL().split(",")[1];
  });
  const portraitInput = page.locator("#viewer-portrait-file");
  // setInputFiles bypasses the normal enabled actionability check. Wait for
  // the preceding visibility save to finish before starting another mutation.
  await expect(portraitInput).toBeEnabled();
  const portraitUpload = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/viewers/avatar/upload") &&
      response.request().method() === "POST",
  );
  await portraitInput.setInputFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: Buffer.from(portrait, "base64"),
  });
  expect((await portraitUpload).ok()).toBe(true);
  await expect(page.locator(".audience-detail__portrait img")).toBeVisible();
  await page.locator("#viewer-merge-target").selectOption("e2e-viewer-1");
  await page.locator(".audience-detail__merge button").click();
  await page.locator("#viewer-merge-prompt-confirm").click();
  await expect(page.locator("#viewer-display-name")).toHaveValue("PixelFox");
  await page.locator("#audience-sheet-close").click();
  await expect(page.locator("#audience-viewers-table-body tr")).toHaveCount(2);
  await page.reload();
  await expect(page.locator("#audience-viewers-table-body tr")).toHaveCount(2);
});

test("React Studio publishes full drafts without activating edited preset and preserves surface overrides", { tag: ["@core"] }, async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + "/#/studio");
  await page.locator('[data-studio-add-to-obs-action="done"]').click();
  const initial = await (
    await page.request.get(runtime.url + "/api/config")
  ).json();
  const originalID = initial.overlay.active_preset_id;
  await expect(page.locator("#studio-publish")).toBeDisabled();
  await page.locator("#overlay-preset-duplicate").click();
  await page.locator("#overlay-preset-prompt-name").fill("React studio preset");
  await page.locator("#overlay-preset-prompt-confirm").click();
  await page.locator("#overlay-font-size").fill("24");
  await page.locator("#studio-mode-all").click();
  await page.locator("#studio-inspector-advanced > summary").click();
  await page
    .locator("#overlay-panel-opacity")
    .locator("xpath=ancestor::details[1]/summary")
    .click();
  await page.locator("#overlay-panel-opacity").fill("0.4");
  await page.locator("#studio-surface-recap").click();
  await page.locator("#overlay-panel-opacity").fill("0.8");
  await page.locator("#studio-surface-leaderboard").click();
  await page.locator("#overlay-leaderboard-title-mode").selectOption("custom");
  await page.locator("#overlay-leaderboard-title").fill("React leaders");
  await page.locator("#studio-publish").click();
  await expect(page.locator("#studio-publish")).toBeDisabled();
  const saved = await (
    await page.request.get(runtime.url + "/api/config")
  ).json();
  expect(saved.overlay.active_preset_id).toBe(originalID);
  const preset = saved.overlay.presets.find(
    (p: { name: string }) => p.name === "React studio preset",
  );
  expect(preset.font_size_px).toBe(24);
  expect(preset.surfaces.chat.panel_opacity).toBe(0.4);
  expect(preset.surfaces.recap.panel_opacity).toBe(0.8);
  expect(preset.surfaces.leaderboard.title).toBe("React leaders");
  await expect(page.locator("#studio-use-on-stream")).toBeEnabled();
  await page.locator("#studio-use-on-stream").click();
  await expect(page.locator("#studio-use-on-stream")).toBeHidden();
  await page.reload();
  await expect(page.locator("#overlay-preset-select")).toHaveValue(preset.id);
  await page.locator("#studio-add-to-obs-open").click();
  await page.locator('[data-studio-add-to-obs-source="recap"]').click();
  await expect(page.locator("#studio-add-to-obs-recap-follow-url")).toHaveValue(
    runtime.url + "/overlay/recap",
  );
  await expect(page.locator("#studio-add-to-obs-recap-pinned-url")).toHaveValue(
    runtime.url + "/overlay/recap?preset=" + preset.id,
  );
});

test('contract draft survives navigation and deliberate winner settlement grants once', { tag: ["@core"] }, async ({page,runtime})=>{
  await page.locator('#live-contracts-tab').click();
  await page.locator('#live-contract-title').fill('Winner regression');
  await page.locator('#live-contract-objective').fill('Complete the task');
  const reward=await page.locator('#live-contract-reward option').nth(1).getAttribute('value');
  await page.locator('#live-contract-reward').selectOption(reward!);
  await page.locator('#side-primary-navigation [data-workspace-nav="audience"]').click();
  await page.locator('#side-primary-navigation [data-workspace-nav="live"]').click();
  await expect(page.locator('#live-contract-title')).toHaveValue('Winner regression');
  await page.locator('#live-contract-open').click();
  await page.locator('#live-contract-repeat').click();
  await expect(page.locator('#live-contract-repeat')).toBeEnabled();
  await page.locator('#live-contract-award').click();
  await expect(page.locator('#live-contract-winner-next')).toBeDisabled();
  await page.locator('#live-contract-viewer-results button',{hasText:'Night Owl'}).click();
  await page.locator('#live-contract-winner-next').click();
  await expect(page.locator('#live-contract-award-confirmation')).toContainText('Night Owl');
  await page.locator('#live-contract-award-confirm').click();
  await expect(page.locator('#live-contracts-draft')).toBeVisible();
  const history=await (await page.request.get(runtime.url+'/api/reward-history?limit=50')).json();
  expect(history.entries).toHaveLength(1);
  expect(history.entries[0]).toMatchObject({viewer_id:'e2e-viewer-0'});
});
