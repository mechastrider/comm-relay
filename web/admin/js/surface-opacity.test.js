import assert from "node:assert/strict";
import test from "node:test";

import {
  effectiveSurfaceOpacity,
  isPanelOpacityDraft,
  parsePanelOpacity,
  previewSurfacePanelOpacity,
  withAlertsAppearance,
  withLeaderboardAppearance,
  withSurfacePanelOpacity,
} from "./surface-opacity.js";

test("surface opacity uses the shared value until a surface stores an override", function () {
  assert.equal(effectiveSurfaceOpacity({}, "chat", 0.58), 0.58);
  assert.equal(effectiveSurfaceOpacity({ chat: { panel_opacity: 0 } }, "chat", 0.58), 0);
  assert.equal(effectiveSurfaceOpacity({ alerts: { panel_opacity: 1 } }, "alerts", 0.58), 1);
});

test("untouched legacy cockpit previews omit opacity until a surface stores an explicit value", function () {
  const preset = { theme: "cockpit_panel", style: { panel_opacity: 0 }, surfaces: {} };
  assert.equal(previewSurfacePanelOpacity(preset, "chat", 0), undefined);
  preset.surfaces.chat = { panel_opacity: 0 };
  assert.equal(previewSurfacePanelOpacity(preset, "chat", 0), 0);
});

test("blank and out-of-range opacity drafts remain invalid until corrected", function () {
  assert.equal(isPanelOpacityDraft(""), false);
  assert.equal(isPanelOpacityDraft("-0.01"), false);
  assert.equal(isPanelOpacityDraft("1.01"), false);
  assert.equal(isPanelOpacityDraft("0"), true);
  assert.equal(isPanelOpacityDraft("0.35"), true);
  assert.equal(isPanelOpacityDraft("1"), true);
});

test("opacity parser accepts complete decimal exponent values consistently", function () {
  assert.equal(parsePanelOpacity("1e-1"), 0.1);
  assert.equal(isPanelOpacityDraft("1e-1"), true);
  assert.equal(parsePanelOpacity("1e"), null);
  assert.equal(parsePanelOpacity("0.1px"), null);
  assert.equal(parsePanelOpacity("0x1"), null);
});

test("surface opacity editing changes only the selected surface and retains all overrides", function () {
  const initial = {
    chat: { panel_opacity: 0.2 },
    leaderboard: { panel_opacity: 0.65, layout: "chips" },
    alerts: { panel_opacity: 0.4 },
  };
  const next = withSurfacePanelOpacity(initial, "leaderboard", 0.35);
  assert.deepEqual(next, {
    chat: { panel_opacity: 0.2 },
    leaderboard: { panel_opacity: 0.35, layout: "chips" },
    alerts: { panel_opacity: 0.4 },
  });
  assert.deepEqual(initial, {
    chat: { panel_opacity: 0.2 },
    leaderboard: { panel_opacity: 0.65, layout: "chips" },
    alerts: { panel_opacity: 0.4 },
  });
});

test("surface switching reads each draft value and a no-edit publish retains legacy fallback", function () {
  const legacy = {};
  assert.equal(effectiveSurfaceOpacity(legacy, "chat", 0.58), 0.58);
  assert.equal(effectiveSurfaceOpacity(legacy, "leaderboard", 0.58), 0.58);
  assert.equal(effectiveSurfaceOpacity(legacy, "alerts", 0.58), 0.58);

  const draft = withSurfacePanelOpacity({ chat: { panel_opacity: 0.2 } }, "alerts", 0.4);
  assert.equal(effectiveSurfaceOpacity(draft, "chat", 0.58), 0.2);
  assert.equal(effectiveSurfaceOpacity(draft, "leaderboard", 0.58), 0.58);
  assert.equal(effectiveSurfaceOpacity(draft, "alerts", 0.58), 0.4);
});

test("selected Studio preview queries use that surface draft opacity with legacy fallback", function () {
  const preset = {
    style: { panel_opacity: 0.58 },
    surfaces: {
      chat: { panel_opacity: 0.2 },
      leaderboard: { panel_opacity: 0.65 },
      alerts: { panel_opacity: 0.4 },
    },
  };
  assert.equal(previewSurfacePanelOpacity(preset, "chat", 0.58), 0.2);
  assert.equal(previewSurfacePanelOpacity(preset, "leaderboard", 0.58), 0.65);
  assert.equal(previewSurfacePanelOpacity(preset, "alerts", 0.58), 0.4);
  assert.equal(previewSurfacePanelOpacity({ style: { panel_opacity: 0.35 }, surfaces: {} }, "alerts", 0.58), 0.35);
});

test("leaderboard chips to panel clears the stored layout without losing opacity", function () {
  const initial = {
    chat: { panel_opacity: 0.2 },
    leaderboard: { layout: "chips", panel_opacity: 0.65 },
    alerts: { panel_opacity: 0.4 },
  };

  const next = withLeaderboardAppearance(initial, 14, 18, "panel", "", 5);

  assert.deepEqual(next, {
    chat: { panel_opacity: 0.2 },
    leaderboard: { font_size_px: 14, panel_opacity: 0.65 },
    alerts: { panel_opacity: 0.4 },
  });
  assert.equal(initial.leaderboard.layout, "chips");
});

test("leaderboard custom font to inherited clears the stored font without losing opacity", function () {
  const initial = {
    chat: { panel_opacity: 0 },
    leaderboard: { font_size_px: 14, layout: "chips", panel_opacity: 0.65 },
    alerts: { panel_opacity: 1 },
  };

  const next = withLeaderboardAppearance(initial, 18, 18, "chips", "", 5);

  assert.deepEqual(next, {
    chat: { panel_opacity: 0 },
    leaderboard: { layout: "chips", panel_opacity: 0.65 },
    alerts: { panel_opacity: 1 },
  });
  assert.equal(initial.leaderboard.font_size_px, 14);
});

test("withAlertsAppearance stores only non-default image size", function () {
  const initial = {
    chat: { panel_opacity: 0.2 },
    alerts: { panel_opacity: 0.4, image_size_pct: 180 },
  };

  const next = withAlertsAppearance(initial, 100, 18, 18);

  assert.deepEqual(next, {
    chat: { panel_opacity: 0.2 },
    alerts: { panel_opacity: 0.4 },
  });

  const enlarged = withAlertsAppearance(initial, 200, 18, 18);
  assert.equal(enlarged.alerts.image_size_pct, 200);
  assert.equal(enlarged.alerts.panel_opacity, 0.4);
});

test("withAlertsAppearance stores only non-default font size", function () {
  const initial = { alerts: { image_size_pct: 150 } };
  const next = withAlertsAppearance(initial, 150, 24, 18);
  assert.equal(next.alerts.font_size_px, 24);
  const inherited = withAlertsAppearance(initial, 150, 18, 18);
  assert.equal(inherited.alerts.font_size_px, undefined);
});
