import assert from "node:assert/strict";
import {
  normalizeAudienceSort,
  sortAudienceViewers,
  viewerPeriodMetrics,
} from "./audience-helpers.js";

assert.deepEqual(normalizeAudienceSort({ column: "score", direction: "desc" }), {
  column: "xp",
  direction: "desc",
});

const viewer = {
  session_xp: 10,
  session_message_count: 2,
  day_xp: 20,
  day_message_count: 4,
  xp: 30,
  message_count: 6,
};
assert.deepEqual(viewerPeriodMetrics(viewer, "session"), { xp: 10, messages: 2 });
assert.deepEqual(viewerPeriodMetrics(viewer, "day"), { xp: 20, messages: 4 });
assert.deepEqual(viewerPeriodMetrics(viewer, "all"), { xp: 30, messages: 6 });

const viewers = [
  { id: "a", session_xp: 10, session_message_count: 1 },
  { id: "b", session_xp: 30, session_message_count: 5 },
];
const sortedDesc = sortAudienceViewers(
  viewers,
  normalizeAudienceSort({ column: "score", direction: "desc" }),
  "session"
);
assert.deepEqual(
  sortedDesc.map(function (v) {
    return v.id;
  }),
  ["b", "a"]
);

console.log("audience-xp-sort OK");
