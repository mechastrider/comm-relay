import assert from "node:assert/strict";
import test from "node:test";
import {
  commandOutcomeFromRecentField,
  commandOutcomeFromWire,
  cooldownSecondsRemaining,
  commandOutcomeChromeKind,
  isCooldownOutcomeActive,
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
