import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const markup = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/components.css", import.meta.url), "utf8");
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
  ].forEach(function (id) {
    const element = markup.match(new RegExp(`<button id="${id}"[\\s\\S]*?<\\/button>`));
    assert.ok(element, `${id} must exist`);
    assert.match(element[0], /class="icon-btn has-tooltip/);
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

test("primary, reset, destructive, and workflow-specific actions keep visible labels", function () {
  [
    "overlay-debug-run",
    "overlay-debug-reset",
    "new-stream-button",
    "overlay-preset-delete",
    "studio-compact-publish",
  ].forEach(function (id) {
    const element = markup.match(new RegExp(`<button id="${id}"[\\s\\S]*?<\\/button>`));
    assert.ok(element, `${id} must exist`);
    assert.doesNotMatch(element[0], /class="icon-btn/);
    assert.match(element[0], /data-i18n=/);
  });
});

console.log("icon-actions-markup OK");
