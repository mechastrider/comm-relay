import assert from "node:assert/strict";
import test from "node:test";
import {
  buildViewerFilterOptions,
  formatRewardHistoryTime,
  formatSignedPoints,
  RewardHistoryController,
  resolveViewerFilter,
  rewardHistoryURL,
  ViewerRewardHistorySession,
} from "./reward-history-core.js";

function deferred() {
  /** @type {(value: unknown) => void} */
  let resolve;
  /** @type {(reason: unknown) => void} */
  let reject;
  const promise = new Promise(function (innerResolve, innerReject) {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

test("replaces superseded first-page responses", async function () {
  const first = deferred();
  const second = deferred();
  let calls = 0;
  let latest = null;
  const controller = new RewardHistoryController({
    fetchPage: function () {
      calls += 1;
      return calls === 1 ? first.promise : second.promise;
    },
    onChange: function (state) {
      latest = state;
    },
  });

  const firstLoad = controller.loadFirst();
  const secondLoad = controller.loadFirst();
  second.resolve({ entries: [{ id: "new" }], next_cursor: null });
  await secondLoad;
  first.resolve({ entries: [{ id: "stale" }], next_cursor: null });
  await firstLoad;

  assert.deepEqual(latest.entries, [{ id: "new" }]);
  assert.equal(latest.loading, false);
});

test("keeps prior rows when pagination fails and allows retry", async function () {
  let page = 0;
  let latest = null;
  const controller = new RewardHistoryController({
    fetchPage: async function () {
      page += 1;
      if (page === 1) {
        return { entries: [{ id: "first" }], next_cursor: "older" };
      }
      if (page === 2) {
        throw new Error("offline");
      }
      return { entries: [{ id: "older" }], next_cursor: null };
    },
    onChange: function (state) {
      latest = state;
    },
  });

  await controller.loadFirst();
  await controller.loadMore();
  assert.deepEqual(latest.entries, [{ id: "first" }]);
  assert.equal(latest.nextCursor, "older");
  assert.equal(latest.error.message, "offline");
  await controller.loadMore();
  assert.deepEqual(latest.entries, [{ id: "first" }, { id: "older" }]);
  assert.equal(latest.nextCursor, null);
});

test("retries a failed refresh from page one while retaining prior rows", async function () {
  const cursors = [];
  let latest = null;
  const controller = new RewardHistoryController({
    fetchPage: async function (cursor) {
      cursors.push(cursor);
      if (cursors.length === 1) {
        return { entries: [{ id: "old" }], next_cursor: "older" };
      }
      if (cursors.length === 2) {
        throw new Error("transport detail must stay internal");
      }
      return { entries: [{ id: "fresh" }], next_cursor: null };
    },
    onChange: function (state) {
      latest = state;
    },
  });

  await controller.loadFirst();
  await controller.loadFirst();
  assert.deepEqual(latest.entries, [{ id: "old" }]);
  assert.equal(latest.nextCursor, "older");
  assert.equal(latest.errorRequest, "first");

  await controller.loadFirst();
  assert.deepEqual(cursors, [null, null, null]);
  assert.deepEqual(latest.entries, [{ id: "fresh" }]);
  assert.equal(latest.error, null);
  assert.equal(latest.errorRequest, null);
});

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

test("viewer session cancels selection, close, merge, workspace teardown, and reopens cleanly", async function () {
  const pending = new Map();
  const states = new Map();
  const session = new ViewerRewardHistorySession();

  function controllerFor(viewerId) {
    const request = deferred();
    pending.set(viewerId, request);
    return new RewardHistoryController({
      fetchPage: function (_cursor, signal) {
        pending.get(viewerId).signal = signal;
        return request.promise;
      },
      onChange: function (state) {
        states.set(viewerId, state);
      },
    });
  }

  session.begin("alice", controllerFor("alice"));
  session.begin("bob", controllerFor("bob")); // selection change
  assert.equal(pending.get("alice").signal.aborted, true);
  session.cancel(); // close
  assert.equal(pending.get("bob").signal.aborted, true);

  session.begin("merge-survivor", controllerFor("merge-survivor"));
  session.cancel(); // merge invalidation
  assert.equal(pending.get("merge-survivor").signal.aborted, true);

  session.begin("workspace-viewer", controllerFor("workspace-viewer"));
  session.cancel(); // workspace teardown
  assert.equal(pending.get("workspace-viewer").signal.aborted, true);

  session.begin("reopened", controllerFor("reopened"));
  pending.get("alice").resolve({ entries: [{ id: "stale" }], next_cursor: null });
  pending.get("reopened").resolve({ entries: [{ id: "fresh" }], next_cursor: null });
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(states.get("reopened").entries, [{ id: "fresh" }]);
  assert.notDeepEqual(states.get("alice").entries, [{ id: "stale" }]);
});
