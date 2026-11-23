import type { WebSocketRoute } from "@playwright/test";
import { test, expect } from "./fixtures";

test("experimental AI settings persist disabled and protect unsaved changes", async ({
  page,
  runtime,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(runtime.url + "/#/settings/experimental");
  await expect(
    page.getByRole("checkbox", { name: "Enable experimental !m command" }),
  ).not.toBeChecked();
  await page
    .getByLabel("Stream context", { exact: true })
    .fill("A fictional game stream.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page
      .getByRole("tabpanel", { name: "Experimental features" })
      .getByText("Settings saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Stream context", { exact: true })).toHaveValue(
    "A fictional game stream.",
  );
  await page
    .getByLabel("Stream context", { exact: true })
    .fill("Unsaved context");
  await page.locator("#settings-application-tab").click();
  await expect(page.locator("#discard-changes-dialog")).toBeVisible();
  await page.locator("#discard-changes-cancel").click();
  await expect(page.getByLabel("Stream context", { exact: true })).toHaveValue(
    "Unsaved context",
  );
  await page.locator("#settings-application-tab").click();
  await page.locator("#discard-changes-confirm").click();
  await page.goto(runtime.url + "/#/settings/experimental");
  await page.getByRole("tab", { name: "Review" }).click();
  await expect(
    page.getByText("No messages yet.", { exact: false }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("AI review keeps exact content visible after stale approval and allows retry", async ({
  page,
  runtime,
}) => {
  const job = {
    id: "review-job",
    revision: 4,
    state: "review_pending",
    created_at: new Date().toISOString(),
    name: "Viewer",
    original_text: "Саша, опять руку оторвало?",
    prepared: {
      display_text: "Саша, опять руку оторвало?",
      segments: [{ text: "Саша, опять руку оторвало?", delivery: "dry" }],
      character_id: "mason",
      image_id: "repair",
    },
    presentation: { image_asset: "" },
    reason: "The target might be a real person. ".repeat(40),
    review_expires_at: new Date(Date.now() + 300000).toISOString(),
    usage: [],
  };
  await page.route("**/api/ai-messages?*", (route) =>
    route.fulfill({
      json: {
        items: [job],
        service_state: "ready",
        credentials: { llm: true, tts: true },
      },
    }),
  );
  let attempts = 0;
  await page.route("**/api/ai-messages/approve", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      job_id: "review-job",
      expected_revision: 4,
    });
    attempts++;
    if (attempts === 1)
      await route.fulfill({
        status: 409,
        json: { error: "AI message changed, expired, or queue is full" },
      });
    else {
      job.state = "synthesizing";
      await route.fulfill({ json: job });
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(runtime.url + "/#/settings/experimental");
  await page.getByRole("tab", { name: /Review/ }).click();
  await page.getByRole("button", { name: "Viewer · Needs review" }).click();
  const dialog = page.locator("#ai-review");
  await expect(dialog).toContainText("Саша, опять руку оторвало?");
  await expect(dialog).toContainText("The target might be a real person.");
  await expect(dialog.getByRole("button", { name: "Approve speech" })).toBeInViewport();
  await dialog.getByRole("button", { name: "Approve speech" }).click();
  await expect(dialog.getByRole("alert")).toContainText("queue is full");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Approve speech" }).click();
  await expect(dialog).not.toBeVisible();
  expect(attempts).toBe(2);
});

test("AI empty character errors are localized, red and focused", async ({ page, runtime }) => {
  const configResponse = await page.request.get(runtime.url + "/api/config");
  const config = await configResponse.json();
  config.admin.time_locale = "ru-RU";
  config.ai_messages.llm.model = "test-model";
  const saved = await page.request.post(runtime.url + "/api/config/update", { data: config });
  expect(saved.ok()).toBeTruthy();
  await page.goto(runtime.url + "/#/settings/experimental");
  await page.reload();
  await page.getByRole("checkbox", { name: /!m/ }).check();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  const error = page.getByText("Добавьте хотя бы одного персонажа, прежде чем включать AI-сообщения.", { exact: true });
  await expect(error).toBeVisible();
  await expect(error).toBeInViewport();
  await expect(error).toBeFocused();
  const color = await error.evaluate((el) => getComputedStyle(el).color);
  const danger = await error.evaluate((el) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--danger)";
    el.append(probe);
    const result = getComputedStyle(probe).color;
    probe.remove();
    return result;
  });
  expect(color).toBe(danger);
  await expect(page.locator("[data-ai-error-summary]")).toContainText("Проверьте выделенные поля.");
});

test("AI settings use shared panels and keyboard tabs at desktop and narrow widths", async ({ page, runtime }, info) => {
  await page.goto(runtime.url + "/#/settings/experimental");
  const tabs = page.getByRole("tablist", { name: "AI messages" });
  const settings = tabs.getByRole("tab", { name: "Settings", exact: true });
  await expect(settings).toHaveClass("dialog-tab");
  await settings.focus();
  await settings.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: /Review/ })).toBeFocused();
  await expect(page.locator("#ai-review-panel")).toBeVisible();
  await page.keyboard.press("Home");
  await expect(settings).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#ai-settings-panel")).toBeVisible();
  await page.getByRole("button", { name: "Add character", exact: true }).click();
  await page.getByRole("button", { name: "Add image", exact: true }).click();
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await settings.scrollIntoViewIfNeeded();
    const overflow = await page.locator("#settings-sections-mount").evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const panel = page.locator(".ai-panel").first();
    await expect(panel.locator(".panel__header h3")).toBeVisible();
    const checkbox = page.getByRole("checkbox", { name: /!m/ });
    await expect(checkbox).toHaveCSS("accent-color", await checkbox.evaluate((el) => {
      const probe = document.createElement("span");
      probe.style.color = "var(--success)";
      el.parentElement!.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    }));
    await page.screenshot({ path: info.outputPath(`ai-settings-${width}.png`) });
    // Reach the end of a populated form through its ordinary settings scroller.
    await page.locator(".ai-fields input").last().scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeInViewport();
  }
});

for (const [path, action] of [["/", "approve"], ["/dock/messages", "reject"]]) {
  test("operator can " + action + " the displayed speech inline on " + path, async ({ page, runtime }) => {
    const message = {
      platform: "twitch", id: "source", user_id: "viewer", username: "Viewer", display_name: "Viewer",
      timestamp: new Date().toISOString(), message: "!m 24", is_ai_message: true, ai_state: "review_pending",
    };
    let socket: WebSocketRoute | undefined;
    const live = action === "approve";
    await page.routeWebSocket("**/ws", route => { socket = route; });
    const job = {
      platform: message.platform, message_id: message.id, id: "review-id", revision: 7,
      prepared: { display_text: "24", character_id: "mason", image_id: "repair", segments: [{ text: "Двадцать четыре.", delivery: "warm" }] }, reason: "Check context",
    };
    await page.route("**/api/messages/recent?*", route => route.fulfill({ json: { messages: [{ ...message, ai_state: live ? "queued" : "review_pending" }] } }));
    await page.route("**/api/ai-messages?*", route => route.fulfill({ json: { items: [job] } }));
    let attempts = 0;
    await page.route("**/api/ai-messages/" + action, async route => {
      expect(route.request().postDataJSON()).toEqual({ job_id: job.id, expected_revision: job.revision });
      if (++attempts === 1 && live) {
        await route.fulfill({ status: 409, json: {} });
        return;
      }
      await route.fulfill({ json: { state: action === "approve" ? "queued" : "rejected" } });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(runtime.url + path);
    const row = page.getByRole("listitem").filter({ hasText: "!m 24" });
    if (live) {
      await expect(row).toContainText("Queued");
      await expect.poll(() => !!socket).toBeTruthy();
      socket!.send(JSON.stringify({ type: "ai_message_status", message_platform: message.platform, message_id: message.id, state: "review_pending" }));
    }
    await expect(row).toContainText("Двадцать четыре.");
    await expect(row).toContainText(job.reason);
    const approve = row.getByRole("button", { name: "Approve speech" });
    const reject = row.getByRole("button", { name: "Reject", exact: true });
    await expect(approve).toBeInViewport();
    await expect(reject).toBeInViewport();
    await (action === "approve" ? approve : reject).click();
    if (live) {
      await expect(row).toContainText("queue is full");
      await approve.click();
    }
    await expect(approve).toHaveCount(0);
    await expect(row.locator(".ai-inline-review")).toContainText(action === "approve" ? "Queued" : "Rejected");
  });
}

for (const width of [390, 1280]) {
  test(`AI history explains a failed verification and retries it once at ${width}px`, async ({ page, runtime }) => {
    await page.setViewportSize({ width, height: 800 });
    const job = {
      id: "failed-job", revision: 7, state: "failed", retryable: true,
      error_code: "output_truncated", name: "Viewer", original_text: "Hello",
      failure: { stage: "verifying", queue: "running" }, presentation: {},
      created_at: new Date().toISOString(), usage: []
    };
    await page.route("**/api/ai-messages?*", route => route.fulfill({ json: {
      items: route.request().url().includes("review_pending") ? [] : [job],
      credentials: {}, service_state: "ready"
    } }));
    let attempts = 0;
    await page.route("**/api/ai-messages/retry", route => {
      expect(route.request().postDataJSON()).toEqual({ job_id: job.id, expected_revision: 7 });
      attempts++;
      Object.assign(job, { state: "queued", retryable: false, error_code: "", revision: 8 });
      return route.fulfill({ json: job });
    });
    await page.goto(runtime.url + "/#/settings/experimental");
    await page.getByRole("tab", { name: /recent|history/i }).click();
    await expect(page.getByText(/Verifying.*output token limit.*queue continued/)).toBeVisible();
    const retry = page.getByRole("button", { name: /retry processing/i });
    await retry.focus();
    await expect(retry).toBeFocused();
    await retry.press("Enter");
    await expect(retry).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Viewer.*Queued/i })).toBeVisible();
    expect(attempts).toBe(1);
  });
}
