import assert from "node:assert/strict";
import test from "node:test";

import {
  awardGrantFailure,
  awardGrantRequest,
  awardGrantStatus,
  enableRewardRetry,
  messageCanBeRewarded,
  restoreRewardTrigger,
  setRewardItemPending,
} from "./reward-picker.js";

test("awardGrantRequest includes only available transient message context", function () {
  const request = awardGrantRequest(
    { platform: "twitch", user_id: "42", id: "msg-7", message: "A useful callout" },
    { id: "advice", name: "Advice", points: 50 }
  );

  assert.deepEqual(request, {
    platform: "twitch",
    user_id: "42",
    award_id: "advice",
    message_id: "msg-7",
    message_text: "A useful callout",
  });
});

test("selected reward option is busy during a request and becomes retryable after failure", function () {
  const attributes = new Map();
  const item = {
    disabled: false,
    setAttribute: function (name, value) { attributes.set(name, value); },
  };

  setRewardItemPending(item, true);
  assert.equal(item.disabled, true);
  assert.equal(attributes.get("aria-busy"), "true");
  setRewardItemPending(item, false);
  assert.equal(item.disabled, false);
  assert.equal(attributes.get("aria-busy"), "false");
});

test("awardGrantRequest supports a message without source id or text", function () {
  assert.deepEqual(
    awardGrantRequest({ platform: "youtube", user_id: "viewer" }, { id: "joke" }),
    { platform: "youtube", user_id: "viewer", award_id: "joke" }
  );
  assert.equal(messageCanBeRewarded({ platform: "youtube", user_id: "viewer" }), true);
});

test("awardGrantStatus is localized through the supplied formatter", function () {
  assert.equal(
    awardGrantStatus(function (key, values) { return key + ":" + values.award + ":" + values.points; }, { id: "joke", name: "Joke", points: 10 }),
    "reward.grantSucceeded:Joke:10"
  );
  assert.equal(awardGrantFailure(function (key) { return key + ":localized"; }), "reward.grantFailed:localized");
});

test("reward trigger restores focus on success and stays retryable after failure", function () {
  const attributes = new Map();
  let focused = 0;
  const trigger = {
    disabled: true,
    setAttribute: function (name, value) { attributes.set(name, value); },
    focus: function () { focused += 1; },
  };

  restoreRewardTrigger(trigger);
  assert.equal(trigger.disabled, false);
  assert.equal(attributes.get("aria-expanded"), "false");
  assert.equal(focused, 1);

  trigger.disabled = true;
  enableRewardRetry(trigger);
  assert.equal(trigger.disabled, false);
  assert.equal(focused, 1);
});
