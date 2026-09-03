import assert from "node:assert/strict";
import {
  AUDIENCE_SORT_STORAGE_KEY,
  audienceSortAriaValue,
  nextAudienceSort,
  normalizeAudienceSort,
  readAudienceSort,
  sortAudienceViewers,
  viewerPlatformsList,
  writeAudienceSort,
} from "./audience-helpers.js";

assert.deepEqual(normalizeAudienceSort(null), { column: null, direction: "desc" });
assert.deepEqual(normalizeAudienceSort({ column: "score", direction: "desc" }), {
  column: "score",
  direction: "desc",
});
assert.deepEqual(normalizeAudienceSort({ column: "messages", direction: "asc" }), {
  column: "messages",
  direction: "asc",
});
assert.deepEqual(normalizeAudienceSort({ column: "viewer", direction: "asc" }), {
  column: "viewer",
  direction: "asc",
});
assert.deepEqual(normalizeAudienceSort({ column: "invalid", direction: "sideways" }), {
  column: null,
  direction: "desc",
});

assert.deepEqual(nextAudienceSort({ column: null, direction: "desc" }, "score"), {
  column: "score",
  direction: "desc",
});
assert.deepEqual(nextAudienceSort({ column: "score", direction: "desc" }, "score"), {
  column: "score",
  direction: "asc",
});
assert.deepEqual(nextAudienceSort({ column: "score", direction: "asc" }, "score"), {
  column: null,
  direction: "desc",
});
assert.deepEqual(nextAudienceSort({ column: "messages", direction: "desc" }, "score"), {
  column: "score",
  direction: "desc",
});

assert.deepEqual(nextAudienceSort({ column: "viewer", direction: "asc" }, "viewer"), {
  column: null,
  direction: "desc",
});

assert.equal(audienceSortAriaValue({ column: "viewer", direction: "asc" }, "viewer"), "ascending");
assert.equal(audienceSortAriaValue({ column: "score", direction: "desc" }, "score"), "descending");
assert.equal(audienceSortAriaValue({ column: "score", direction: "asc" }, "score"), "ascending");

const stored = new Map();
const storage = {
  getItem: function (key) {
    return stored.get(key) || null;
  },
  setItem: function (key, value) {
    stored.set(key, value);
  },
};

stored.set(AUDIENCE_SORT_STORAGE_KEY, JSON.stringify({ column: "messages", direction: "desc" }));
assert.deepEqual(readAudienceSort(storage), { column: "messages", direction: "desc" });
assert.equal(writeAudienceSort(storage, { column: "score", direction: "asc" }), true);
assert.equal(
  stored.get(AUDIENCE_SORT_STORAGE_KEY),
  JSON.stringify({ column: "score", direction: "asc" })
);

const brokenStorage = {
  getItem: function () {
    throw new Error("storage unavailable");
  },
  setItem: function () {
    throw new Error("storage unavailable");
  },
};
assert.deepEqual(readAudienceSort(brokenStorage), { column: null, direction: "desc" });
assert.equal(writeAudienceSort(brokenStorage, { column: "score", direction: "desc" }), false);

stored.set(AUDIENCE_SORT_STORAGE_KEY, "{not-json");
assert.deepEqual(readAudienceSort(storage), { column: null, direction: "desc" });

assert.deepEqual(viewerPlatformsList({ platforms: ["twitch", "youtube", "twitch"] }), [
  "twitch",
  "youtube",
]);
assert.deepEqual(viewerPlatformsList({ last_seen: { platform: "youtube" } }), ["youtube"]);
assert.deepEqual(viewerPlatformsList({ last_seen: { platform: "" } }), []);
assert.deepEqual(viewerPlatformsList({}), []);

const namedViewers = [
  { id: "b", display_name: "Bravo" },
  { id: "a", display_name: "Alpha" },
  { id: "c", display_name: "Charlie" },
];
assert.deepEqual(
  sortAudienceViewers(namedViewers, { column: "viewer", direction: "asc" }, "session").map(function (viewer) {
    return viewer.id;
  }),
  ["a", "b", "c"]
);
assert.deepEqual(
  sortAudienceViewers(namedViewers, { column: "viewer", direction: "desc" }, "session").map(function (viewer) {
    return viewer.id;
  }),
  ["c", "b", "a"]
);

const viewers = [
  {
    id: "a",
    session_score: 10,
    session_message_count: 1,
    day_score: 0,
    day_message_count: 0,
    score: 0,
    message_count: 0,
  },
  {
    id: "b",
    session_score: 30,
    session_message_count: 5,
    day_score: 0,
    day_message_count: 0,
    score: 0,
    message_count: 0,
  },
];
const sortedDesc = sortAudienceViewers(viewers, { column: "score", direction: "desc" }, "session");
assert.deepEqual(
  sortedDesc.map(function (viewer) {
    return viewer.id;
  }),
  ["b", "a"]
);
const sortedAsc = sortAudienceViewers(viewers, { column: "messages", direction: "asc" }, "session");
assert.deepEqual(
  sortedAsc.map(function (viewer) {
    return viewer.id;
  }),
  ["a", "b"]
);
assert.deepEqual(
  sortAudienceViewers(viewers, { column: null, direction: "desc" }, "session").map(function (viewer) {
    return viewer.id;
  }),
  ["a", "b"]
);

console.log("audience-sort OK");
