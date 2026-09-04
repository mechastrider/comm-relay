import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chatCSS = readFileSync(new URL("./overlay.css", import.meta.url), "utf8");
const leaderboardCSS = readFileSync(new URL("../leaderboard/leaderboard.css", import.meta.url), "utf8");
const alertCSS = readFileSync(new URL("../alert/alert.css", import.meta.url), "utf8");

function block(source, selector) {
  const match = source.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([\\s\\S]*?)\\n}"));
  assert.ok(match, `missing ${selector} rule`);
  return match[1];
}

test("chat and leaderboard roots fill a Browser Source rectangle without stretching rows", function () {
  const messages = block(chatCSS, ".messages");
  ["position: fixed", "inset: 0", "width: auto", "height: auto", "min-width: 0", "min-height: 0", "box-sizing: border-box", "overflow: hidden"].forEach(function (declaration) {
    assert.match(messages, new RegExp(declaration.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
  assert.match(messages, /align-items:\s*flex-start/);
  assert.match(chatCSS, /\.message\s*\{[\s\S]*?max-width:\s*100%/);

  const leaderboard = block(leaderboardCSS, ".leaderboard");
  ["position: fixed", "inset: 0", "width: auto", "height: auto", "min-width: 0", "min-height: 0", "box-sizing: border-box", "overflow: hidden"].forEach(function (declaration) {
    assert.match(leaderboard, new RegExp(declaration.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
  assert.match(leaderboardCSS, /leaderboard-layout--panel/);
  assert.match(leaderboardCSS, /leaderboard-layout--chips/);
});

test("every alert theme uses the available safe rectangle instead of a narrow card", function () {
  const root = block(alertCSS, ".alert-root");
  const splash = block(alertCSS, ".alert-splash");
  ["position: fixed", "inset: 0", "min-width: 0", "min-height: 0", "box-sizing: border-box"].forEach(function (declaration) {
    assert.match(root, new RegExp(declaration.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
  ["width: 100%", "height: 100%", "min-width: 0", "min-height: 0", "max-width: none", "max-height: 100%", "box-sizing: border-box", "overflow: hidden"].forEach(function (declaration) {
    assert.match(splash, new RegExp(declaration.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
  assert.doesNotMatch(alertCSS, /max-width:\s*min\(92vw/);
  ["default", "dashboard", "cockpit-panel", "cockpit-popups", "g-rebels-popups"].forEach(function (theme) {
    assert.match(alertCSS, new RegExp("overlay-theme--" + theme.replace(/-/g, "\\-")));
  });
  assert.match(alertCSS, /@media \(prefers-reduced-motion: reduce\)/);
});

test("compact alert rectangles preserve readable content and fade unavoidable overflow", function () {
  const compact = alertCSS.match(
    /@media \(max-width: 480px\) and \(max-height: 220px\) \{([\s\S]*)\n\}\n\n@media \(prefers-reduced-motion: reduce\)/
  );
  assert.ok(compact, "missing compact alert viewport rules");
  const rules = compact[1];

  assert.match(rules, /\.alert-root\s*\{[\s\S]*?padding:\s*6px/);
  assert.match(rules, /\.alert-content\s*\{[\s\S]*?align-content:\s*start/);
  assert.match(rules, /mask-image:\s*linear-gradient\(to bottom/);
  assert.match(rules, /font-size:\s*clamp\(13px,[^;]+16px\)/);
  assert.match(rules, /overlay-theme--cockpit-panel[\s\S]*?grid-template-columns:\s*auto 3px minmax\(0, 1fr\)/);
  assert.match(rules, /overlay-theme--cockpit-panel \.alert-splash\s*\{[\s\S]*?padding:\s*30px 10px 12px 50px/);
  ["cockpit-popups", "g-rebels-popups"].forEach(function (theme) {
    assert.match(rules, new RegExp("overlay-theme--" + theme.replace(/-/g, "\\-") + " \\.alert-splash"));
  });
});
