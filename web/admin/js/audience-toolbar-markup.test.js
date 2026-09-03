import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const markup = await readFile(join(here, "..", "index.html"), "utf8");

const viewersToolbar = markup.match(
  /<header class="audience-toolbar">([\s\S]*?)<\/header>/
);
assert.ok(viewersToolbar, "Audience viewers toolbar must exist");

const toolbarBody = viewersToolbar[1];
const filtersGroup = toolbarBody.match(/<div class="audience-toolbar__filters">([\s\S]*?)<\/div>/);
assert.ok(filtersGroup, "Audience filter group must exist");
assert.match(toolbarBody, /id="audience-new-stream-button"/, "Audience New stream button must exist");
assert.doesNotMatch(
  filtersGroup[1],
  /id="audience-new-stream-button"/,
  "Audience New stream must not sit inside the filter group"
);
assert.match(toolbarBody, /class="audience-toolbar__actions"/, "Audience toolbar actions group must exist");

assert.doesNotMatch(
  markup,
  /data-i18n="audience\.colActions"/,
  "Actions column must be removed from the Audience table"
);
assert.match(markup, /id="audience-sort-score"/, "Score sort button must exist");
assert.match(markup, /id="audience-sort-messages"/, "Messages sort button must exist");

console.log("audience-toolbar-markup OK");
