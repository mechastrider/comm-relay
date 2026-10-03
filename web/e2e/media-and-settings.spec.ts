import { test, expect } from "./fixtures";

test("catalog image upload, publication, clear and abandoned draft cleanup use real storage", { tag: ["@browser"] }, async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + "/#/audience/awards");
  await page.locator("#awards-create-button").click();
  await page.locator("#award-name-input").fill("Media fixture");
  await page.locator("#award-splash-input").fill("Hi {viewer}");
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 16;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f00";
    ctx.fillRect(0, 0, 16, 16);
    return canvas.toDataURL().split(",")[1];
  });
  const uploading = page.waitForResponse((response) =>
    response.url().endsWith("/api/overlay/assets/upload"),
  );
  await page
    .locator("#award-image-input")
    .setInputFiles({
      name: "fixture.png",
      mimeType: "image/png",
      buffer: Buffer.from(base64, "base64"),
    });
  const asset = (await (await uploading).json()).filename;
  await expect(page.locator("#award-image-preview img")).toBeVisible();
  await page.locator("#awards-save-button").click();
  await expect(page.locator("#awards-list")).toContainText("Media fixture");
  await page.reload();
  await page
    .locator('#awards-list [role="option"]', { hasText: "Media fixture" })
    .click();
  await expect(page.locator("#award-image-preview img")).toHaveAttribute(
    "src",
    new RegExp(asset),
  );
  expect(
    (await page.request.get(runtime.url + "/overlay/assets/" + asset)).ok(),
  ).toBeTruthy();
  await page.locator("#award-image-clear").click();
  await page.locator("#awards-save-button").click();
  await expect
    .poll(async () =>
      (
        await page.request.get(runtime.url + "/overlay/assets/" + asset)
      ).status(),
    )
    .toBe(404);
  const secondUpload = page.waitForResponse((response) =>
    response.url().endsWith("/api/overlay/assets/upload"),
  );
  await page
    .locator("#award-image-input")
    .setInputFiles({
      name: "fixture.png",
      mimeType: "image/png",
      buffer: Buffer.from(base64, "base64"),
    });
  const abandoned = (await (await secondUpload).json()).filename;
  await page.locator("#audience-history-tab").click();
  await page.locator("#discard-changes-confirm").click();
  await expect
    .poll(async () =>
      (
        await page.request.get(runtime.url + "/overlay/assets/" + abandoned)
      ).status(),
    )
    .toBe(404);
});

test("platform validation focuses invalid control and mocked OAuth finishes its polling", { tag: ["@browser"] }, async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + "/#/settings/platforms");
  await page.locator("#twitch-enabled").check();
  await page.locator("#twitch-channel").fill("");
  await page.locator("[data-section-save]").click();
  await expect(page.locator("#twitch-channel")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#twitch-channel")).toBeFocused();
  await page.locator("#twitch-enabled").uncheck();
  await page.locator("#twitch-channel").fill("");
  await page.locator("#connections-youtube-tab").click();
  await page.locator("#youtube-connection-mode").selectOption("api");
  await page.route("**/api/youtube/oauth/start", (route) =>
    route.fulfill({ json: { opened: true } }),
  );
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { youtube: { oauth_connected: true } } }),
  );
  await page.locator("#youtube-connect").click();
  await expect(page.locator("#workspace-settings")).toContainText(/connected/i);
});

test("disabled preference storage does not prevent audience and Studio mounting", { tag: ["@browser"] }, async ({
  page,
  runtime,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get: () => {
        throw new DOMException("Storage disabled", "SecurityError");
      },
    });
  });
  // Fixture's locale init is already installed; override methods only after navigation initialization.
  await page.goto(runtime.url + "/#/audience");
  await expect(page.locator("#audience-viewers-table-body tr")).toHaveCount(3);
  await page.locator("#audience-sort-viewer").click();
  await page
    .locator('#side-primary-navigation [data-workspace-nav="studio"]')
    .click();
  await expect(page.locator("#studio-add-to-obs-dialog")).toBeVisible();
});

test("real session restart appears in Archive with its captured recap", async ({
  page,
  runtime,
}) => {
  await page.locator("#live-recap-button").click();
  await page.locator("#live-recap-show").click();
  await page.locator("#live-recap-confirm").click();
  await expect(page.locator("#live-recap-download")).toBeEnabled();
  await page.locator("#live-recap-close").click();
  const before = await (
    await page.request.get(runtime.url + "/api/stream-recaps/current")
  ).json();
  await page.locator("#new-stream-button").click();
  await page.locator("#new-stream-prompt-cancel").click();
  expect(
    (
      await (
        await page.request.get(runtime.url + "/api/stream-recaps/current")
      ).json()
    ).session_id,
  ).toBe(before.session_id);
  await page.locator("#new-stream-button").click();
  await page.locator("#new-stream-prompt-confirm").click();
  await expect(page.locator("#new-stream-prompt")).toBeHidden();
  await page.goto(runtime.url + "/#/audience/archive");
  await expect(page.locator(".live-recap-history-row")).toHaveCount(2);
  await page.locator('[data-session-id="' + before.session_id + '"]').click();
  await expect(page.locator("#audience-archive-download")).toBeEnabled();
  await page.locator("#audience-archive-back").click();
  await expect(
    page.locator('[data-session-id="' + before.session_id + '"]'),
  ).toBeFocused();
});
