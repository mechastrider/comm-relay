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

test("dock markup has no standalone resume or auto control", () => {
  const markup = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  assert.match(markup, /id="leaderboard-always-visible"[^>]+role="switch"/);
  assert.match(markup, /id="leaderboard-show"/);
  assert.match(markup, /id="leaderboard-pin"[^>]+aria-pressed="false"/);
  assert.match(markup, /id="leaderboard-hide"/);
  assert.doesNotMatch(markup, /data-leaderboard-action="resume"/);
  assert.doesNotMatch(markup, /data-i18n="dock\.resume"/);
});
