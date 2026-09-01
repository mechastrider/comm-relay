import assert from "node:assert/strict";
import {
  SIDEBAR_COLLAPSED,
  SIDEBAR_EXPANDED,
  SIDEBAR_STORAGE_KEY,
  nextSidebarState,
  normalizeSidebarState,
  readSidebarState,
  writeSidebarState,
} from "./sidebar.js";

assert.equal(normalizeSidebarState(SIDEBAR_COLLAPSED), SIDEBAR_COLLAPSED);
assert.equal(normalizeSidebarState(SIDEBAR_EXPANDED), SIDEBAR_EXPANDED);
assert.equal(normalizeSidebarState("invalid"), SIDEBAR_EXPANDED);
assert.equal(normalizeSidebarState(undefined), SIDEBAR_EXPANDED);

assert.equal(nextSidebarState(SIDEBAR_EXPANDED), SIDEBAR_COLLAPSED);
assert.equal(nextSidebarState(SIDEBAR_COLLAPSED), SIDEBAR_EXPANDED);
assert.equal(nextSidebarState("invalid"), SIDEBAR_COLLAPSED);

const stored = new Map([[SIDEBAR_STORAGE_KEY, SIDEBAR_COLLAPSED]]);
const storage = {
  getItem: function (key) {
    return stored.get(key) || null;
  },
  setItem: function (key, value) {
    stored.set(key, value);
  },
};

assert.equal(readSidebarState(storage), SIDEBAR_COLLAPSED);
assert.equal(writeSidebarState(storage, SIDEBAR_EXPANDED), true);
assert.equal(stored.get(SIDEBAR_STORAGE_KEY), SIDEBAR_EXPANDED);
assert.equal(readSidebarState(storage), SIDEBAR_EXPANDED);

const unavailableStorage = {
  getItem: function () {
    throw new Error("storage unavailable");
  },
  setItem: function () {
    throw new Error("storage unavailable");
  },
};

assert.equal(readSidebarState(unavailableStorage), SIDEBAR_EXPANDED);
assert.equal(writeSidebarState(unavailableStorage, SIDEBAR_COLLAPSED), false);
assert.equal(readSidebarState(null), SIDEBAR_EXPANDED);
assert.equal(writeSidebarState(null, SIDEBAR_COLLAPSED), false);

console.log("sidebar helpers OK");
