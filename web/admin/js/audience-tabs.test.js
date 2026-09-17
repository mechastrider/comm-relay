import test from "node:test";
import assert from "node:assert/strict";
import { AUDIENCE_TABS, parseAudienceHash } from "./audience-tabs.js";

test("parseAudienceHash selects archive and falls back to viewers", function () {
  assert.equal(parseAudienceHash("#audience/archive"), "archive");
  assert.equal(parseAudienceHash("#audience/ARCHIVE"), "archive");
  assert.equal(parseAudienceHash("#audience/unknown"), "viewers");
  assert.equal(parseAudienceHash("#audience"), "viewers");
});

test("AUDIENCE_TABS places archive after viewers and before journal", function () {
  assert.deepEqual(AUDIENCE_TABS, ["viewers", "archive", "history", "progression", "commands", "greetings", "awards"]);
});
