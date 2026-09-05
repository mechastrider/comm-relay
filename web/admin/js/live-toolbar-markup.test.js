import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const markup = await readFile(join(here, "..", "index.html"), "utf8");
const newStreamAction = await readFile(join(here, "viewers.js"), "utf8");
const liveStyles = await readFile(join(here, "..", "styles", "live.css"), "utf8");

const actions = markup.match(/<div class="console-actions live-toolbar-actions">([\s\S]*?)<\/div>/);
assert.ok(actions, "Live toolbar actions must exist");
assert.match(actions[1], /id="new-stream-button"/, "New stream stays in the Live toolbar group");
assert.match(actions[1], /id="refresh-messages"[^>]*icon-btn--compact/, "Live refresh uses compact icon sizing");
assert.match(
  liveStyles,
  /\.live-toolbar-actions > \.btn-small,\s*\.live-toolbar-actions > \.icon-btn--compact/
);
assert.match(markup, /id="new-stream-prompt-confirm"/, "New stream confirmation remains present");
assert.match(newStreamAction, /"\/api\/sessions\/start"/, "New stream keeps its existing POST action");
assert.match(newStreamAction, /stream\.newStreamDone/, "existing success copy remains wired through the action");

console.log("live-toolbar-markup OK");
