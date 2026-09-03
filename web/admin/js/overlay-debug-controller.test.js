import assert from "node:assert/strict";
import test from "node:test";

import {
  createOverlayDebugController,
  createOverlayDebugRequestQueue,
} from "./overlay-debug-controller.js";

test("replay controller accepts only successful compatible runs and lets Reset supersede a scenario", function () {
  const controller = createOverlayDebugController();
  const successful = { scenario: "rewarded_message", display_name: "Nova", message: "Visible source", points: 25 };
  const failed = { scenario: "message", message: "Never replay this" };

  // Initial and failed requests never create a replay target.
  assert.equal(controller.replayPayload("chat"), null);
  const failedRequest = controller.beginScenario(failed);
  assert.notEqual(failedRequest, 0);
  assert.equal(controller.beginScenario(failed), 0, "Run/Replay must not start a duplicate request");
  controller.failRequest(failedRequest);
  assert.equal(controller.replayPayload("chat"), null);

  // A successful run is captured independently from later form edits.
  const successfulRequest = controller.beginScenario(successful);
  assert.notEqual(successfulRequest, 0);
  controller.completeRequest(successfulRequest, successful);
  successful.message = "Edited after success";
  assert.deepEqual(controller.replayPayload("chat"), {
    scenario: "rewarded_message", display_name: "Nova", message: "Visible source", points: 25,
  });

  // Reset stays available during a scenario, supersedes it, and its success
  // preserves the previous replay payload. A second Reset is blocked.
  const supersededScenario = controller.beginScenario(failed);
  assert.notEqual(supersededScenario, 0);
  assert.equal(controller.replayPayload("chat"), null, "Replay is disabled while a scenario is in flight");
  assert.equal(controller.canStartReset(), true);
  const resetRequest = controller.beginReset();
  assert.notEqual(resetRequest, 0);
  assert.equal(controller.beginScenario(failed), 0, "Run/Replay stay blocked while Reset is in flight");
  assert.equal(controller.beginReset(), 0, "duplicate Reset is blocked while Reset is in flight");
  assert.equal(controller.completeRequest(supersededScenario, failed), false, "the superseded scenario completion is ignored");
  assert.equal(controller.replayPayload("chat"), null, "Replay is disabled while Reset is in flight");
  controller.completeRequest(resetRequest);
  assert.equal(controller.replayPayload("chat").message, "Visible source");

  // A failed new request must not replace the last successful replay payload.
  const anotherFailedRequest = controller.beginScenario(failed);
  assert.notEqual(anotherFailedRequest, 0);
  controller.failRequest(anotherFailedRequest);
  assert.equal(controller.replayPayload("chat").message, "Visible source");

  // Surface changes retain a compatible replay, clear an incompatible one, and
  // closing test mode always disables replay.
  controller.clearIncompatible("alerts");
  assert.equal(controller.replayPayload("alerts").scenario, "rewarded_message");
  controller.clearIncompatible("leaderboard");
  assert.equal(controller.replayPayload("leaderboard"), null);

  // Closing test mode invalidates a pending response as well as stored replay.
  const pendingRequest = controller.beginScenario({ scenario: "message", message: "stale response" });
  controller.close();
  assert.equal(controller.completeRequest(pendingRequest, { scenario: "message", message: "stale response" }), false);
  controller.close();
  assert.equal(controller.replayPayload("chat"), null);
});

test("request queue sends Reset only after an in-flight Run has settled at the server boundary", async function () {
  const queue = createOverlayDebugRequestQueue();
  const calls = [];
  let releaseRun;
  const heldRun = new Promise(function (resolve) {
    releaseRun = resolve;
  });

  const run = queue.enqueue(async function () {
    calls.push("run:start");
    await heldRun;
    calls.push("run:settled");
  });
  await Promise.resolve();

  const reset = queue.enqueue(async function () {
    calls.push("reset:start");
  });
  await Promise.resolve();
  assert.deepEqual(calls, ["run:start"], "Reset must not overtake the held Run request");

  releaseRun();
  await Promise.all([run, reset]);
  assert.deepEqual(calls, ["run:start", "run:settled", "reset:start"]);

  await assert.rejects(
    queue.enqueue(async function () {
      calls.push("failed:start");
      throw new Error("network failure");
    }),
    /network failure/
  );
  await queue.enqueue(async function () {
    calls.push("after-failure:start");
  });
  assert.deepEqual(calls.slice(-2), ["failed:start", "after-failure:start"]);
});
