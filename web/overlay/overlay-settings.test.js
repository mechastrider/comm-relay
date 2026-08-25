import assert from "node:assert/strict";
import test from "node:test";

import {
  applyQueryStyleOverrides,
  defaultStyleForTheme,
  hexToRgba,
  normalizePanelImageFit,
  normalizePanelImageScope,
  overlayViewFromConfig,
  resolvePreset,
} from "./overlay-settings.js";

test("resolvePreset uses query id before active preset", function () {
  const overlay = {
    active_preset_id: "default",
    presets: [
      { id: "default", name: "Default", theme: "default" },
      { id: "raid", name: "Raid", theme: "dashboard" },
    ],
  };
  assert.equal(resolvePreset(overlay, "raid").id, "raid");
  assert.equal(resolvePreset(overlay, "").id, "default");
  assert.equal(resolvePreset(overlay, "missing").id, "default");
});

test("defaultStyleForTheme keeps dashboard panel transparent", function () {
  const dashboard = defaultStyleForTheme("dashboard");
  assert.equal(dashboard.platform_marker, "icon");
  assert.equal(dashboard.panel_opacity, 0);
  assert.equal(dashboard.text_edge, "outline");
});

test("applyQueryStyleOverrides replaces unsaved tokens", function () {
  const style = applyQueryStyleOverrides(
    defaultStyleForTheme("default"),
    new URLSearchParams("text_edge=outline&platform_marker=none")
  );
  assert.equal(style.text_edge, "outline");
  assert.equal(style.platform_marker, "none");
});

test("applyQueryStyleOverrides applies panel image fit and scope", function () {
  const style = applyQueryStyleOverrides(
    defaultStyleForTheme("default"),
    new URLSearchParams("panel_image_fit=contain&panel_image_scope=column")
  );
  assert.equal(style.panel_image_fit, "contain");
  assert.equal(style.panel_image_scope, "column");
});

test("normalizePanelImageFit defaults invalid values to cover", function () {
  assert.equal(normalizePanelImageFit("tile"), "tile");
  assert.equal(normalizePanelImageFit("stretch"), "cover");
});

test("normalizePanelImageScope uses column only on default theme", function () {
  assert.equal(normalizePanelImageScope("column", "default"), "column");
  assert.equal(normalizePanelImageScope("column", "dashboard"), "message");
  assert.equal(normalizePanelImageScope("message", "default"), "message");
});

test("defaultStyleForTheme includes panel image defaults", function () {
  const style = defaultStyleForTheme("default");
  assert.equal(style.panel_image_fit, "cover");
  assert.equal(style.panel_image_scope, "message");
});

test("hexToRgba converts 3 and 6 digit colors", function () {
  assert.equal(hexToRgba("#000", 0.5), "rgba(0, 0, 0, 0.5)");
  assert.equal(hexToRgba("#ffffff", 1), "rgba(255, 255, 255, 1)");
});

test("overlayViewFromConfig uses query preset", function () {
  const view = overlayViewFromConfig(
    {
      overlay: {
        active_preset_id: "default",
        presets: [
          { id: "default", theme: "default", max_messages: 10 },
          { id: "raid", theme: "dashboard", max_messages: 8, display_mode: "compact" },
        ],
      },
    },
    new URLSearchParams("preset=raid")
  );
  assert.equal(view.theme, "dashboard");
  assert.equal(view.max_messages, 8);
  assert.equal(view.display_mode, "compact");
  assert.equal(view.style.platform_marker, "icon");
});
