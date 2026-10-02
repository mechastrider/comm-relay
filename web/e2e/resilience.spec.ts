import { test, expect } from "./fixtures";

// Fault injection is deliberately limited to the endpoint named by each test.
test("failed save preserves draft and retry; fresh config preserves concurrent settings", async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + "/#/settings/data");
  await page.locator("#streamer-display-name").fill("Retry me");
  await page.route("**/api/config/update", async (route) => {
    if (route.request().method() === "POST")
      await route.fulfill({
        status: 503,
        json: { error: "Injected save outage" },
      });
    else await route.continue();
  });
  await page.locator("[data-section-save]").click();
  await expect(page.locator("#workspace-settings")).toContainText(
    "Injected save outage",
  );
  await expect(page.locator("#streamer-display-name")).toHaveValue("Retry me");
  await expect(page.locator("[data-section-save]")).toBeEnabled();
  await page.unroute("**/api/config/update");
  const config = await (
    await page.request.get(runtime.url + "/api/config")
  ).json();
  config.overlay.presets.find(
    (preset: { id: string }) => preset.id === config.overlay.active_preset_id,
  ).font_size_px = 27;
  expect(
    (
      await page.request.post(runtime.url + "/api/config/update", {
        data: config,
      })
    ).ok(),
  ).toBeTruthy();
  await page.locator("[data-section-save]").click();
  await expect(page.locator(".settings-section > .notice")).toHaveText("Section saved.");
  const saved = await (
    await page.request.get(runtime.url + "/api/config")
  ).json();
  expect(saved.streamer_display_name).toBe("Retry me");
  expect(saved.overlay.font_size_px).toBe(27);
});

test("real WebSocket reconnect recovers after server restart without duplicate subscriptions", async ({
  page,
  runtime,
}) => {
  const sockets: string[] = [];
  page.on("websocket", (socket) => sockets.push(socket.url()));
  await page.reload();
  await expect
    .poll(() => sockets.filter((url) => url.endsWith("/ws")).length)
    .toBe(1);
  for (let i = 0; i < 4; i++) {
    await page
      .locator('#side-primary-navigation [data-workspace-nav="audience"]')
      .click();
    await page
      .locator('#side-primary-navigation [data-workspace-nav="live"]')
      .click();
  }
  expect(sockets.filter((url) => url.endsWith("/ws"))).toHaveLength(1);
  await runtime.restart();
  await expect
    .poll(() => sockets.filter((url) => url.endsWith("/ws")).length)
    .toBe(2);
  await page.locator("#live-leaderboard-tab").click();
  await page.locator("#live-leaderboard-period").selectOption("all");
  await expect(page.locator("#live-leaderboard-table-body")).toContainText(
    "Night Owl",
  );
});

test("dedicated overlay test channel remains isolated without restoring the Studio panel", async ({page,runtime}) => {
  await page.goto(runtime.url + '/#/studio');
  await page.locator('[data-studio-add-to-obs-action="done"]').click();
  await page.locator('#studio-mode-all').click();
  await expect(page.locator('#overlay-debug-toggle')).toHaveCount(0);
  const socketReady = page.waitForEvent('websocket', { predicate: socket => socket.url().endsWith('/ws/overlay-debug') });
  await page.goto(runtime.url + '/overlay/test/chat');
  const socket = await socketReady;
  const delivered = socket.waitForEvent('framereceived');
  const result = await page.request.post(runtime.url + '/api/overlay-debug/scenario/fire', {data:{scenario:'message',display_name:'Regression viewer',message:'Real isolated delivery'}});
  expect(result.ok()).toBeTruthy();
  await delivered;
  await expect(page.locator('body')).toContainText('Real isolated delivery');
  await page.request.post(runtime.url + '/api/overlay-debug/session/reset', {data:{}});
  await expect(page.locator('body')).not.toContainText('Real isolated delivery');
  const recent = await (await page.request.get(runtime.url + '/api/messages/recent?limit=20')).json();
  expect(recent.messages).toHaveLength(0);
});

test("recap browser PNG download and native bridge cancellation use the shared exporter", async ({
  page,
  runtime,
}) => {
  await page.locator("#live-recap-button").click();
  await page.locator("#live-recap-show").click();
  await page.locator("#live-recap-confirm").click();
  await expect(page.locator("#live-recap-download")).toBeEnabled();
  const downloading = page.waitForEvent("download");
  await page.locator("#live-recap-download").click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("comm-relay-recap-session.png");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const png = Buffer.concat(chunks);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(1920);
  expect(png.readUInt32BE(20)).toBe(1080);
  await page.evaluate(() => {
    Object.assign(window, {
      nativeSaves: [],
      go: {
        main: {
          DesktopAPI: {
            SavePNGFile: async (...args: string[]) => {
              (
                window as unknown as { nativeSaves: string[][] }
              ).nativeSaves.push(args);
              return "";
            },
          },
        },
      },
    });
  });
  await page.locator("#live-recap-download").click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { nativeSaves: string[][] }).nativeSaves.length,
      ),
    )
    .toBe(1);
  await expect(page.locator("#live-recap-dialog")).toContainText(/cancelled/i);
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { nativeSaves: string[][] }
      ).nativeSaves[0][2].startsWith("iVBOR"),
    ),
  ).toBeTruthy();
  expect((await page.request.get(runtime.url + "/health")).ok()).toBeTruthy();
});

test("OBS surfaces and dock still load independently with transparent overlay backgrounds", async ({
  page,
  runtime,
}) => {
  for (const route of [
    "/overlay",
    "/overlay/leaderboard",
    "/overlay/alert",
    "/overlay/recap",
    "/dock/messages",
  ]) {
    // Wait for the real socket handshake/frame before leaving this surface.
    // Immediate navigation can abort an in-flight Firefox handshake.
    const connected = page.waitForEvent("websocket").then((socket) =>
      socket.waitForEvent("framereceived"),
    );
    const response = await page.goto(runtime.url + route);
    expect(response?.status()).toBe(200);
    await connected;
    if (route.startsWith("/overlay")) {
      expect(
        await page.evaluate(
          () => getComputedStyle(document.body).backgroundColor,
        ),
      ).toBe("rgba(0, 0, 0, 0)");
    }
  }
});
