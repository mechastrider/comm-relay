import assert from "node:assert/strict";
import test from "node:test";

import { isProductionLeaderboard, parseLeaderboardVisibility } from "./leaderboard-visibility.js";

test("production visibility excludes every preview and the dedicated debug page", function () {
  assert.equal(isProductionLeaderboard({ previewEnabled: false, debugTestEnabled: false }), true);
  assert.equal(isProductionLeaderboard({ previewEnabled: true, debugTestEnabled: false }), false);
  assert.equal(isProductionLeaderboard({ previewEnabled: false, debugTestEnabled: true }), false);
});

test("visibility parser accepts authoritative states and ignores unrelated old-client frames", function () {
  assert.deepEqual(parseLeaderboardVisibility({
    type: "leaderboard_visibility",
    state: "timed",
    policy: "automatic",
    visible: true,
    visible_until: "2026-09-06T12:00:00Z",
    reason: "award",
  }), {
    state: "timed",
    policy: "automatic",
    visible: true,
    visibleUntil: "2026-09-06T12:00:00Z",
    reason: "award",
  });
  assert.equal(parseLeaderboardVisibility({ type: "leaderboard", entries: [] }), null);
  assert.equal(parseLeaderboardVisibility({ type: "leaderboard_visibility", state: "maybe", policy: "automatic" }), null);
});
