import assert from "node:assert/strict";
import test from "node:test";

import { collectPanelOpacityOverrides, resetPanelOpacityDraft } from "./overlay-appearance-state.js";
import { recapDefaultPanelOpacity } from "../../overlay/overlay-settings.js";

test("an omitted recap opacity stays omitted when selecting, previewing, and publishing unrelated edits", function () {
  const original = { leaderboard: { layout: "chips" } };
  const afterSelectingRecap = collectPanelOpacityOverrides(original, {
    surface: "recap",
    value: String(recapDefaultPanelOpacity("cockpit_panel")),
    touched: false,
    drafts: {},
  });
  const afterPublishing = collectPanelOpacityOverrides(afterSelectingRecap, {
    surface: "chat",
    value: "0.58",
    touched: false,
    drafts: {},
  });

  assert.deepEqual(afterPublishing, original);
  assert.equal(afterPublishing.recap, undefined);
});

test("an explicit recap opacity of zero persists through a preset round trip", function () {
  const stored = collectPanelOpacityOverrides({}, {
    surface: "recap",
    value: "0",
    touched: true,
    drafts: {},
  });
  const roundTripped = collectPanelOpacityOverrides(stored, {
    surface: "chat",
    value: "0.58",
    touched: false,
    drafts: {},
  });

  assert.equal(stored.recap.panel_opacity, 0);
  assert.equal(roundTripped.recap.panel_opacity, 0);
});

test("an omitted recap opacity remains theme-derived after the theme changes", function () {
  const untouched = collectPanelOpacityOverrides({}, {
    surface: "recap",
    value: String(recapDefaultPanelOpacity("default")),
    touched: false,
    drafts: {},
  });

  assert.equal(untouched.recap, undefined);
  assert.notEqual(recapDefaultPanelOpacity("default"), recapDefaultPanelOpacity("cockpit_panel"));
});

test("reset explicitly materializes the selected recap theme default", function () {
  const opacity = recapDefaultPanelOpacity("cockpit_panel");
  const drafts = resetPanelOpacityDraft({}, "recap", opacity);
  const reset = collectPanelOpacityOverrides({}, {
    surface: "recap",
    value: drafts.recap,
    touched: true,
    drafts,
  });

  assert.deepEqual(drafts, { recap: String(opacity) });
  assert.equal(reset.recap.panel_opacity, opacity);
});
