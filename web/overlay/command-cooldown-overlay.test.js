import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  COMMAND_COOLDOWN_OVERLAY_MS,
  COMMAND_OUTCOME_WAIT_MS,
  commandOutcomeKeyFromFrame,
  findEntryByMessageKey,
  planCommandOutcomeHandling,
  rememberPendingCommandCooldown,
  restartCommandCooldownOverlay,
  shouldHideSuccessfulCommandMessage,
  shouldHoldCommandMessageForOutcome,
  shouldIgnoreCommandOutcome,
  takePendingCommandCooldown,
  takePendingCommandMessage,
} from "./command-cooldown-overlay.js";

test("shouldIgnoreCommandOutcome honors hide flag and cooldown status only", function () {
  const cooldown = {
    type: "command_outcome",
    message_platform: "twitch",
    message_id: "1",
    status: "cooldown",
  };
  assert.equal(shouldIgnoreCommandOutcome(cooldown, false), false);
  assert.equal(shouldIgnoreCommandOutcome(cooldown, true), true);
  assert.equal(shouldIgnoreCommandOutcome({ ...cooldown, status: "fired" }, false), true);
});

test("attach-before-message buffers by platform and id then applies on render", function () {
  const pending = new Map();
  const outcome = {
    message_platform: "twitch",
    message_id: "late",
    status: "cooldown",
  };
  const key = commandOutcomeKeyFromFrame(outcome);
  assert.equal(key, "twitch\0late");
  assert.equal(shouldIgnoreCommandOutcome(outcome, false), false);
  assert.equal(findEntryByMessageKey([], key), null);
  rememberPendingCommandCooldown(pending, key);
  assert.equal(pending.has(key), true);

  const entry = { messageKey: key, commandCooldownTimer: null };
  let started = 0;
  restartCommandCooldownOverlay(entry, {
    clearTimeout() {},
    setTimeout(callback) {
      callback();
      return 1;
    },
    onStart() { started += 1; },
    onEnd() {},
  });
  assert.equal(started, 1);
  assert.equal(takePendingCommandCooldown(pending, key), true);
  assert.equal(pending.has(key), false);
});

test("restartCommandCooldownOverlay removes row after five seconds", function () {
  const entry = { messageKey: "twitch\0a", commandCooldownTimer: 3 };
  const cleared = [];
  let delayMs = 0;
  let ended = 0;
  let timerCallback;
  restartCommandCooldownOverlay(entry, {
    clearTimeout(id) { cleared.push(id); },
    setTimeout(callback, ms) {
      delayMs = ms;
      timerCallback = callback;
      return 9;
    },
    onStart() {},
    onEnd() { ended += 1; },
  });
  assert.deepEqual(cleared, [3]);
  assert.equal(delayMs, COMMAND_COOLDOWN_OVERLAY_MS);
  assert.equal(entry.commandCooldownTimer, 9);
  timerCallback();
  assert.equal(ended, 1);
  assert.equal(entry.commandCooldownTimer, null);
});

test("hide_command_messages still allows cooldown via pending or active overlay", function () {
  assert.equal(
    shouldHideSuccessfulCommandMessage(true, true, false, false),
    true
  );
  assert.equal(
    shouldHideSuccessfulCommandMessage(true, true, true, false),
    false
  );
  assert.equal(
    shouldHideSuccessfulCommandMessage(true, true, false, true),
    false
  );
  assert.equal(
    shouldHideSuccessfulCommandMessage(true, false, false, false),
    false
  );
});

test("hide_command_cooldown_overlay skips outcomes and successful hide stays separate", function () {
  const outcome = { status: "cooldown", message_platform: "twitch", message_id: "x" };
  assert.equal(shouldIgnoreCommandOutcome(outcome, true), true);
  assert.equal(shouldHideSuccessfulCommandMessage(true, true, false, false), true);
});

test("pending cooldown skips hold so outcome-before-message still freezes", function () {
  assert.equal(shouldHoldCommandMessageForOutcome(true, true), true);
  assert.equal(shouldHoldCommandMessageForOutcome(true, true, false), true);
  assert.equal(shouldHoldCommandMessageForOutcome(true, true, true), false);
  assert.equal(shouldHoldCommandMessageForOutcome(true, false, true), false);
});

test("message before cooldown outcome with hide_command_messages releases held row for freeze", function () {
  const frame = {
    type: "message",
    platform: "twitch",
    id: "cmd-1",
    is_command: true,
    message: "!gg",
  };
  const key = "twitch\0cmd-1";
  assert.equal(shouldHoldCommandMessageForOutcome(true, true), true);
  assert.equal(shouldHoldCommandMessageForOutcome(true, false), false);

  const pendingMessages = new Map();
  pendingMessages.set(key, { frame: frame, waitTimer: 1 });
  const plan = planCommandOutcomeHandling(
    {
      status: "cooldown",
      message_platform: "twitch",
      message_id: "cmd-1",
    },
    false,
    true,
    false,
    true
  );
  assert.equal(plan.action, "cooldown_show_held");
  const released = takePendingCommandMessage(pendingMessages, key, function () {});
  assert.deepEqual(released, frame);
  assert.equal(pendingMessages.has(key), false);

  const firedPlan = planCommandOutcomeHandling(
    { status: "fired", message_platform: "twitch", message_id: "cmd-1" },
    false,
    true,
    false,
    true
  );
  assert.equal(firedPlan.action, "fired");
  assert.equal(firedPlan.dropHeldMessage, true);
});

test("held command messages wait briefly for an outcome", function () {
  assert.equal(COMMAND_OUTCOME_WAIT_MS, 2500);
});

test("every chat theme has frozen cooldown feedback with reduced-motion fallback", async function () {
  const css = await readFile(new URL("./overlay.css", import.meta.url), "utf8");

  assert.match(css, /\.message--command-cooldown/);
  assert.match(css, /body\.overlay-theme--dashboard \.message--command-cooldown/);
  assert.match(css, /body\.overlay-theme--cockpit-panel \.message--command-cooldown/);
  assert.match(css, /body\.overlay-theme--cockpit-popups \.message--command-cooldown/);
  assert.match(css, /body\.overlay-theme--g-rebels-popups \.message--command-cooldown/);
  assert.match(
    css,
    /\.message\.message--command-cooldown:not\(\.message--leaving\)\s*\{[^}]*animation:\s*message-command-cooldown-pulse/
  );
  assert.match(css, /@keyframes message-command-cooldown-pulse/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.message--command-cooldown\s*\{[^}]*animation:\s*none\s*!important/
  );
});

test("overlay wires command_outcome and cooldown constant", async function () {
  const overlay = await readFile(new URL("./overlay.js", import.meta.url), "utf8");
  assert.match(overlay, /from "\/overlay\/command-cooldown-overlay\.js\?v=2"/);
  assert.match(overlay, /frame\.type === "command_outcome"/);
  assert.match(overlay, /hide_command_cooldown_overlay/);
  assert.match(overlay, /pendingCommandMessages/);
  assert.match(overlay, /shouldHoldCommandMessageForOutcome/);
  assert.match(overlay, /planCommandOutcomeHandling/);
  assert.doesNotMatch(overlay, /cooldown_remaining_ms/);
});
