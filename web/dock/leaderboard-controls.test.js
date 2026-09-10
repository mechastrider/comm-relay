import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { visibilityControlState } from "./leaderboard-controls.js";

test("always policy uses one switch action without timed controls", () => {
  const visible = visibilityControlState({ state: "pinned", policy: "always" }, 15);
  assert.equal(visible.mode, "always");
  assert.equal(visible.alwaysChecked, true);
  assert.equal(visible.alwaysAction, "hide");

  const hidden = visibilityControlState({ state: "hidden", policy: "always" }, 15);
  assert.equal(hidden.alwaysChecked, false);
  assert.equal(hidden.alwaysAction, "resume");
});

test("automatic and on-request policies use timed show, pin toggle, and hide", () => {
  const automatic = visibilityControlState({ state: "hidden", policy: "automatic" }, 20);
  assert.equal(automatic.mode, "timed");
  assert.equal(automatic.displaySeconds, 20);
  assert.equal(automatic.showDisabled, false);
  assert.equal(automatic.pinAction, "pin");
  assert.equal(automatic.hideDisabled, true);

  const pinned = visibilityControlState({ state: "pinned", policy: "on_request" }, 20);
  assert.equal(pinned.mode, "timed");
  assert.equal(pinned.showDisabled, true);
  assert.equal(pinned.pinPressed, true);
  assert.equal(pinned.pinAction, "resume");
  assert.equal(pinned.hideDisabled, false);
});

test("dock toolbar buttons are icons with accessible localized tooltips", () => {
  const markup = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const script = readFileSync(new URL("./messages.js", import.meta.url), "utf8");
  assert.match(markup, /id="leaderboard-always-visible"[^>]+role="switch"/);
  for (const id of ["leaderboard-show", "leaderboard-pin", "leaderboard-hide"]) {
    assert.match(markup, new RegExp(`id="${id}"[^>]+leaderboard-toolbar__icon-button[^>]+aria-label="[^"]+"`));
  }
  assert.match(markup, /id="leaderboard-pin"[^>]+aria-pressed="false"/);
  assert.doesNotMatch(markup, /data-leaderboard-action="resume"/);
  assert.doesNotMatch(markup, /data-i18n="dock\.resume"/);
  for (const id of [
    "contract-show-objective",
    "contract-show-leaderboard",
    "contract-repeat-announcement",
  ]) {
    assert.match(markup, new RegExp(`id="${id}"[^>]+aria-label="[^"]+"`));
  }
  assert.match(markup, /class="leaderboard-toolbar__mode-switcher"[^>]+role="group"[^>]+data-i18n-aria-label="dock\.contractMode"/);
  assert.equal((markup.match(/class="ui-tooltip" role="tooltip"/g) || []).length, 6);
  assert.equal((markup.match(/class="leaderboard-toolbar__icon-button has-tooltip"/g) || []).length, 6);
  assert.equal((markup.match(/<svg[^>]+aria-hidden="true"/g) || []).length, 7);
  assert.doesNotMatch(markup, /<button[^>]*>\s*(?:Show|Pin|Hide|Показать|Закрепить|Скрыть)\s*<\/button>/);
  assert.doesNotMatch(markup, /id="contract-toggle-visibility"/);
  assert.doesNotMatch(markup, /contract-(?:award|close|edit)/);
  assert.doesNotMatch(markup, /id="leaderboard-standard-actions"/);
  assert.doesNotMatch(script, /runContractDisplay\([^,]+,[^,]+,[^)]*"visibility"/);
  assert.match(script, /controls\.pinAction === "resume" \? "dock\.resume" : "dock\.pin"/);
});
