import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const preview = readFileSync(new URL("./overlay-preview.js", import.meta.url), "utf8");
const appearance = readFileSync(new URL("./overlay-appearance.js", import.meta.url), "utf8");
const studio = readFileSync(new URL("./studio.js", import.meta.url), "utf8");
const shell = readFileSync(new URL("./ui-shell.js", import.meta.url), "utf8");

test("recap Studio preview is sample-only and carries the appearance draft", function () {
  assert.match(preview, /surface === "recap"\s*\? "\/overlay\/recap"/);
  assert.match(preview, /surface === "leaderboard" \|\| surface === "alerts" \|\| surface === "recap" \? "sample"/);
  assert.match(preview, /surface !== "alerts" && surface !== "recap"/);
  assert.match(appearance, /\["chat", "leaderboard", "alerts", "recap"\]/);
  assert.match(appearance, /recapDefaultPanelOpacity/);
  assert.match(preview, /surface === "recap"[\s\S]*?searchParams\.set\("locale", getLocale\(\)\)/);
});

test("recap validation errors select and focus the shared opacity editor", function () {
  assert.match(shell, /overlay_preset_\\d\+_surfaces_recap_panel_opacity/);
  assert.match(studio, /applyPreviewSurface\("recap"\)/);
});
