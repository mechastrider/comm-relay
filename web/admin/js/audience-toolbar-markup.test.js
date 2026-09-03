import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const markup = await readFile(join(here, "..", "index.html"), "utf8");
const styles = await readFile(join(here, "..", "styles", "viewers.css"), "utf8");
const viewersSource = await readFile(join(here, "viewers.js"), "utf8");

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
assert.match(
  markup,
  /class="data-table__numeric audience-viewers-table__sortable" aria-sort="none"/,
  "Sortable headers must own aria-sort and a full-cell interaction surface"
);
assert.match(
  styles,
  /\.audience-viewers-table__head th\s*\{[\s\S]*?position:\s*sticky/,
  "Audience table headers must remain visible while the directory scrolls"
);
assert.match(
  styles,
  /\.audience-sort-button\s*\{[\s\S]*?min-height:\s*var\(--touch-target-narrow\)/,
  "Sort buttons must keep a touch-friendly target"
);
assert.match(
  styles,
  /tr\[data-viewer-id\]\s*\{[\s\S]*?cursor:\s*pointer/,
  "Clickable viewer rows must advertise pointer activation"
);
assert.match(
  styles,
  /tr\[data-viewer-id\]:focus-within/,
  "Viewer rows must expose a keyboard focus affordance"
);
assert.match(
  viewersSource,
  /next\.querySelector\("\.audience-viewers-table__name-button"\)/,
  "Arrow navigation must keep focus on the semantic name controls"
);
assert.match(
  viewersSource,
  /\(event\.key === "Enter" \|\| event\.key === " "\) && !nameButton/,
  "Name controls must keep native Enter and Space activation"
);
assert.match(
  viewersSource,
  /function repairFocusReturnElement\(\)/,
  "Table rerenders must repair detail focus return targets"
);

console.log("audience-toolbar-markup OK");
