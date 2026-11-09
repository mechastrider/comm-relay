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
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
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
