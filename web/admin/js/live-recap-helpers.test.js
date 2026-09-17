import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRecapHideBody,
  buildRecapHistoryURL,
  buildRecapSessionURL,
  buildRecapShowAllBody,
  buildRecapShowBody,
  canDownloadRecapImage,
  isHiddenRecapStateFrame,
  isCurrentRecapStateFrame,
  isAllTimeRecapStateFrame,
  recapDisplayData,
  recapDownloadFilename,
  recapDownloadPresentation,
  recapStateFrameApplies,
  RECAP_WINDOW_ALL,
  RECAP_WINDOW_SESSION,
} from "./live-recap-helpers.js";

test("recap API helpers keep bodies exact and cursor opaque", function () {
  assert.deepEqual(buildRecapShowBody("session one"), { session_id: "session one" });
  assert.deepEqual(buildRecapShowAllBody(), {});
  assert.deepEqual(buildRecapHideBody(), {});
  assert.equal(buildRecapHistoryURL(null), "/api/sessions?limit=20");
  assert.equal(buildRecapHistoryURL("a+/="), "/api/sessions?limit=20&cursor=a%2B%2F%3D");
  assert.equal(buildRecapSessionURL("id/?"), "/api/sessions/get?id=id%2F%3F");
});

test("recap display data keeps a missing historical snapshot distinct from session totals", function () {
  const detail = recapDisplayData({
    id: "old",
    started_at: "2026-09-01T12:00:00Z",
    has_recap: false,
    totals: { viewer_count: 2, message_count: 3, xp: 4 },
    snapshot: null,
  });
  assert.deepEqual(detail.snapshot, null);
  assert.deepEqual(detail.totals, { viewer_count: 2, message_count: 3, xp: 4 });
});

test("recap websocket state only applies to the displayed current session", function () {
  assert.equal(isCurrentRecapStateFrame({ type: "stream_recap_state", window: "session", snapshot: { session_id: "now" } }, "now"), true);
  assert.equal(isCurrentRecapStateFrame({ type: "stream_recap_state", window: "all", snapshot: { session_id: "now" } }, "now"), false);
  assert.equal(isCurrentRecapStateFrame({ type: "stream_recap_state", snapshot: { session_id: "old" } }, "now"), false);
  assert.equal(isCurrentRecapStateFrame({ type: "stream_recap_state", visible: false, snapshot: null }, "now"), false);
  assert.equal(isAllTimeRecapStateFrame({ type: "stream_recap_state", visible: true, window: "all", snapshot: null }), true);
  assert.equal(recapStateFrameApplies({ type: "stream_recap_state", visible: true, window: "all", snapshot: null }, "now"), true);
  assert.equal(recapStateFrameApplies({ type: "stream_recap_state", visible: true, window: "session", snapshot: { session_id: "old" } }, "now"), false);
  assert.equal(isHiddenRecapStateFrame({ type: "stream_recap_state", visible: false, snapshot: null }), true);
  assert.equal(isHiddenRecapStateFrame({ type: "stream_recap_state", visible: true, snapshot: null }), false);
  assert.equal(isHiddenRecapStateFrame({ type: "stream_recap_state", visible: false, snapshot: { session_id: "old" } }), false);
});

test("download helpers gate session capture and allow all-time cards", function () {
  assert.equal(canDownloadRecapImage({ dialogWindow: RECAP_WINDOW_SESSION, snapshot: null, allTime: {} }), false);
  assert.equal(canDownloadRecapImage({ dialogWindow: RECAP_WINDOW_SESSION, snapshot: { id: "x" }, allTime: {} }), true);
  assert.equal(canDownloadRecapImage({ dialogWindow: RECAP_WINDOW_ALL, snapshot: null, allTime: { totals: { viewer_count: 0, message_count: 0, xp: 0 }, ranking: [] } }), true);
  assert.equal(recapDownloadFilename(RECAP_WINDOW_SESSION), "comm-relay-recap-session.png");
  assert.equal(recapDownloadFilename(RECAP_WINDOW_ALL), "comm-relay-recap-all.png");
  const presentation = recapDownloadPresentation({ snapshot: { id: "cap", session_id: "s", totals: { viewer_count: 1, message_count: 2, xp: 3 }, ranking: [], achievement_groups: [] } }, RECAP_WINDOW_SESSION);
  assert.equal(presentation.snapshot.id, "cap");
});
