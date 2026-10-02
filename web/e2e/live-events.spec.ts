import { test, expect } from "./fixtures";
import type { WebSocketRoute } from "@playwright/test";

test("injected chat events survive hidden tabs, deduplicate, preserve safe text and delete by platform", async ({
  page,
  runtime,
}) => {
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket("**/ws", (route) => {
    socket = route;
  });
  await page.reload();
  await expect.poll(() => !!socket).toBeTruthy();
  const send = (data: object) => socket!.send(JSON.stringify(data));
  const message = {
    type: "message",
    platform: "twitch",
    id: "same-id",
    user_id: "e2e-viewer-0",
    user: "Night Owl",
    display_name: "<b>Unsafe name</b>",
    message: "<script>window.injected=true</script>",
    timestamp: "2026-01-01T12:00:00Z",
  };
  send(message);
  send(message);
  await expect(page.locator("#recent-messages > li")).toHaveCount(1);
  await expect(page.locator("#recent-messages")).toContainText(
    "<script>window.injected=true</script>",
  );
  expect(await page.evaluate(() => "injected" in window)).toBeFalsy();
  await page
    .locator('#side-primary-navigation [data-workspace-nav="audience"]')
    .click();
  send({
    ...message,
    platform: "youtube",
    message: "Hidden workspace delivery",
  });
  await page
    .locator('#side-primary-navigation [data-workspace-nav="live"]')
    .click();
  await expect(page.locator("#recent-messages > li")).toHaveCount(2);
  send({ type: "message_deleted", platform: "twitch", id: "same-id" });
  await expect(page.locator("#recent-messages > li")).toHaveCount(1);
  await expect(page.locator("#recent-messages")).toContainText(
    "Hidden workspace delivery",
  );
  for (let i = 0; i < 25; i++)
    send({ ...message, id: "bounded-" + i, message: "Bounded " + i });
  await expect(page.locator("#recent-messages > li")).toHaveCount(20);
  await expect(page.locator("#recent-messages > li").last()).toContainText(
    "Bounded 24",
  );
  // Source messages are injected, but the award mutation uses the real Go service.
  const row = page.locator("#recent-messages > li").last();
  await row.locator(".message-list__like").click();
  await expect(row.locator(".message-list__like")).toBeDisabled();
  const history = await (
    await page.request.get(runtime.url + "/api/reward-history?limit=50")
  ).json();
  expect(history.entries).toHaveLength(1);
  expect(history.entries[0]).toMatchObject({
    viewer_id: "e2e-viewer-0",
    reward_id: "like",
    points: 5,
  });
  await row.locator(".message-list__reward").click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(row.locator(".message-list__reward")).toBeFocused();
  // A missing server-side recent message returns 404; UI removes its stale row.
  await row.locator(".message-list__delete").click();
  await expect(page.locator('[data-message-id="bounded-24"]')).toHaveCount(0);
});

test("viewer fetch failure retries and selection can change after recovery", async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + "/#/audience");
  await page.route("**/api/viewers/get?id=e2e-viewer-0", (route) =>
    route.fulfill({ status: 503, json: { error: "Temporary detail failure" } }),
  );
  await page.getByRole("button", { name: "Night Owl", exact: true }).click();
  await expect(page.locator("#audience-layout")).toContainText(
    "Temporary detail failure",
  );
  await page.unroute("**/api/viewers/get?id=e2e-viewer-0");
  await page.locator("#audience-inspector-error button").click();
  await expect(page.locator("#viewer-display-name")).toHaveValue("Night Owl");
  await page.getByRole("button", { name: "PixelFox", exact: true }).click();
  await expect(page.locator("#viewer-display-name")).toHaveValue("PixelFox");
});

for (const width of [1920, 1024, 390]) {
  test(`Russian locale and keyboard navigation at ${width}`, async ({
    page,
    runtime,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(runtime.url + "/#/settings/application");
    await page.locator("#time-locale").selectOption("ru-RU");
    await page.locator("[data-section-save]").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await page.reload();
    await expect(page.locator("#time-locale")).toHaveValue("ru-RU");
    await page.locator("#settings-application-tab").focus();
    await page.keyboard.press("Home");
    await expect(page.locator("#settings-platforms-panel")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  });
}
