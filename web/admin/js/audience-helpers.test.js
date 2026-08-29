import assert from "node:assert/strict";
import {
  audienceEmptyKind,
  formatPlatformSummary,
  formatViewerPlatforms,
  validateDisplayName,
  validateCommandTrigger,
  validateAwardPoints,
  viewerPeriodMetrics,
} from "./audience-helpers.js";

assert.equal(audienceEmptyKind({ loading: true, count: 0 }), "loading");
assert.equal(audienceEmptyKind({ error: true, count: 0 }), "error");
assert.equal(audienceEmptyKind({ count: 0, query: "" }), "none");
assert.equal(audienceEmptyKind({ count: 0, query: "   " }), "none");
assert.equal(audienceEmptyKind({ count: 0, query: "alpha" }), "no-matches");
assert.equal(audienceEmptyKind({ count: 3, query: "alpha" }), "ready");

const viewer = {
  session_score: 10,
  session_message_count: 2,
  day_score: 20,
  day_message_count: 4,
  score: 30,
  message_count: 6,
};
assert.deepEqual(viewerPeriodMetrics(viewer, "session"), { score: 10, messages: 2 });
assert.deepEqual(viewerPeriodMetrics(viewer, "day"), { score: 20, messages: 4 });
assert.deepEqual(viewerPeriodMetrics(viewer, "all"), { score: 30, messages: 6 });
assert.deepEqual(viewerPeriodMetrics(null, "session"), { score: 0, messages: 0 });

const platforms = formatPlatformSummary(
  [
    { platform: "twitch" },
    { platform: "youtube" },
    { platform: "twitch" },
  ],
  function (platform) {
    return platform.toUpperCase();
  }
);
assert.equal(platforms, "TWITCH, YOUTUBE");
assert.equal(formatPlatformSummary([], function (p) { return p; }), "");

assert.equal(
  formatViewerPlatforms(
    { identities: [{ platform: "twitch" }], last_seen: { platform: "youtube" } },
    function (platform) { return platform.toUpperCase(); }
  ),
  "TWITCH"
);
assert.equal(
  formatViewerPlatforms(
    { last_seen: { platform: "youtube" } },
    function (platform) { return platform.toUpperCase(); }
  ),
  "YOUTUBE"
);
assert.equal(
  formatViewerPlatforms({}, function (platform) { return platform; }),
  ""
);

assert.equal(validateDisplayName("Alpha"), null);
assert.equal(validateDisplayName("  Beta  "), null);
assert.equal(validateDisplayName(""), "viewers.nameRequired");
assert.equal(validateDisplayName("   "), "viewers.nameRequired");

assert.equal(validateCommandTrigger("lurk"), null);
assert.equal(validateCommandTrigger(""), "commands.triggerRequired");
assert.equal(validateCommandTrigger("!gg"), "commands.triggerInvalid");
assert.equal(validateCommandTrigger("bad slug"), "commands.triggerInvalid");

assert.equal(validateAwardPoints(10), null);
assert.equal(validateAwardPoints(0), "awards.pointsInvalid");
assert.equal(validateAwardPoints("x"), "awards.pointsInvalid");

console.log("audience-helpers OK");
