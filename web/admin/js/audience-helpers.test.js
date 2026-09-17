import assert from "node:assert/strict";
import {
  audienceEmptyKind,
  formatPlatformSummary,
  formatViewerPlatforms,
  sortAudienceViewers,
  validateDisplayName,
  validateCommandTrigger,
  validateCommandAliasSlug,
  validateCommandAliasesText,
  validateCommandAliasesAgainstTrigger,
  parseCommandAliasesText,
  formatCommandAliasesForEditor,
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
  session_xp: 10,
  session_message_count: 2,
  day_xp: 20,
  day_message_count: 4,
  xp: 30,
  message_count: 6,
};
assert.deepEqual(viewerPeriodMetrics(viewer, "session"), { xp: 10, messages: 2 });
assert.deepEqual(viewerPeriodMetrics(viewer, "day"), { xp: 20, messages: 4 });
assert.deepEqual(viewerPeriodMetrics(viewer, "all"), { xp: 30, messages: 6 });
assert.deepEqual(viewerPeriodMetrics(null, "session"), { xp: 0, messages: 0 });

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

assert.deepEqual(parseCommandAliasesText("heate\nwarm\n"), ["heate", "warm"]);
assert.deepEqual(parseCommandAliasesText("Dup\nDUP\n"), ["dup"]);
assert.equal(formatCommandAliasesForEditor(["Warm", "heate"]), "warm\nheate");
assert.equal(validateCommandAliasSlug("heat"), null);
assert.equal(validateCommandAliasSlug("!nope"), "commands.aliasesInvalid");
assert.equal(validateCommandAliasesText("ok\nbad slug"), "commands.aliasesInvalid");
assert.equal(
  validateCommandAliasesText(
    Array.from({ length: 17 }, function (_, index) {
      return "alias" + index;
    }).join("\n")
  ),
  "commands.aliasesTooMany"
);
assert.equal(validateCommandAliasesAgainstTrigger("warm", "heat"), null);
assert.equal(
  validateCommandAliasesAgainstTrigger("heat\nwarm", "heat"),
  "commands.aliasesMatchesTrigger"
);

assert.equal(validateAwardPoints(10), null);
assert.equal(validateAwardPoints(0), "awards.pointsInvalid");
assert.equal(validateAwardPoints("x"), "awards.pointsInvalid");

const streamSortRows = [
  { id: "a", session_count: 2, session_xp: 50, day_xp: 0, xp: 0 },
  { id: "b", session_count: 4, session_xp: 1, day_xp: 99, xp: 0 },
];
assert.deepEqual(
  sortAudienceViewers(streamSortRows, { column: "streams", direction: "desc" }, "session").map(function (row) {
    return row.id;
  }),
  ["b", "a"]
);
assert.deepEqual(
  sortAudienceViewers(streamSortRows, { column: "streams", direction: "desc" }, "day").map(function (row) {
    return row.id;
  }),
  ["b", "a"]
);

console.log("audience-helpers OK");
