import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const markup = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/components.css", import.meta.url), "utf8");
const formStyles = readFileSync(new URL("../styles/forms.css", import.meta.url), "utf8");
const dialogFrameStyles = readFileSync(new URL("../styles/dialog-frame.css", import.meta.url), "utf8");
const appearance = readFileSync(new URL("./overlay-appearance.js", import.meta.url), "utf8");
const obsSetup = readFileSync(new URL("./obs-setup.js", import.meta.url), "utf8");
const copyFeedback = readFileSync(new URL("./obs-copy-feedback.js", import.meta.url), "utf8");

test("familiar contextual actions use accessible inline icon controls", function () {
  [
    "refresh-messages",
    "refresh-leaderboard",
    "refresh-statistics",
    "refresh-viewers",
    "settings-diagnostics-refresh",
    "overlay-preview-replay",
    "overlay-debug-replay",
    "overlay-debug-stable-copy",
    "overlay-debug-snapshot-copy",
    "overlay-preset-add",
    "overlay-preset-rename",
    "overlay-preset-duplicate",
    "overlay-preset-delete",
  ].forEach(function (id) {
    const element = markup.match(new RegExp(`<button id="${id}"[\\s\\S]*?<\\/button>`));
    assert.ok(element, `${id} must exist`);
    assert.match(element[0], /class="[^"]*\bicon-btn\b[^"]*\bhas-tooltip\b/);
    assert.match(element[0], /data-i18n-aria-label=/);
    assert.match(element[0], /<svg class="icon-btn__icon"[\s\S]*?stroke="currentColor"/);
    assert.match(element[0], /<span class="ui-tooltip" role="tooltip"/);
  });
  assert.match(styles, /\.icon-btn:focus-visible\s*\{[\s\S]*?outline:/);
  assert.match(obsSetup, /function makeCopyIconButton/);
  assert.match(obsSetup, /document\.createElementNS\("http:\/\/www\.w3\.org\/2000\/svg", "svg"\)/);
  assert.match(obsSetup, /button\.replaceChildren\(icon, tooltip\)/);
  assert.match(obsSetup, /data-i18n-aria-label", "obs\.copyUrl"/);
});

test("copy feedback resets to the active locale instead of the locale that created the icon", function () {
  assert.match(copyFeedback, /translate\("obs\.copyUrl"\)/);
  assert.match(obsSetup, /setCopyButtonLabel\(state\.obsCopyFeedbackButton, localizedCopyLabel\(t\)\)/);
  assert.doesNotMatch(obsSetup, /dataset\.copyDefaultText \|\| t\("obs\.copyUrl"\)/);
});

test("preset actions stay visible as accessible icons without an overflow substitute", function () {
  const group = markup.match(/<div id="preset-island-icon-actions"[\s\S]*?<\/div>/);
  assert.ok(group, "preset action group must exist");
  assert.doesNotMatch(group[0], /\shidden(?:\s|>)/);
  assert.doesNotMatch(group[0], /data-studio-all-only/);
  assert.doesNotMatch(markup, /id="preset-island-overflow"/);
  assert.doesNotMatch(appearance, /presetIslandIconActions\.hidden|presetOverflow/);
  assert.match(markup, /id="overlay-preset-delete"[^>]*class="icon-btn btn-danger has-tooltip"/);
  assert.match(dialogFrameStyles, /@container preset-island[\s\S]*?\.preset-island__toolbar\s*\{[\s\S]*?flex-wrap:\s*wrap/);
});

test("shared action buttons use raised and pressed states without flattening overrides", function () {
  assert.match(styles, /\.btn-physical,[\s\S]*?box-shadow:[\s\S]*?0 1px 2px/);
  assert.match(styles, /\.btn-physical:active:not\(:disabled\),[\s\S]*?box-shadow:[\s\S]*?inset 0 1px 3px/);
  assert.match(styles, /\.icon-btn\s*\{[\s\S]*?box-shadow:[\s\S]*?0 1px 2px/);
  assert.match(styles, /\.icon-btn\s*\{[\s\S]*?border:\s*1px solid var\(--border\)/);
  assert.match(styles, /\.icon-btn:active:not\(:disabled\)\s*\{[\s\S]*?box-shadow:[\s\S]*?inset 0 1px 3px/);
  assert.doesNotMatch(formStyles, /\.icon-btn\s*\{[^}]*\b(?:background|border):/);
});

test("primary, reset, and workflow-specific actions keep visible labels", function () {
  [
    "overlay-debug-run",
    "overlay-debug-reset",
    "new-stream-button",
    "studio-compact-publish",
  ].forEach(function (id) {
    const element = markup.match(new RegExp(`<button id="${id}"[\\s\\S]*?<\\/button>`));
    assert.ok(element, `${id} must exist`);
    assert.doesNotMatch(element[0], /class="icon-btn/);
    assert.match(element[0], /data-i18n=/);
  });
});

console.log("icon-actions-markup OK");
