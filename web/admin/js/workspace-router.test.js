import assert from "node:assert/strict";
import {
  WORKSPACES,
  parseWorkspaceHash,
  workspaceHash,
  workspaceSectionId,
} from "./workspace-router.js";
import { nextAudienceTab } from "./audience-tabs.js";

assert.deepEqual(WORKSPACES, ["live", "audience", "studio", "settings"]);

const cases = [
  ["", "live"],
  [undefined, "live"],
  [null, "live"],
  ["#", "live"],
  ["#live", "live"],
  ["#audience", "audience"],
  ["#studio", "studio"],
  ["#settings", "settings"],
  ["#settings/platforms", "settings"],
  ["#settings/network", "settings"],
  ["#settings/unknown", "settings"],
  ["#nope", "live"],
  ["#LIVE", "live"],
  ["#junk", "live"],
  ["live", "live"],
  ["#Audience", "audience"],
];

for (const [input, expected] of cases) {
  assert.equal(parseWorkspaceHash(input), expected, "parseWorkspaceHash(" + String(input) + ")");
}

assert.equal(workspaceHash("live"), "#live");
assert.equal(workspaceHash("audience"), "#audience");
assert.equal(workspaceHash("studio"), "#studio");
assert.equal(workspaceHash("settings"), "#settings");

assert.equal(workspaceSectionId("live"), "workspace-live");
assert.equal(workspaceSectionId("settings"), "workspace-settings");

assert.equal(nextAudienceTab("viewers", "ArrowRight"), "commands");
assert.equal(nextAudienceTab("awards", "ArrowRight"), "viewers");
assert.equal(nextAudienceTab("viewers", "ArrowLeft"), "awards");
assert.equal(nextAudienceTab("commands", "Home"), "viewers");
assert.equal(nextAudienceTab("commands", "End"), "awards");

console.log("workspace-router OK");
