import assert from "node:assert/strict";
import test from "node:test";

import { createAlertScheduler } from "./alert-scheduler.js";

function alert(id, source = "command", extra = {}) {
  return { id, source, ...extra };
}

test("keeps one visible splash and selects pending awards before commands", function () {
  let clock = 0;
  const scheduler = createAlertScheduler({ now: () => clock });

  assert.equal(scheduler.enqueue(alert("command-a")).id, "command-a");
  scheduler.enqueue(alert("command-b"));
  scheduler.enqueue(alert("command-c"));
  scheduler.enqueue(alert("award-a", "award"));
  scheduler.enqueue(alert("award-b", "award"));

  assert.equal(scheduler.snapshot().visible.id, "command-a");
  assert.deepEqual(scheduler.snapshot().commands.map((item) => item.id), ["command-b", "command-c"]);
  assert.equal(scheduler.completeVisible().id, "award-a");
  assert.equal(scheduler.completeVisible().id, "award-b");
  assert.equal(scheduler.completeVisible().id, "command-b");
  assert.equal(scheduler.completeVisible().id, "command-c");
  assert.equal(scheduler.completeVisible(), null);
  clock += 1;
});

test("expires stale commands using valid created_at and receive time for legacy frames", function () {
  let clock = 50_000;
  const scheduler = createAlertScheduler({ now: () => clock });
  scheduler.enqueue(alert("visible", "award"));
  scheduler.enqueue(alert("old", "command", { created_at: new Date(39_999).toISOString() }));
  scheduler.enqueue(alert("legacy", "command", { created_at: "not-a-time" }));

  clock += 10_000;
  assert.equal(scheduler.completeVisible().id, "legacy");
  assert.equal(scheduler.completeVisible(), null);

  const beyondBoundary = createAlertScheduler({ now: () => clock });
  beyondBoundary.enqueue(alert("visible", "award"));
  beyondBoundary.enqueue(alert("expires-after-10s"));
  clock += 10_001;
  assert.equal(beyondBoundary.completeVisible(), null);

  const outOfOrder = createAlertScheduler({ now: () => clock });
  outOfOrder.enqueue(alert("visible", "award"));
  outOfOrder.enqueue(alert("fresh"));
  outOfOrder.enqueue(alert("late-stale", "command", { created_at: new Date(0).toISOString() }));
  assert.deepEqual(outOfOrder.snapshot().commands.map((item) => item.id), ["fresh"]);
});

test("keeps a fractional-second command until its full ten-second lifetime ends", function () {
  let clock = 20_000;
  const scheduler = createAlertScheduler({ now: () => clock });
  scheduler.enqueue(alert("visible", "award"));
  scheduler.enqueue(alert("fractional", "command", { created_at: "1970-01-01T00:00:10.999Z" }));

  clock = 20_998;
  assert.equal(scheduler.completeVisible().id, "fractional");
});

test("applies all capacity branches without allowing commands to displace awards", function () {
  const scheduler = createAlertScheduler({ now: () => 0 });
  scheduler.enqueue(alert("visible"));
  for (let index = 0; index < 20; index += 1) {
    scheduler.enqueue(alert("command-" + String(index)));
  }

  scheduler.enqueue(alert("award-1", "award"));
  assert.deepEqual(scheduler.snapshot().commands.map((item) => item.id), [
    ...Array.from({ length: 19 }, (_, index) => "command-" + String(index + 1)),
  ]);
  scheduler.enqueue(alert("award-2", "award"));
  assert.equal(scheduler.snapshot().commands.length, 18);
  assert.deepEqual(scheduler.snapshot().awards.map((item) => item.id), ["award-1", "award-2"]);

  const protectedScheduler = createAlertScheduler({ now: () => 0 });
  protectedScheduler.enqueue(alert("visible"));
  for (let index = 0; index < 20; index += 1) {
    protectedScheduler.enqueue(alert("award-" + String(index), "award"));
  }
  protectedScheduler.enqueue(alert("discarded-command"));
  assert.equal(protectedScheduler.snapshot().commands.length, 0);
  assert.equal(protectedScheduler.snapshot().awards.length, 20);

  scheduler.enqueue(alert("replacement-command"));
  assert.equal(scheduler.snapshot().commands.at(-1).id, "replacement-command");
  assert.equal(scheduler.snapshot().commands.some((item) => item.id === "command-2"), false);
});

test("schedules unknown sources as commands and starts empty after reload", function () {
  const firstPage = createAlertScheduler({ now: () => 0 });
  firstPage.enqueue(alert("visible"));
  firstPage.enqueue(alert("legacy-source", "something-new"));
  assert.deepEqual(firstPage.snapshot().commands.map((item) => item.id), ["legacy-source"]);

  const reloadedPage = createAlertScheduler({ now: () => 0 });
  assert.deepEqual(reloadedPage.snapshot(), { visible: null, awards: [], commands: [] });
});
