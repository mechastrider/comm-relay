import assert from "node:assert/strict";
import test from "node:test";

import {
  alertViewFromConfig,
  applyQueryStyleOverrides,
  defaultStyleForTheme,
  hexToRgba,
  leaderboardViewFromConfig,
  normalizeAlertImageSizePct,
  normalizeLeaderboardLayout,
  normalizePanelImageFit,
  normalizePanelImageScope,
  panelOpacityQueryValue,
  panelBackground,
  normalizePreviewBackground,
  overlayViewFromConfig,
  resolvePreset,
} from "./overlay-settings.js";

test("resolvePreset uses valid query id, then active preset, then first preset", function () {
  const overlay = {
    active_preset_id: "raid",
    presets: [
      { id: "default", name: "Default", theme: "default" },
      { id: "raid", name: "Raid", theme: "dashboard" },
    ],
  };
  assert.equal(resolvePreset(overlay, "raid").id, "raid");
  assert.equal(resolvePreset(overlay, "").id, "raid");
  assert.equal(resolvePreset(overlay, "missing").id, "raid");
  assert.equal(resolvePreset({ presets: overlay.presets }, "missing").id, "default");
});

test("defaultStyleForTheme keeps dashboard panel transparent", function () {
  const dashboard = defaultStyleForTheme("dashboard");
  assert.equal(dashboard.platform_marker, "icon");
  assert.equal(dashboard.panel_opacity, 0);
  assert.equal(dashboard.text_edge, "outline");
});

test("defaultStyleForTheme enables G-Rebels platform icon with rail", function () {
  const rebels = defaultStyleForTheme("g_rebels_popups");
  assert.equal(rebels.platform_marker, "both");
  assert.equal(rebels.panel_opacity, 0);
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

test("normalizePreviewBackground maps aliases and defaults to scene", function () {
  assert.equal(normalizePreviewBackground("white"), "white");
  assert.equal(normalizePreviewBackground("checker"), "checker");
  assert.equal(normalizePreviewBackground("scene"), "scene");
  assert.equal(normalizePreviewBackground("dark"), "dark");
  assert.equal(normalizePreviewBackground("busy"), "scene");
  assert.equal(normalizePreviewBackground("black"), "dark");
  assert.equal(normalizePreviewBackground("nope"), "scene");
  assert.equal(normalizePreviewBackground(""), "scene");
});

test("hexToRgba converts 3 and 6 digit colors", function () {
  assert.equal(hexToRgba("#000", 0.5), "rgba(0, 0, 0, 0.5)");
  assert.equal(hexToRgba("#ffffff", 1), "rgba(255, 255, 255, 1)");
});

test("overlayViewFromConfig honors theme query for Studio preview", function () {
  const view = overlayViewFromConfig(
    {
      overlay: {
        active_preset_id: "default",
        presets: [{ id: "default", theme: "default" }],
      },
    },
    new URLSearchParams("theme=cockpit_popups")
  );
  assert.equal(view.theme, "cockpit_popups");
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

test("surface views resolve independent opacity overrides with legacy fallback", function () {
  const config = {
    overlay: {
      active_preset_id: "default",
      presets: [{
        id: "default",
        theme: "default",
        style: { panel_opacity: 0.58 },
        surfaces: {
          chat: { panel_opacity: 0 },
          leaderboard: { panel_opacity: 0.35 },
          alerts: { panel_opacity: 1 },
        },
      }],
    },
  };
  assert.equal(overlayViewFromConfig(config, new URLSearchParams()).style.panel_opacity, 0);
  assert.equal(leaderboardViewFromConfig(config, new URLSearchParams()).style.panel_opacity, 0.35);
  assert.equal(alertViewFromConfig(config, new URLSearchParams()).style.panel_opacity, 1);

  config.overlay.presets[0].surfaces = {};
  assert.equal(overlayViewFromConfig(config, new URLSearchParams()).style.panel_opacity, 0.58);
  assert.equal(leaderboardViewFromConfig(config, new URLSearchParams()).style.panel_opacity, 0.58);
  assert.equal(alertViewFromConfig(config, new URLSearchParams()).style.panel_opacity, 0.58);
});

test("legacy cockpit glass exactly matches every baseline theme, surface, and leaderboard layout", function () {
  const legacyMappings = {
    cockpit_panel: {
      chat: "rgb(8 17 22 / 0.70)",
      alerts: "rgb(8 17 22 / 0.70)",
      leaderboard: { panel: "rgb(8 17 22 / 0.70)", chips: "rgb(4 13 17 / 0.76)" },
    },
    cockpit_popups: {
      chat: "rgb(4 13 17 / 0.76)",
      alerts: "rgb(4 13 17 / 0.76)",
      leaderboard: { panel: "rgb(8 17 22 / 0.70)", chips: "rgb(4 13 17 / 0.76)" },
    },
    g_rebels_popups: {
      chat: "rgb(5 6 4 / 0.78)",
      alerts: "rgb(5 6 4 / 0.78)",
      leaderboard: { panel: "rgb(5 6 4 / 0.78)", chips: "rgb(5 6 4 / 0.78)" },
    },
  };

  Object.entries(legacyMappings).forEach(function ([theme, expected]) {
    const preset = { id: "cockpit", theme, style: { panel_opacity: 0 }, surfaces: {} };
    const config = { overlay: { presets: [preset] } };
    [["chat", overlayViewFromConfig], ["alerts", alertViewFromConfig]].forEach(function ([surface, viewForSurface]) {
      const view = viewForSurface(config, new URLSearchParams());
      assert.equal(view.style.legacy_cockpit_glass, true);
      assert.equal(panelBackground(view.theme, view.style), expected[surface]);
    });
    ["panel", "chips"].forEach(function (layout) {
      preset.surfaces = { leaderboard: { layout } };
      const view = leaderboardViewFromConfig(config, new URLSearchParams());
      assert.equal(view.style.legacy_cockpit_glass, true);
      assert.equal(panelBackground(view.theme, view.style), expected.leaderboard[layout]);
    });

    preset.surfaces = { chat: { panel_opacity: 0 }, leaderboard: { panel_opacity: 0 }, alerts: { panel_opacity: 0 } };
    [overlayViewFromConfig, leaderboardViewFromConfig, alertViewFromConfig].forEach(function (viewForSurface) {
      const view = viewForSurface(config, new URLSearchParams());
      assert.equal(view.style.legacy_cockpit_glass, false);
      assert.equal(panelBackground(view.theme, view.style), "rgba(0, 0, 0, 0)");
    });
  });
});

test("surface views keep valid panel opacity query overrides", function () {
  const config = {
    overlay: {
      presets: [{
        id: "default",
        theme: "default",
        style: { panel_opacity: 0.58 },
        surfaces: { chat: { panel_opacity: 0.2 }, leaderboard: { panel_opacity: 0.7 }, alerts: { panel_opacity: 0.4 } },
      }],
    },
  };
  const query = new URLSearchParams("panel_opacity=0.9&theme=dashboard");
  assert.equal(overlayViewFromConfig(config, query).style.panel_opacity, 0.9);
  assert.equal(leaderboardViewFromConfig(config, query).style.panel_opacity, 0.9);
  assert.equal(alertViewFromConfig(config, query).style.panel_opacity, 0.9);

  const transparentQuery = new URLSearchParams("panel_opacity=0");
  assert.equal(overlayViewFromConfig(config, transparentQuery).style.panel_opacity, 0);
});

test("only valid panel opacity queries replace opacity or suppress legacy cockpit glass", function () {
  const config = {
    overlay: {
      presets: [{ id: "cockpit", theme: "cockpit_panel", style: { panel_opacity: 0 }, surfaces: {} }],
    },
  };
  const views = [
    ["chat", overlayViewFromConfig],
    ["alerts", alertViewFromConfig],
    ["leaderboard panel", leaderboardViewFromConfig],
    ["leaderboard chips", leaderboardViewFromConfig],
  ];
  const invalid = ["", "not-a-number", "0.5junk", "0x1", "-0.01", "1.01"];

  invalid.forEach(function (raw) {
    const query = new URLSearchParams("panel_opacity=" + encodeURIComponent(raw));
    assert.equal(panelOpacityQueryValue(query), null, raw);
    views.forEach(function ([surface, viewForSurface]) {
      const params = surface === "leaderboard chips"
        ? new URLSearchParams(query.toString() + "&layout=chips")
        : query;
      const view = viewForSurface(config, params);
      assert.equal(view.style.panel_opacity, 0, surface + " keeps its stored opacity for " + raw);
      assert.equal(view.style.legacy_cockpit_glass, true, surface + " keeps fallback glass for " + raw);
    });
  });

  const transparent = new URLSearchParams("panel_opacity=0");
  assert.equal(panelOpacityQueryValue(transparent), 0);
  views.forEach(function ([surface, viewForSurface]) {
    const params = surface === "leaderboard chips"
      ? new URLSearchParams("panel_opacity=0&layout=chips")
      : transparent;
    const view = viewForSurface(config, params);
    assert.equal(view.style.panel_opacity, 0, surface + " accepts explicit transparent opacity");
    assert.equal(view.style.legacy_cockpit_glass, false, surface + " disables legacy glass only for valid zero");
  });
});

test("normalizeLeaderboardLayout defaults invalid values to panel", function () {
  assert.equal(normalizeLeaderboardLayout("chips"), "chips");
  assert.equal(normalizeLeaderboardLayout("panel"), "panel");
  assert.equal(normalizeLeaderboardLayout("grid"), "panel");
  assert.equal(normalizeLeaderboardLayout(""), "panel");
});

test("leaderboardViewFromConfig inherits font and defaults layout to panel", function () {
  const view = leaderboardViewFromConfig(
    {
      overlay: {
        active_preset_id: "default",
        presets: [{ id: "default", theme: "cockpit_popups", font_size_px: 18 }],
      },
    },
    new URLSearchParams("")
  );
  assert.equal(view.theme, "cockpit_popups");
  assert.equal(view.font_size_px, 18);
  assert.equal(view.layout, "panel");
});

test("leaderboardViewFromConfig uses surface overrides and valid query", function () {
  const view = leaderboardViewFromConfig(
    {
      overlay: {
        active_preset_id: "default",
        presets: [
          {
            id: "raid",
            theme: "default",
            font_size_px: 18,
            surfaces: { leaderboard: { font_size_px: 14, layout: "chips" } },
          },
        ],
      },
    },
    new URLSearchParams("preset=raid&theme=cockpit_panel&font_size_px=16&layout=panel")
  );
  assert.equal(view.theme, "cockpit_panel");
  assert.equal(view.font_size_px, 16);
  assert.equal(view.layout, "panel");
});

test("leaderboardViewFromConfig ignores invalid theme and layout query", function () {
  const view = leaderboardViewFromConfig(
    {
      overlay: {
        presets: [
          {
            id: "default",
            theme: "dashboard",
            font_size_px: 20,
            surfaces: { leaderboard: { layout: "chips" } },
          },
        ],
      },
    },
    new URLSearchParams("theme=not-a-theme&layout=grid&font_size_px=8")
  );
  assert.equal(view.theme, "dashboard");
  assert.equal(view.layout, "chips");
  assert.equal(view.font_size_px, 20);
});

test("alertViewFromConfig resolves preset alert image size and query override", function () {
  const view = alertViewFromConfig(
    {
      overlay: {
        active_preset_id: "default",
        presets: [
          {
            id: "default",
            theme: "cockpit_popups",
            font_size_px: 18,
            surfaces: { alerts: { image_size_pct: 150 } },
          },
        ],
      },
    },
    new URLSearchParams("")
  );
  assert.equal(view.image_size_pct, 150);

  const queried = alertViewFromConfig(
    {
      overlay: {
        active_preset_id: "default",
        presets: [{ id: "default", theme: "default", font_size_px: 18 }],
      },
    },
    new URLSearchParams("image_size_pct=200")
  );
  assert.equal(queried.image_size_pct, 200);
});

test("normalizeAlertImageSizePct defaults invalid values to 100", function () {
  assert.equal(normalizeAlertImageSizePct(""), 100);
  assert.equal(normalizeAlertImageSizePct(180), 180);
  assert.equal(normalizeAlertImageSizePct(999), 300);
});
