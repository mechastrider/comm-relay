import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  awardMessageKey,
  findRewardedEntry,
  restartRewardHighlight,
  rewardLabelText,
} from "./reward-highlight.js";

test("findRewardedEntry matches only the exact platform and message id", function () {
  const exact = { messageKey: "twitch\0same", rewardTimer: null };
  const differentPlatform = { messageKey: "youtube\0same", rewardTimer: null };
  const alert = { source: "award", message_platform: "twitch", message_id: "same" };

  assert.equal(awardMessageKey(alert), "twitch\0same");
  assert.equal(findRewardedEntry([differentPlatform, exact], alert), exact);
  assert.equal(findRewardedEntry([exact], { source: "award", message_platform: "twitch" }), null);
  assert.equal(findRewardedEntry([exact], { source: "command", message_platform: "twitch", message_id: "same" }), null);
});

test("rewardLabelText keeps award meaning and a non-color points label", function () {
  assert.equal(rewardLabelText({ award_name: "Advice", points: 50 }), "Advice +50");
  assert.equal(rewardLabelText({ award_name: "  Advice  ", points: 0 }), "Advice");
  assert.equal(rewardLabelText({ points: 10 }), "+10");
  assert.equal(rewardLabelText({ award_name: "", points: -1 }), "");
});

test("restartRewardHighlight replaces the previous timer", function () {
  const entry = { rewardTimer: 7 };
  const cleared = [];
  let timerCallback;
  let starts = 0;
  let ends = 0;
  const alert = { source: "award", message_platform: "twitch", message_id: "same", points: 10 };

  assert.equal(restartRewardHighlight(entry, alert, {
    clearTimeout: function (id) { cleared.push(id); },
    setTimeout: function (callback) { timerCallback = callback; return 8; },
    onStart: function () { starts += 1; },
    onEnd: function () { ends += 1; },
  }), true);
  assert.deepEqual(cleared, [7]);
  assert.equal(starts, 1);
  assert.equal(entry.rewardTimer, 8);

  timerCallback();
  assert.equal(ends, 1);
  assert.equal(entry.rewardTimer, null);
  assert.equal(entry.reward, null);
});

test("every chat theme has static, non-color reward feedback", async function () {
  const css = await readFile(new URL("./overlay.css", import.meta.url), "utf8");

  assert.match(css, /\.message__reward/);
  assert.match(css, /body\.overlay-theme--dashboard \.message--rewarded/);
  assert.match(css, /body\.overlay-theme--cockpit-panel \.message--rewarded/);
  assert.match(css, /body\.overlay-theme--cockpit-popups \.message--rewarded/);
  assert.match(css, /body\.overlay-theme--g-rebels-popups \.message--rewarded/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.message__reward-name[\s\S]*?text-overflow:\s*ellipsis/);
  assert.match(css, /\.message__reward-points[\s\S]*?flex:\s*0 0 auto/);
  assert.doesNotMatch(css, /\.message__reward\s*\{[^}]*position:\s*absolute/);
});

test("reward row reserves in-flow badge space with an accessible full label", async function () {
  const overlay = await readFile(new URL("./overlay.js", import.meta.url), "utf8");
  assert.match(overlay, /identityEl\.appendChild\(rewardEl\)/);
  assert.match(overlay, /rewardEl\.setAttribute\("aria-label", label\)/);
  assert.doesNotMatch(overlay, /row\.appendChild\(rewardEl\)/);
});
