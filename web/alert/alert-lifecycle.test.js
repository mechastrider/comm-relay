import assert from "node:assert/strict";
import test from "node:test";

import { startSplashLifecycle } from "./alert-lifecycle.js";
import { createAlertScheduler } from "./alert-scheduler.js";

test("an audio failure cannot prevent visible completion from advancing the queue", async function () {
  const scheduler = createAlertScheduler({ now: () => 0 });
  assert.equal(
    scheduler.enqueue({ id: "visible", source: "command", name: "Nova", text: "Ready", points: 0, duration_ms: 5_000 }).id,
    "visible"
  );
  scheduler.enqueue({
    id: "next-award", source: "award", name: "Nova", text: "Awarded", points: 10,
    duration_ms: 5_000, award_id: "spotter", award_name: "Spotter",
  });

  let scheduled = null;
  startSplashLifecycle({
    playSound: () => Promise.reject(new Error("autoplay blocked")),
    durationMs: 5000,
    setTimeout: (callback, durationMs) => {
      scheduled = { callback, durationMs };
      return 1;
    },
    onComplete: () => {
      const next = scheduler.completeVisible();
      assert.equal(next.id, "next-award");
    },
  });

  await Promise.resolve();
  assert.equal(scheduled.durationMs, 5000);
  scheduled.callback();
  assert.equal(scheduler.snapshot().visible.id, "next-award");
});
