import assert from "node:assert/strict";
import test from "node:test";
import { LOCALE_ENGLISH, LOCALE_RUSSIAN, setLocale, t } from "../shared/i18n.js";

globalThis.window = { location: new URL("http://localhost/overlay/recap") };
const {
  RECAP_WINDOW_ALL,
  RECAP_WINDOW_SESSION,
  SAMPLE_RECAP,
  normalizeRecapSnapshot,
  recapContentLayout,
  visibleRecapFromFrame,
} = await import("./recap-model.js");

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
  const visible = visibleRecapFromFrame({ type: "stream_recap_state", visible: true, window: "session", snapshot: SAMPLE_RECAP });
  assert.equal(visible.window, RECAP_WINDOW_SESSION);
  assert.equal(visible.snapshot.id, "sample-recap");
  assert.equal(visible.snapshot.ranking.length, 5);
  assert.equal(visibleRecapFromFrame({ type: "stream_recap_state", visible: true, window: "season" }), undefined);
});

test("all-time recap frames render without achievements", function () {
  const frame = {
    type: "stream_recap_state",
    visible: true,
    window: "all",
    snapshot: null,
    all_time: {
      generated_at: "2026-09-01T12:00:00Z",
      totals: { viewer_count: 2, message_count: 3, xp: 4 },
      ranking: [{ rank: 1, display_name: "Scout", xp: 4, message_count: 3 }],
    },
  };
  const visible = visibleRecapFromFrame(frame);
  assert.equal(visible.window, RECAP_WINDOW_ALL);
  assert.equal(visible.snapshot.achievement_groups.length, 0);
  assert.equal(recapContentLayout(visible.snapshot, RECAP_WINDOW_ALL), "single");
  assert.equal(visibleRecapFromFrame({ type: "stream_recap_state", visible: false, window: "all", all_time: frame.all_time }), null);
});

test("recap composition expands a sole populated section", function () {
  assert.equal(recapContentLayout({ ranking: [{}], achievement_groups: [] }), "single");
  assert.equal(recapContentLayout({ ranking: [], achievement_groups: [{}] }), "single");
  assert.equal(recapContentLayout({ ranking: [{}], achievement_groups: [{}] }), "split");
  assert.equal(recapContentLayout({ ranking: [], achievement_groups: [] }), "empty");
  assert.equal(recapContentLayout({ ranking: [], achievement_groups: [{ name: "x" }] }, RECAP_WINDOW_ALL), "empty");
});

test("recap overlay labels are complete in Russian and English", function () {
  setLocale(LOCALE_RUSSIAN);
  assert.equal(t("recap.overlayTitle"), "Итоги стрима");
  assert.equal(t("recap.overlayTopViewers"), "Лучшие зрители");
  assert.equal(t("recap.overlayMessageCount", { count: 12 }), "12 сообщ.");

  setLocale(LOCALE_ENGLISH);
  assert.equal(t("recap.overlayTitle"), "Stream recap");
  assert.equal(t("recap.overlayAchievements"), "Achievements");
  assert.equal(t("recap.overlayMessageCount", { count: 12 }), "12 messages");
});
