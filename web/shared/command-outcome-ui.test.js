import assert from "node:assert/strict";
import test from "node:test";
import {
  commandOutcomeFromRecentField,
  commandOutcomeFromWire,
  cooldownSecondsRemaining,
  commandOutcomeChromeKind,
  commandOutcomeReasonLabel,
  isCooldownOutcomeActive,
  isRejectedOutcomeActive,
  commandOutcomeMessageKey,
} from "./command-outcome-ui.js";

test("command outcome keys match platform and id", function () {
  assert.equal(commandOutcomeMessageKey("twitch", "abc"), "twitch\0abc");
  assert.equal(commandOutcomeMessageKey("", "abc"), "");
});

test("wire outcome maps cooldown remaining to expiry", function () {
  const parsed = commandOutcomeFromWire({
    type: "command_outcome",
    message_platform: "youtube",
    message_id: "1",
    trigger: "gg",
    status: "cooldown",
    cooldown_remaining_ms: 2500,
  }, 1000);
  assert.deepEqual(parsed, {
    platform: "youtube",
    id: "1",
    outcome: {
      trigger: "gg",
      status: "cooldown",
      cooldown_expires_at_ms: 3500,
      reason: "",
      reason_label: "",
    },
  });
});

test("recent field refresh uses read time", function () {
  const outcome = commandOutcomeFromRecentField({
    trigger: "gg",
    status: "cooldown",
    cooldown_remaining_ms: 4000,
  }, 10_000);
  assert.equal(outcome.cooldown_expires_at_ms, 14_000);
  assert.equal(cooldownSecondsRemaining(outcome.cooldown_expires_at_ms, 12_500), 2);
  assert.equal(isCooldownOutcomeActive(outcome, 14_001), false);
  assert.equal(commandOutcomeChromeKind(outcome, 12_000), "cooldown");
});

test("fired outcome is accepted chrome without countdown", function () {
  const outcome = commandOutcomeFromRecentField({
    trigger: "leaderboard",
    status: "fired",
    cooldown_remaining_ms: 0,
  }, 0);
  assert.equal(commandOutcomeChromeKind(outcome, 0), "accepted");
  assert.equal(isCooldownOutcomeActive(outcome, 0), false);
});

test("rejected outcome uses reason label and expires after display window", function () {
  const outcome = commandOutcomeFromRecentField({
    trigger: "like",
    status: "rejected",
    reason: "ambiguous",
    reason_label: "clarify",
  }, 1000);
  assert.equal(commandOutcomeChromeKind(outcome, 1000), "rejected");
  assert.equal(isRejectedOutcomeActive(outcome, 1000), true);
  assert.equal(isRejectedOutcomeActive(outcome, 7000), false);
  assert.equal(
    commandOutcomeReasonLabel(outcome, function (key) {
      return key === "msg.commandReject.ambiguous" ? "Clarify" : key;
    }),
    "clarify"
  );
});

test("unknown reject reason falls back to i18n map", function () {
  const outcome = commandOutcomeFromRecentField({
    trigger: "buff",
    status: "rejected",
    reason: "quota",
  }, 0);
  const label = commandOutcomeReasonLabel(outcome, function (key) {
    if (key === "msg.commandReject.quota") {
      return "Quota";
    }
    if (key === "msg.commandRejected") {
      return "Rejected";
    }
    return key;
  });
  assert.equal(label, "Quota");
});
