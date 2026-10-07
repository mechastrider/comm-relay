import { test, expect } from "./fixtures";
import type { WebSocketRoute } from "@playwright/test";

test("Lore Expert grants 50 XP through chat and shows an open book in OBS", async ({ page, runtime, context }, info) => {
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket("**/ws", (route) => {
    route.connectToServer();
    socket = route;
  });
  await page.reload();
  await expect.poll(() => Boolean(socket)).toBeTruthy();

  const overlay = await context.newPage();
  await overlay.goto(runtime.url + "/overlay/alert");
  await expect.poll(async () => {
    const response = await page.request.get(runtime.url + "/api/diagnostics");
    return (await response.json()).websocket_clients;
  }).toBeGreaterThanOrEqual(2);

  socket!.send(JSON.stringify({
    type: "message", platform: "twitch", id: "lore-source", user_id: "e2e-viewer-0",
    user: "Night Owl", display_name: "Night Owl", message: "This scene echoes the founding myth.",
    timestamp: new Date().toISOString(),
  }));
  const row = page.locator('[data-message-id="lore-source"]');
  await row.locator(".message-list__reward").click();
  const award = page.locator('[role="menuitem"][data-award-id="lore_expert"]');
  await expect(award).toContainText("Lore Expert");
  await expect(award).toContainText("50");
  await award.click();

  const book = overlay.locator('[data-emblem-symbol="open-book"]');
  await expect(book).toBeVisible();
  await expect(overlay.locator(".alert-award-name")).toHaveText("Lore Expert");
  await expect(overlay.locator(".alert-award-viewer")).toContainText("Night Owl");
  await expect(overlay.locator(".alert-points")).toContainText("50");
  await expect(book.locator("text, .alert-emblem__monogram")).toHaveCount(0);
  await info.attach("lore-expert-alert.png", { body: await overlay.screenshot(), contentType: "image/png" });

  const history = await (await page.request.get(runtime.url + "/api/reward-history?limit=50")).json();
  expect(history.entries).toHaveLength(1);
  expect(history.entries[0]).toMatchObject({ viewer_id: "e2e-viewer-0", reward_id: "lore_expert", points: 50 });
  const viewers = await (await page.request.get(runtime.url + "/api/viewers")).json();
  expect(viewers.viewers.find((viewer: { id: string }) => viewer.id === "e2e-viewer-0").xp).toBe(70);
  const diagnostics = await (await page.request.get(runtime.url + "/api/diagnostics")).json();
  expect(diagnostics.pipeline.awards_granted).toBe(1);

  await page.goto(runtime.url + "/#/audience");
  await page.locator("#audience-awards-tab").click();
  const catalogAward = page.locator('#awards-list [data-award-id="lore_expert"]');
  await catalogAward.click();
  await expect(page.locator("#award-name-input")).toHaveValue("Lore Expert");
  await expect(page.locator("#award-points-input")).toHaveValue("50");
  await expect(page.locator('.catalog-media-preview [data-emblem-symbol="open-book"]')).toBeVisible();
  await overlay.close();
});
