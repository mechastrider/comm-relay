import assert from "node:assert/strict";
import test from "node:test";

import {
  completeRowsThatFit,
  fontSizeToFitFirstRow,
  isCompactLeaderboard,
  isLeaderboardSamplePreview,
  leaderboardFontSizeForWidth,
  shouldRenderMessageCount,
} from "./leaderboard-fit.js";

test("automatic font size follows width and remains bounded", function () {
  assert.equal(leaderboardFontSizeForWidth({ sizingMode: "auto", baseFontSizePx: 18, width: 160, layout: "panel" }), 12);
  assert.equal(leaderboardFontSizeForWidth({ sizingMode: "auto", baseFontSizePx: 18, width: 640, layout: "panel" }), 18);
  assert.equal(leaderboardFontSizeForWidth({ sizingMode: "auto", baseFontSizePx: 18, width: 2560, layout: "panel" }), 48);
  assert.equal(leaderboardFontSizeForWidth({ sizingMode: "fixed", baseFontSizePx: 16, width: 1280, layout: "panel" }), 16);
});

test("only explicit sample preview isolates the leaderboard from live data", function () {
  assert.equal(isLeaderboardSamplePreview(new URLSearchParams("preview=sample")), true);
  assert.equal(isLeaderboardSamplePreview(new URLSearchParams("preview=white")), false);
  assert.equal(isLeaderboardSamplePreview(new URLSearchParams("")), false);
});

test("complete row fitting respects title, cap, and exact thresholds", function () {
  const base = { titleHeight: 24, rowHeights: [40, 40, 40, 40], rowGap: 6, maxEntries: 3 };
  assert.equal(completeRowsThatFit({ ...base, availableHeight: 109 }), 1);
  assert.equal(completeRowsThatFit({ ...base, availableHeight: 110 }), 2);
  assert.equal(completeRowsThatFit({ ...base, availableHeight: 156 }), 3);
  assert.equal(completeRowsThatFit({ ...base, availableHeight: 400 }), 3);
});

test("row fitting uses hysteresis only when adding a row", function () {
  const base = { titleHeight: 0, rowHeights: [40, 40, 40], rowGap: 5, maxEntries: 3, hysteresisPx: 3 };
  assert.equal(completeRowsThatFit({ ...base, availableHeight: 86, previousCount: 1 }), 1);
  assert.equal(completeRowsThatFit({ ...base, availableHeight: 88, previousCount: 1 }), 2);
  assert.equal(completeRowsThatFit({ ...base, availableHeight: 84, previousCount: 2 }), 1);
});

test("automatic sizing may shrink for the first complete row while fixed sizing does not", function () {
  assert.equal(fontSizeToFitFirstRow({ sizingMode: "auto", fontSizePx: 18, availableHeight: 50, requiredHeight: 60 }), 15);
  assert.equal(fontSizeToFitFirstRow({ sizingMode: "auto", fontSizePx: 18, availableHeight: 20, requiredHeight: 60 }), 12);
  assert.equal(fontSizeToFitFirstRow({ sizingMode: "fixed", fontSizePx: 18, availableHeight: 20, requiredHeight: 60 }), 18);
});

test("message count is suppressed before primary content in compact layouts", function () {
  assert.equal(isCompactLeaderboard(320, 18), true);
  assert.equal(isCompactLeaderboard(320, 12), true);
  assert.equal(isCompactLeaderboard(360, 12), true);
  assert.equal(isCompactLeaderboard(640, 18), false);
  assert.equal(shouldRenderMessageCount(true, false), true);
  assert.equal(shouldRenderMessageCount(true, true), false);
  assert.equal(shouldRenderMessageCount(false, false), false);
});
