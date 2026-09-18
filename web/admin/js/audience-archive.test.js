import test from "node:test";
import assert from "node:assert/strict";
import { archiveDownloadVisible, archiveViewMode } from "./audience-archive-core.js";

test("archive download is hidden without a stored snapshot", function () {
  assert.equal(
    archiveDownloadVisible({
      id: "s1",
      started_at: "2026-09-01T12:00:00Z",
      has_recap: false,
      totals: { viewer_count: 1, message_count: 2, xp: 3 },
      snapshot: null,
    }),
    false
  );
  assert.equal(
    archiveDownloadVisible({
      id: "s2",
      started_at: "2026-09-01T12:00:00Z",
      has_recap: true,
      totals: { viewer_count: 1, message_count: 2, xp: 3 },
      snapshot: {
        session_id: "s2",
        captured_at: "2026-09-01T13:00:00Z",
        totals: { viewer_count: 1, message_count: 2, xp: 3 },
        ranking: [],
        achievement_groups: [],
      },
    }),
    true
  );
});

test("archiveViewMode distinguishes empty list from detail", function () {
  assert.equal(archiveViewMode({ listLoaded: true, sessions: [] }), "empty");
  assert.equal(archiveViewMode({ listLoaded: true, sessions: [{ id: "a" }] }), "list");
  assert.equal(archiveViewMode({ selectedDetail: { detail: {} } }), "detail");
});
