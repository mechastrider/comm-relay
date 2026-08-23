import assert from "node:assert/strict";
import test from "node:test";

import {
  applyQueryStyleOverrides,
  defaultStyleForTheme,
  findPerson,
  hexToRgba,
  messageHasHighlight,
  overlayViewFromConfig,
  resolvePreset,
  splitHighlightedText,
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

test("splitHighlightedText matches whole words case-insensitively", function () {
  const parts = splitHighlightedText("Raid time raid!", ["RAID"]);
  const hits = parts.filter(function (part) {
    return part.hit;
  });
  assert.equal(hits.length, 2);
  assert.equal(hits[0].text, "Raid");
  assert.equal(hits[1].text, "raid");
  assert.equal(messageHasHighlight("raiding now", ["raid"], true), false);
  assert.equal(messageHasHighlight("привет raid", ["raid"], true), true);
  assert.equal(messageHasHighlight("raid", ["raid"], false), false);
});

test("findPerson matches username or display name case-insensitively", function () {
  const people = [
    {
      id: "p1",
      label: "Vasya",
      identities: [
        { platform: "twitch", username: "vasya_ttv" },
        { platform: "youtube", username: "VasyaPlays" },
      ],
    },
  ];
  assert.equal(findPerson(people, "twitch", "Vasya_TTV", "Other").label, "Vasya");
  assert.equal(findPerson(people, "youtube", "channel", "VasyaPlays").label, "Vasya");
  assert.equal(findPerson(people, "vk", "vasya_ttv", "VasyaPlays"), null);
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

test("hexToRgba converts 3 and 6 digit colors", function () {
  assert.equal(hexToRgba("#000", 0.5), "rgba(0, 0, 0, 0.5)");
  assert.equal(hexToRgba("#ffffff", 1), "rgba(255, 255, 255, 1)");
});

test("overlayViewFromConfig uses query preset and keeps global highlights", function () {
  const view = overlayViewFromConfig(
    {
      overlay: {
        active_preset_id: "default",
        presets: [
          { id: "default", theme: "default", max_messages: 10 },
          { id: "raid", theme: "dashboard", max_messages: 8, display_mode: "compact" },
        ],
        highlights: { enabled: true, words: ["raid"] },
        people: [{ id: "p1", label: "Vasya", identities: [{ platform: "twitch", username: "vasya" }] }],
      },
    },
    new URLSearchParams("preset=raid")
  );
  assert.equal(view.theme, "dashboard");
  assert.equal(view.max_messages, 8);
  assert.equal(view.display_mode, "compact");
  assert.equal(view.style.platform_marker, "icon");
  assert.equal(view.highlights.words[0], "raid");
  assert.equal(view.people[0].label, "Vasya");
});
