import assert from "node:assert/strict";
import test from "node:test";

import {
  conditionalFieldNeedsOwnerFocus,
  leaderboardPreviewQuery,
  normalizeLeaderboardSurfaceOverride,
  resolveLeaderboardFormValues,
  withLeaderboardPresentation,
} from "./leaderboard-presentation.js";

test("legacy leaderboard fields resolve without materializing modes", function () {
  const raw = { font_size_px: 14, title: "  Топ эфира  " };
  assert.deepEqual(resolveLeaderboardFormValues(raw, 18), {
    sizing_mode: "fixed",
    font_size_px: 14,
    layout: "panel",
    title_mode: "custom",
    title: "Топ эфира",
    show_message_count: false,
    max_entries: 5,
  });
  assert.deepEqual(normalizeLeaderboardSurfaceOverride(raw), {
    font_size_px: 14,
    title: "Топ эфира",
  });
});

test("preview query carries automatic and fixed draft state without forcing auto to fixed", function () {
  assert.deepEqual(leaderboardPreviewQuery({
    sizing_mode: "auto",
    font_size_px: 18,
    title_mode: "custom",
    title: "Топ",
    show_message_count: true,
    max_entries: 8,
  }), {
    sizing_mode: "auto",
    font_size_px: undefined,
    base_font_size_px: "18",
    title_mode: "custom",
    title: "Топ",
    show_message_count: "1",
    limit: "8",
  });
  assert.equal(leaderboardPreviewQuery({ sizing_mode: "fixed", font_size_px: 16 }).font_size_px, "16");
});

test("untouched legacy presentation survives draft collection", function () {
  const initial = { leaderboard: { font_size_px: 14, title: "Legacy" } };
  const next = withLeaderboardPresentation(initial, resolveLeaderboardFormValues(initial.leaderboard, 18), {});
  assert.deepEqual(next, initial);
});

test("explicit control edits store only meaningful presentation overrides", function () {
  const fixed = withLeaderboardPresentation(
    { leaderboard: { font_size_px: 14, title: "Legacy" } },
    { sizing_mode: "auto", font_size_px: 14, layout: "panel", title_mode: "hidden", title: "Legacy", show_message_count: true, max_entries: 8 },
    { sizing: true, title: true, messages: true, maxEntries: true }
  );
  assert.deepEqual(fixed, {
    leaderboard: { title_mode: "hidden", show_message_count: true, max_entries: 8 },
  });
});

test("conditional fields return focus to their owning choice", function () {
  const active = {};
  assert.equal(conditionalFieldNeedsOwnerFocus(active, { contains: (value) => value === active }), true);
  assert.equal(conditionalFieldNeedsOwnerFocus({}, { contains: () => false }), false);
});
