import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = { location: new URL("http://localhost/overlay/recap") };
const { SAMPLE_RECAP, normalizeRecapSnapshot, recapContentLayout, visibleRecapFromFrame } = await import("./recap-model.js");

test("recap model bounds hostile data and keeps authored strings as plain values", function () {
  const snapshot = normalizeRecapSnapshot({
    id: "one", session_id: "session", totals: { viewer_count: 3.8, message_count: -1, xp: 4 },
    ranking: Array.from({ length: 7 }, function (_, index) { return { rank: index + 1, display_name: "<img onerror=1>", portrait_url: "javascript:bad", xp: -3, message_count: 4 }; }),
    achievement_groups: Array.from({ length: 8 }, function () { return { viewer_display_name: "<script>", viewer_portrait_url: "file:///secret", name: "<b>safe</b>", description: "<i>literal</i>", count: 0 }; }),
  });
  assert.equal(snapshot.totals.viewer_count, 3);
  assert.equal(snapshot.totals.message_count, 0);
  assert.equal(snapshot.ranking.length, 5);
  assert.equal(snapshot.ranking[0].display_name, "<img onerror=1>");
  assert.equal(snapshot.ranking[0].portrait_url, "");
  assert.equal(snapshot.achievement_groups.length, 6);
  assert.equal(snapshot.achievement_groups[0].viewer_portrait_url, "");
  assert.equal(snapshot.achievement_groups[0].count, 1);
});

test("recap state accepts only stream recap frames and hides exactly", function () {
  assert.equal(visibleRecapFromFrame({ type: "leaderboard" }), undefined);
  assert.equal(visibleRecapFromFrame({ type: "stream_recap_state", visible: false, snapshot: SAMPLE_RECAP }), null);
  const visible = visibleRecapFromFrame({ type: "stream_recap_state", visible: true, snapshot: SAMPLE_RECAP });
  assert.equal(visible.id, "sample-recap");
  assert.equal(visible.ranking.length, 5);
});

test("recap composition expands a sole populated section", function () {
  assert.equal(recapContentLayout({ ranking: [{}], achievement_groups: [] }), "single");
  assert.equal(recapContentLayout({ ranking: [], achievement_groups: [{}] }), "single");
  assert.equal(recapContentLayout({ ranking: [{}], achievement_groups: [{}] }), "split");
  assert.equal(recapContentLayout({ ranking: [], achievement_groups: [] }), "empty");
});
