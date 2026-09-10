import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const viewersJs = await readFile(join(here, "viewers.js"), "utf8");
const viewersCss = await readFile(join(here, "../styles/viewers.css"), "utf8");

assert.match(
  viewersJs,
  /function isAudienceWorkspaceActive\(\) \{[\s\S]*?workspace-audience[\s\S]*?section\.hidden/
);
assert.match(
  viewersJs,
  /function openDetailShell\(\) \{[\s\S]*?if \(!isAudienceWorkspaceActive\(\)\)/
);
assert.match(
  viewersJs,
  /cancelViewerRewardHistory\(\);[\s\S]*?selectedViewerId = id/,
  "switching viewers must invalidate the previous scoped history request"
);
assert.match(
  viewersJs,
  /export function closeViewerDetail\(options\) \{[\s\S]*?cancelViewerRewardHistory\(\)/,
  "closing the viewer shell must invalidate scoped history"
);
assert.ok(
  viewersJs.indexOf("const rewardHistorySection = createViewerRewardHistory(id);") <
    viewersJs.indexOf('detailLoadInFlight = fetchJSON("/api/viewers/get?id="'),
  "viewer history must begin alongside, rather than after, the profile request"
);
assert.ok(
  viewersJs.indexOf("stats,\n    rewardHistorySection,") <
    viewersJs.indexOf("nameField,\n    hideField,"),
  "reward history must appear after summary statistics and before profile controls"
);
assert.match(
  viewersJs,
  /window\.addEventListener\("resize", enforceViewerDetailShellWhenHidden\)/
);
assert.doesNotMatch(
  viewersCss,
  /@media \(min-width: 1024px\) \{\s*\.audience-detail-sheet \{\s*display: none/
);

console.log("viewer-detail-shell.test.js: ok");
