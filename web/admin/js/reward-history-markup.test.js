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
assert.match(markup, /id="reward-history-viewer-filter"[\s\S]*?list="reward-history-viewer-options"/);
assert.match(markup, /id="clear-reward-history-viewer-filter"[\s\S]*?disabled/);
assert.match(tabs, /"viewers", "history", "commands", "greetings", "awards"/);
assert.match(history, /const viewerName = String\(entry\.viewer_display_name/);
assert.match(history, /textContent = String\(entry\.reward_name/);
assert.doesNotMatch(history, /innerHTML/);
assert.match(history, /aria-busy/);
assert.match(history, /createViewerRewardHistory\(viewerId\)/);
assert.match(history, /fetchRewardHistory\(viewerId, limit, cursor, signal\)/);
assert.match(history, /cancelViewerRewardHistory\(\)/);
assert.match(history, /entry\.viewer_display_name/);
assert.match(history, /entry\.viewer_id/);
assert.match(history, /setGlobalViewerFilter/);
assert.match(styles, /\.reward-history__table-scroll\s*\{[\s\S]*?overflow-x:\s*hidden/);
assert.doesNotMatch(styles, /\.reward-history-table\s*\{[\s\S]*?min-width:\s*42rem/);
assert.match(styles, /\.reward-history-table--compact tbody > tr\s*\{[\s\S]*?grid-template-areas:/);
assert.match(styles, /\.audience-detail-sheet__body\s*\{[\s\S]*?min-height:\s*0[\s\S]*?overflow:\s*auto/);

console.log("reward-history markup OK");
