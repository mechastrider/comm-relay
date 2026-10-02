import assert from "node:assert/strict";
import test from "node:test";
import {
  buildViewerFilterOptions,
  formatRewardHistoryTime,
  formatSignedPoints,
  resolveViewerFilter,
  rewardHistoryURL,
} from "../src/features/audience/history-model.js";

test("builds bounded read URLs and presentation helpers", function () {
  assert.equal(rewardHistoryURL(null, 50, null), "/api/reward-history?limit=50");
  assert.equal(
    rewardHistoryURL("viewer/one", 10, "next+cursor"),
    "/api/reward-history?limit=10&viewer_id=viewer%2Fone&cursor=next%2Bcursor"
  );
  assert.equal(formatSignedPoints(25), "+25 XP");
  assert.equal(formatSignedPoints(-5), "-5 XP");
  assert.match(formatRewardHistoryTime("2026-09-08T14:05:00Z", "en-GB"), /08\/09\/2026, 14:05/);
});

test("builds searchable viewer choices and disambiguates duplicate names", function () {
  const options = buildViewerFilterOptions([
    { id: "alice-twitch", display_name: "Alice", platforms: ["twitch"] },
    { id: "alice-youtube", display_name: "Alice", platforms: ["youtube"] },
    { id: "sam-one", display_name: "Sam", platforms: ["twitch"] },
    { id: "sam-two", display_name: "Sam", platforms: ["twitch"] },
  ], function (platform) {
    return platform === "youtube" ? "YouTube" : "Twitch";
  });

  assert.deepEqual(options.map(function (option) { return option.label; }), [
    "Alice · Twitch",
    "Alice · YouTube",
    "Sam · Twitch · sam-one",
    "Sam · Twitch · sam-two",
  ]);
  assert.equal(resolveViewerFilter(options, "alice · youtube").id, "alice-youtube");
  assert.equal(resolveViewerFilter(options, "Alice"), null);
  assert.equal(resolveViewerFilter(options, "Sam"), null);
  assert.equal(resolveViewerFilter(options, "unknown"), null);
  assert.equal(resolveViewerFilter(options, ""), null);
});
