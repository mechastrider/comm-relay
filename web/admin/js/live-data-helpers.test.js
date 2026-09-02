import assert from "node:assert/strict";
import {
  createLeaderboardSnapshotCache,
  createStatisticsInvalidator,
  leaderboardPeriodTransition,
  leaderboardPeriodFrom,
} from "./live-data-helpers.js";
import { catalogFocusAfterDelete, neighboringCatalogSelection } from "./catalog-selection.js";

assert.equal(leaderboardPeriodFrom("session"), "session");
assert.equal(leaderboardPeriodFrom("week"), null);

const snapshots = createLeaderboardSnapshotCache();
assert.equal(snapshots.remember({ period: "week", entries: [] }), null);
snapshots.remember({ period: "session", entries: [{ display_name: "Old", score: 1 }] });
snapshots.remember({ period: "day", entries: [{ display_name: "Day", score: 2 }] });
snapshots.remember({ period: "session", entries: [{ display_name: "Newest", score: 3 }] });
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
// A reconnect's HTTP recovery response is authoritative for its period and
// replaces an older event snapshot without touching the other cached period.
snapshots.remember({ period: "session", entries: [{ display_name: "Recovered", score: 4 }] });
assert.equal(snapshots.get("session")?.entries[0].display_name, "Recovered");
assert.equal(snapshots.get("day")?.entries[0].display_name, "Day");

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
