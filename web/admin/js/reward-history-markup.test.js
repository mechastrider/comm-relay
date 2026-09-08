import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const markup = await readFile(join(here, "..", "index.html"), "utf8");
const tabs = await readFile(join(here, "audience-tabs.js"), "utf8");
const history = await readFile(join(here, "reward-history.js"), "utf8");
const styles = await readFile(join(here, "..", "styles", "viewers.css"), "utf8");

assert.match(markup, /id="audience-history-tab"[\s\S]*?data-audience-tab="history"/);
assert.match(markup, /id="audience-history-panel"[\s\S]*?role="tabpanel"/);
assert.match(markup, /id="refresh-reward-history"/);
assert.match(tabs, /"viewers", "commands", "awards", "history"/);
assert.match(history, /textContent = String\(entry\.viewer_display_name/);
assert.match(history, /textContent = String\(entry\.reward_name/);
assert.doesNotMatch(history, /innerHTML/);
assert.match(history, /aria-busy/);
assert.match(history, /createViewerRewardHistory\(viewerId\)/);
assert.match(history, /fetchRewardHistory\(viewerId, limit, cursor, signal\)/);
assert.match(history, /cancelViewerRewardHistory\(\)/);
assert.match(history, /entry\.viewer_display_name/);
assert.match(styles, /\.reward-history__table-scroll\s*\{[\s\S]*?overflow:\s*auto/);
assert.match(styles, /\.audience-detail-sheet__body\s*\{[\s\S]*?min-height:\s*0[\s\S]*?overflow:\s*auto/);

console.log("reward-history markup OK");
