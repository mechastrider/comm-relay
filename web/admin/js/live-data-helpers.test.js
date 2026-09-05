import assert from "node:assert/strict";
import {
  createLeaderboardSnapshotCache,
  createLeaderboardLoadSequencer,
  createStatisticsInvalidator,
  leaderboardPeriodTransition,
  leaderboardPeriodFrom,
} from "./live-data-helpers.js";
import { catalogFocusAfterDelete, neighboringCatalogSelection } from "./catalog-selection.js";

assert.equal(leaderboardPeriodFrom("session"), "session");
assert.equal(leaderboardPeriodFrom("week"), null);

const snapshots = createLeaderboardSnapshotCache();
assert.equal(snapshots.remember({ period: "week", entries: [] }), null);
snapshots.remember({ period: "session", entries: [{ display_name: "Old", xp: 1 }] });
snapshots.remember({ period: "day", entries: [{ display_name: "Day", xp: 2 }] });
snapshots.remember({ period: "session", entries: [{ display_name: "Newest", xp: 3 }] });
assert.equal(snapshots.get("session")?.entries[0].display_name, "Newest");
assert.equal(snapshots.get("day")?.entries[0].display_name, "Day");
assert.equal(snapshots.get("all"), null);
assert.deepEqual(
  leaderboardPeriodTransition("session", "day", false),
  { preserveRowsOnError: false, clearRows: true, showLoading: true },
  "an uncached period switch clears session rows before its request"
);
assert.deepEqual(
  leaderboardPeriodTransition("session", "day", true),
  { preserveRowsOnError: true, clearRows: false, showLoading: false },
  "a cached day switch replaces rows and preserves that day snapshot if recovery fails"
);
assert.deepEqual(
  leaderboardPeriodTransition("day", "day", false),
  { preserveRowsOnError: true, clearRows: false, showLoading: false },
  "a same-period retry preserves its last successful snapshot on error"
);
// A complete matching WebSocket frame invalidates an in-flight HTTP response.
// Resolving that deferred older response cannot replace the cache or visible rows.
const loadSequencer = createLeaderboardLoadSequencer();
const httpGeneration = loadSequencer.begin("session");
let resolveHTTP;
const deferredHTTP = new Promise(function (resolve) {
  resolveHTTP = resolve;
});
const completedHTTP = deferredHTTP.then(function (payload) {
  if (loadSequencer.acceptsResponse(httpGeneration, payload.period)) {
    snapshots.remember(payload);
  }
});
snapshots.remember({ period: "session", entries: [{ display_name: "WebSocket newest", xp: 4 }] });
assert.equal(loadSequencer.invalidateForSnapshot("session"), true);
resolveHTTP({ period: "session", entries: [{ display_name: "HTTP older", xp: 3 }] });
await completedHTTP;
assert.equal(snapshots.get("session")?.entries[0].display_name, "WebSocket newest");
assert.equal(snapshots.get("day")?.entries[0].display_name, "Day");
assert.equal(loadSequencer.invalidateForSnapshot("day"), false, "a different period leaves no stale active request");

let clock = 0;
let nextTimer = 0;
const timers = new Map();
const refreshes = [];
const invalidator = createStatisticsInvalidator({
  now: () => clock,
  setTimeoutFn(callback, delay) {
    nextTimer += 1;
    timers.set(nextTimer, { callback, due: clock + delay });
    return nextTimer;
  },
  clearTimeoutFn(timer) {
    timers.delete(timer);
  },
  refresh(revision) {
    refreshes.push(revision);
  },
});

function runDueTimers() {
  const due = Array.from(timers.entries()).filter(([, timer]) => timer.due <= clock);
  due.forEach(([id, timer]) => {
    timers.delete(id);
    timer.callback();
  });
}

invalidator.invalidate(true);
invalidator.invalidate(true);
invalidator.invalidate(true);
runDueTimers();
assert.equal(refreshes.length, 1, "a burst starts one refresh");
const firstRefresh = refreshes[0];
invalidator.invalidate(true);
invalidator.finishRefresh(firstRefresh, true);
assert.equal(timers.size, 1, "a newer frame waits for the one-second budget");
clock = 999;
runDueTimers();
assert.equal(refreshes.length, 1);
clock = 1000;
runDueTimers();
assert.equal(refreshes.length, 2);
invalidator.cancel();
invalidator.invalidate(false);
assert.equal(timers.size, 0, "hidden Statistics retains dirtiness without a queued request");

assert.equal(neighboringCatalogSelection([{ id: "a" }, { id: "b" }, { id: "c" }], "b"), "c");
assert.equal(neighboringCatalogSelection([{ id: "a" }, { id: "b" }], "b"), "a");
assert.equal(neighboringCatalogSelection([{ id: "a" }], "a"), null);
assert.equal(neighboringCatalogSelection([{ id: "a" }], "missing"), null);
assert.deepEqual(catalogFocusAfterDelete([{ id: "a" }, { id: "b" }], "a"), { kind: "item", id: "b" });
assert.deepEqual(catalogFocusAfterDelete([{ id: "a" }], "a"), { kind: "create" });

console.log("live-data-helpers OK");
