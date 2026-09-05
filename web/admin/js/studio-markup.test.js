import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const markup = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/studio.css", import.meta.url), "utf8");
const studioScript = readFileSync(new URL("./studio.js", import.meta.url), "utf8");

const surfaceList = markup.match(
  /<nav id="studio-surface-list"[\s\S]*?<\/nav>/
);
assert.ok(surfaceList, "Studio surface selector exists");
assert.doesNotMatch(surfaceList[0], /role="tab"/);
assert.match(surfaceList[0], /data-obs-preview-surface="chat"[^>]*aria-pressed="true"/);
assert.match(surfaceList[0], /studio-surface-item__icon/);
assert.match(styles, /\.studio-surface-item\[aria-pressed="true"\]/);
assert.match(markup, /id="overlay-panel-opacity"[^>]*aria-describedby="overlay-panel-opacity-hint"/);
assert.match(markup, /id="overlay-panel-opacity-error"[^>]*role="alert"/);
assert.match(styles, /border-left-color:\s*var\(--amber\)/);

assert.match(markup, /data-studio-mode="essentials"[^>]*aria-pressed="true"/);
assert.match(markup, /data-studio-mode="all"[^>]*aria-pressed="false"/);
assert.match(markup, /id="studio-compact-publish"/);
assert.match(markup, /data-studio-add-to-obs-action="close"/);
assert.match(markup, /data-studio-add-to-obs-action="later"/);
assert.match(markup, /data-studio-add-to-obs-action="done"/);
assert.match(markup, /id="studio-discard-dialog"[^>]*class="prompt-dialog studio-discard-dialog"/);
assert.match(markup, /id="studio-discard-confirm"[^>]*class="btn-physical btn-danger"/);
assert.match(markup, /id="studio-follow-url"[^>]*data-i18n-aria-label="obs\.followActivePreset"/);
assert.doesNotMatch(markup, /<label for="studio-follow-url"/);
assert.doesNotMatch(markup, /id="overlay-debug-toggle"/);
assert.doesNotMatch(markup, /id="overlay-debug-panel"/);
assert.match(studioScript, /deactivateOverlayDebugPanel\(\);\s*unmountOverlayPreview\(\)/);
assert.doesNotMatch(studioScript, /window\.confirm\(/);
assert.match(styles, /prefers-reduced-motion:\s*reduce/);

console.log("studio-markup OK");
