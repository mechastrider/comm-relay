import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("./recap.css", import.meta.url), "utf8");
const js = readFileSync(new URL("./recap.js", import.meta.url), "utf8");
const model = readFileSync(new URL("./recap-model.js", import.meta.url), "utf8");
const render = readFileSync(new URL("./recap-render.js", import.meta.url), "utf8");

test("recap is a dedicated full-canvas transparent surface with all themes", function () {
  assert.match(css, /@import url\("\.\.\/overlay\.css\?v=24"\)/);
  assert.match(css, /#recap-root\s*\{[^}]*position:\s*fixed[^}]*inset:\s*0[^}]*overflow:\s*hidden/s);
  assert.match(css, /html, body \{[^}]*background:\s*transparent[^}]*overflow:\s*hidden/s);
  ["default", "dashboard", "cockpit-panel", "cockpit-popups", "g-rebels-popups"].forEach(function (theme) {
    assert.match(css, new RegExp("overlay-theme--" + theme.replace(/-/g, "\\-")));
  });
  assert.match(css, /min-aspect-ratio:\s*4 \/ 5[^}]*max-aspect-ratio:\s*5 \/ 4/);
  assert.match(css, /max-aspect-ratio:\s*4 \/ 5/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("each recap theme owns a distinct visual grammar", function () {
  assert.match(css, /restrained broadcast card[\s\S]*?overlay-theme--default/i);
  assert.match(css, /overlay-theme--dashboard[\s\S]*?\.recap-section__heading[\s\S]*?background:\s*var\(--recap-accent\)/);
  assert.match(css, /overlay-theme--cockpit-panel \.recap::before[\s\S]*?linear-gradient\(90deg, rgb\(53 210 208/);
  assert.match(css, /overlay-theme--cockpit-popups \.recap-section[\s\S]*?clip-path:\s*polygon/);
  assert.match(css, /overlay-theme--g-rebels-popups \.recap::before[\s\S]*?repeating-linear-gradient/);
});

test("a sole recap section has a full-width composition track", function () {
  assert.match(css, /\.recap-content--single\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /@media \(max-aspect-ratio:\s*4 \/ 5\) \{[\s\S]*?\.recap-content--single\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)/);
  assert.match(render, /recapContentLayout\(snapshot\)/);
  assert.match(render, /recap-content--" \+ layout/);
});

test("recap lifecycle is production-only, bounded, and independent of alert queueing", function () {
  assert.match(js, /INITIAL_RECONNECT_MS = 1000/);
  assert.match(js, /MAX_RECONNECT_MS = 30000/);
  assert.match(js, /if \(sampleMode\) \{\s*showRecap/s);
  assert.match(js, /if \(sampleMode\) \{\s*return;\s*\}/s);
  assert.match(js, /root\.textContent = ""/);
  assert.match(model, /stream_recap_state/);
  assert.match(js, /overlay_settings/);
  assert.doesNotMatch(js, /alert-scheduler|createAlertScheduler|startSplashLifecycle|\/api\/stream-recaps\/current|\/api\/sessions/);
});

test("renderer only writes authored values through textContent and uses required DTO portrait fields", function () {
  assert.match(render, /\.textContent = String\(value\)/);
  assert.doesNotMatch(render, /innerHTML/);
  assert.match(render, /entry\.portrait_url/);
  assert.match(render, /group\.viewer_portrait_url/);
  assert.match(render, /t\("recap\.overlayTitle"\)/);
  assert.match(render, /t\("recap\.overlayMessageCount"/);
  assert.doesNotMatch(render, /"STREAM RECAP"|"RECOGNITION"|"VIEWERS"|"MESSAGES"/);
});
