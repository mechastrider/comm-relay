import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dockJs = readFileSync(new URL("./messages.js", import.meta.url), "utf8");
const dockCss = readFileSync(new URL("./messages.css", import.meta.url), "utf8");
const sharedCss = readFileSync(new URL("../shared/reward-picker.css", import.meta.url), "utf8");

test("dock wires icon-only reward and delete controls", function () {
  assert.match(dockJs, /iconOnly:\s*true/);
  assert.match(dockJs, /createMessageDeleteControl/);
  assert.doesNotMatch(dockJs, /deleteButton\.textContent = t\("dock\.delete"\)/);
});

test("dock action cluster stays nowrap around 400px", function () {
  assert.match(dockCss, /\.message-list__meta\s*\{[\s\S]*?flex-wrap:\s*nowrap/);
  assert.match(dockCss, /\.message-list__actions\s*\{[\s\S]*?flex-wrap:\s*nowrap/);
  assert.match(sharedCss, /\.message-list__icon-button\s*\{[\s\S]*?min-width:\s*28px/);
  assert.match(sharedCss, /\.message-list__command-outcome-label\s*\{[\s\S]*?white-space:\s*nowrap/);
});
