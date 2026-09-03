import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const chatJS = fs.readFileSync(new URL("./overlay.js", import.meta.url), "utf8");
const chatCSS = fs.readFileSync(new URL("./overlay.css", import.meta.url), "utf8");
const leaderboardJS = fs.readFileSync(new URL("../leaderboard/leaderboard.js", import.meta.url), "utf8");
const leaderboardCSS = fs.readFileSync(new URL("../leaderboard/leaderboard.css", import.meta.url), "utf8");
const alertJS = fs.readFileSync(new URL("../alert/alert.js", import.meta.url), "utf8");
const alertCSS = fs.readFileSync(new URL("../alert/alert.css", import.meta.url), "utf8");

test("surface opacity is a chrome variable on every overlay runtime", function () {
  [chatJS, leaderboardJS, alertJS].forEach(function (source) {
    assert.match(source, /setProperty\(\s*"--overlay-panel-opacity"/);
    assert.match(source, /setProperty\(\s*"--overlay-panel-bg"/);
  });
});

test("surface opacity keeps OBS pages transparent and changes panel chrome", function () {
  assert.match(chatCSS, /html,\s*body\s*\{[\s\S]*?background:\s*transparent/);
  assert.match(alertCSS, /html,\s*body\s*\{[\s\S]*?background:\s*transparent/);
  [chatCSS, leaderboardCSS, alertCSS].forEach(function (source) {
    assert.match(source, /background:\s*var\(--overlay-panel-bg\)/);
    assert.doesNotMatch(source, /(^|[;\s])opacity:\s*var\(--overlay-panel-opacity\)/m);
  });
  assert.match(leaderboardCSS, /leaderboard-layout--chips[\s\S]*?var\(--overlay-panel-bg\)/);
});

test("legacy cockpit chrome and explicit transparent overrides reach chat, leaderboard, and alerts", function () {
  [chatJS, leaderboardJS, alertJS].forEach(function (source) {
    assert.match(source, /panelBackground\(overlayView\.theme, style\)/);
  });
});
