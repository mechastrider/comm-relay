import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const markup = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/studio.css", import.meta.url), "utf8");
const studioScript = readFileSync(new URL("./studio.js", import.meta.url), "utf8");
const debugPanelScript = readFileSync(new URL("./overlay-debug-panel.js", import.meta.url), "utf8");

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
assert.match(markup, /id="overlay-debug-toggle"[^>]*aria-controls="overlay-debug-panel"/);
assert.match(markup, /id="overlay-debug-panel"[^>]*aria-labelledby="overlay-debug-heading"/);
assert.match(markup, /id="overlay-debug-display_name"[^>]*maxlength="64"/);
assert.match(markup, /id="overlay-debug-message"[^>]*maxlength="500"/);
assert.match(markup, /id="overlay-debug-label"[^>]*maxlength="80"/);
assert.match(markup, /id="overlay-debug-points"[^>]*min="1"[^>]*max="1000"/);
assert.match(markup, /id="overlay-debug-run"[^>]*data-i18n="studio\.debugRun"/);
assert.match(markup, /id="overlay-debug-reset"[^>]*data-i18n="studio\.debugResetAction"/);
assert.match(markup, /id="overlay-debug-replay"[^>]*data-i18n-aria-label="studio\.debugReplay"[^>]*disabled/);
assert.match(styles, /\.overlay-debug-panel__body[\s\S]*?overflow:\s*auto/);
assert.match(debugPanelScript, /buildOverlayTestURL\(surface, \{ origin: window\.location\.origin \}\)/);
assert.match(debugPanelScript, /buildOverlayTestURL\(surface, \{ origin: preview\.origin,/);
assert.match(debugPanelScript, /import \{ copyOBSURL \} from "\.\/obs-setup\.js"/);
assert.match(debugPanelScript, /createOverlayDebugController/);
assert.match(debugPanelScript, /debugController\.replayPayload\(getPreviewSurface\(\)\)/);
assert.match(debugPanelScript, /debugController\.canStartReset\(\)/);
assert.doesNotMatch(debugPanelScript, /lastValidPayload/);
assert.match(debugPanelScript, /setRetryVisible\(false\)/);
assert.match(debugPanelScript, /document\.addEventListener\("studio-overlay-changed", scheduleDraftAppearanceRefresh\)/);
assert.match(studioScript, /deactivateOverlayDebugPanel\(\);\s*unmountOverlayPreview\(\)/);
assert.doesNotMatch(studioScript, /window\.confirm\(/);
assert.match(styles, /prefers-reduced-motion:\s*reduce/);

console.log("studio-markup OK");
