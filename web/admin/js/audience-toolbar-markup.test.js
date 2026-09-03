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
const filtersGroup = toolbarBody.match(/<div class="audience-toolbar__filters form__field">([\s\S]*?)<\/div>/);
assert.ok(filtersGroup, "Audience filter group must exist");
assert.match(toolbarBody, /id="audience-new-stream-button"/, "Audience New stream button must exist");
assert.doesNotMatch(
  filtersGroup[1],
  /id="audience-new-stream-button"/,
  "Audience New stream must not sit inside the filter group"
);
assert.doesNotMatch(
  filtersGroup[1],
  /id="audience-open-leaderboard"/,
  "Audience leaderboard action must not sit inside the filter group"
);
assert.doesNotMatch(
  filtersGroup[1],
  /id="refresh-viewers"/,
  "Audience refresh action must not sit inside the filter group"
);
const actionsGroup = toolbarBody.match(/<div class="audience-toolbar__actions">([\s\S]*?)<\/div>/);
assert.ok(actionsGroup, "Audience toolbar actions group must exist");
assert.match(actionsGroup[1], /id="audience-open-leaderboard"/, "Leaderboard action must live in the actions group");
assert.match(actionsGroup[1], /id="refresh-viewers"/, "Refresh action must live in the actions group");
assert.match(actionsGroup[1], /id="audience-new-stream-button"/, "New stream action must live in the actions group");
assert.match(toolbarBody, /class="audience-toolbar__actions"/, "Audience toolbar actions group must exist");

assert.doesNotMatch(
  markup,
  /data-i18n="audience\.colActions"/,
  "Actions column must be removed from the Audience table"
);
assert.match(markup, /id="audience-sort-viewer"/, "Viewer sort button must exist");
assert.match(markup, /id="audience-sort-score"/, "Score sort button must exist");
assert.match(markup, /id="audience-sort-messages"/, "Messages sort button must exist");
assert.match(
  markup,
  /class="data-table__numeric audience-viewers-table__sortable" aria-sort="none"/,
  "Sortable headers must own aria-sort and a full-cell interaction surface"
);
assert.match(
  styles,
  /table\.data-table\.audience-viewers-table > thead\.audience-viewers-table__head > tr > th\s*\{[\s\S]*?position:\s*sticky/,
  "Audience table headers must remain visible while the directory scrolls"
);
assert.match(
  styles,
  /\.audience-sort-button\s*\{[\s\S]*?height:\s*var\(--audience-pane-head-inner\)/,
  "Sort buttons must match the shared audience pane header height"
);
assert.match(
  styles,
  /table\.data-table\.audience-viewers-table > thead\.audience-viewers-table__head > tr > th\s*\{[\s\S]*?text-align:\s*center/,
  "Audience table headers must be centered"
);
assert.match(
  toolbarBody,
  /class="audience-toolbar__filters form__field"/,
  "Audience period filter must use the same stacked field layout as search"
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

assert.match(
  styles,
  /\.audience-viewers-table__name-inner\s*\{[\s\S]*?display:\s*flex/,
  "Name cell flex layout must live in an inner wrapper, not on table cells"
);
assert.match(
  viewersSource,
  /audience-viewers-table__name-inner/,
  "Viewer rows must render a name inner wrapper"
);
assert.doesNotMatch(
  styles,
  /\.audience-viewers-table__name\s*\{[\s\S]*?display:\s*flex/,
  "Table cells must not use display:flex"
);
assert.match(
  styles,
  /\.audience-toolbar:not\(\.audience-toolbar--primary\)\s*\{[\s\S]*?display:\s*grid/,
  "Viewer toolbar must keep controls and actions on one row"
);

assert.match(
  styles,
  /\.audience-detail__name-field input\[type="text"\],\s*\.audience-detail__merge select,\s*\.audience-detail__name-field > \.btn-physical,\s*\.audience-detail__merge > \.btn-physical\s*\{[\s\S]*?width:\s*100%/,
  "Audience detail actions must span the same width as their form controls"
);
assert.match(
  styles,
  /\.audience-inspector__header\s*\{[\s\S]*?padding:\s*0 var\(--audience-inspector-pad-x\)/,
  "Inspector header horizontal padding must match the card body"
);
assert.match(
  styles,
  /\.audience-viewers-table th,\s*\.audience-viewers-table td\s*\{[\s\S]*?border-right:/,
  "Audience table columns must have vertical dividers"
);
assert.match(
  styles,
  /\.audience-viewers-table \.data-table__numeric\s*\{[\s\S]*?text-align:\s*right/,
  "Audience numeric columns must stay right-aligned"
);
assert.match(
  styles,
  /\.audience-layout\s*\{[\s\S]*?gap:\s*0/,
  "Audience table and inspector must sit flush without a gutter"
);

assert.match(
  styles,
  /\.audience-toolbar__actions > \.btn-small,\s*\.audience-toolbar__actions > \.icon-btn--compact\s*\{[\s\S]*?height:\s*var\(--control-min-height\)/,
  "Audience toolbar actions must share one fixed control height"
);

console.log("audience-toolbar-markup OK");
