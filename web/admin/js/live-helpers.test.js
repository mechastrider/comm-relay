import assert from "node:assert/strict";
import {
  buildActivatePresetBody,
  nextActivePresetSelection,
  summarizeLiveStatistics,
} from "./live-helpers.js";

assert.deepEqual(buildActivatePresetBody("stream-main"), { preset_id: "stream-main" });
assert.deepEqual(buildActivatePresetBody(""), { preset_id: "" });

assert.deepEqual(nextActivePresetSelection("a", "b", true), {
  activeId: "b",
  selectedId: "b",
  requestedId: "b",
  previousId: "a",
  ok: true,
});
assert.deepEqual(nextActivePresetSelection("a", "b", false), {
  activeId: "a",
  selectedId: "a",
  requestedId: "b",
  previousId: "a",
  ok: false,
});

const empty = summarizeLiveStatistics({ viewers: [] }, { period: "session", entries: [] });
assert.equal(empty.uniqueViewers, 0);
assert.equal(empty.totalMessages, 0);
assert.equal(empty.totalScore, 0);
assert.equal(empty.topScore, 0);
assert.equal(empty.hasViewers, false);
assert.equal(empty.hasLeaderboard, false);

const populatedViewers = {
  viewers: [
    {
      id: "v1",
      display_name: "Alpha",
      session_xp: 40,
      session_message_count: 8,
      day_xp: 12,
      day_message_count: 3,
      xp: 100,
      message_count: 20,
    },
    {
      id: "v2",
      display_name: "Beta",
      session_xp: 25,
      session_message_count: 5,
      day_xp: 25,
      day_message_count: 5,
      xp: 80,
      message_count: 16,
    },
  ],
};

const populatedLeaderboard = {
  period: "session",
  entries: [
    { rank: 1, display_name: "Alpha", xp: 40, message_count: 8 },
    { rank: 2, display_name: "Beta", xp: 25, message_count: 5 },
  ],
};

const populated = summarizeLiveStatistics(populatedViewers, populatedLeaderboard);
assert.equal(populated.uniqueViewers, 2);
assert.equal(populated.totalMessages, 13);
assert.equal(populated.totalScore, 65);
assert.equal(populated.topScore, 40);
assert.equal(populated.topScorer, "Alpha");
assert.equal(populated.tiedTopCount, 1);
assert.equal(populated.hasLeaderboard, true);
assert.equal(populated.partialData, false);

const tiedLeaderboard = {
  period: "session",
  entries: [
    { rank: 1, display_name: "Alpha", xp: 40, message_count: 8 },
    { rank: 1, display_name: "Gamma", xp: 40, message_count: 6 },
    { rank: 3, display_name: "Beta", xp: 25, message_count: 5 },
  ],
};
const tied = summarizeLiveStatistics(populatedViewers, tiedLeaderboard);
assert.equal(tied.topScore, 40);
assert.equal(tied.tiedTopCount, 2);

const partialDay = summarizeLiveStatistics(
  {
    viewers: [
      { id: "v1", display_name: "Solo", session_xp: 5, session_message_count: 1 },
    ],
  },
  { period: "day", entries: [] },
  { period: "day", leaderboardFailed: true }
);
assert.equal(partialDay.leaderboardFailed, true);
assert.equal(partialDay.partialData, true);
assert.equal(partialDay.topScore, 0);
assert.equal(partialDay.uniqueViewers, 0);
assert.equal(partialDay.hasViewers, false);

const staleSession = summarizeLiveStatistics(
  {
    viewers: [
      {
        id: "v1",
        display_name: "Old",
        session_message_count: 0,
        session_xp: 0,
        message_count: 20,
        xp: 100,
      },
    ],
  },
  { period: "session", entries: [] }
);
assert.equal(staleSession.uniqueViewers, 0);
assert.equal(staleSession.hasViewers, false);
assert.equal(staleSession.totalMessages, 0);

const dayActive = summarizeLiveStatistics(
  populatedViewers,
  { period: "day", entries: [] },
  { period: "day" }
);
assert.equal(dayActive.uniqueViewers, 2);

const viewersOnly = summarizeLiveStatistics(populatedViewers, null, { leaderboardFailed: true });
assert.equal(viewersOnly.topScore, 40);
assert.equal(viewersOnly.topScorer, "Alpha");
assert.equal(viewersOnly.leaderboardFailed, true);

console.log("live-helpers OK");
