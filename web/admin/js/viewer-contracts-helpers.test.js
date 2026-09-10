import assert from "node:assert/strict";

import {
  codePointLength,
  validateViewerContractDraft,
} from "./viewer-contracts-helpers.js";

assert.equal(codePointLength("  😀😀  "), 2);

const valid = validateViewerContractDraft({
  title: "  Hold the line 😀  ",
  objective: "  Survive the final round.  ",
  rewardID: "spotter",
});
assert.deepEqual(valid, {
  title: "Hold the line 😀",
  objective: "Survive the final round.",
  rewardID: "spotter",
  titleValid: true,
  objectiveValid: true,
  rewardValid: true,
});

const invalid = validateViewerContractDraft({
  title: "😀".repeat(81),
  objective: "x".repeat(281),
  rewardID: " ",
});
assert.equal(invalid.titleValid, false);
assert.equal(invalid.objectiveValid, false);
assert.equal(invalid.rewardValid, false);

console.log("viewer-contracts-helpers OK");
