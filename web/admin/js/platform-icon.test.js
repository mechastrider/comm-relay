import assert from "node:assert/strict";
import { normalizePlatformId } from "./platform-icon.js";

assert.equal(normalizePlatformId(" Twitch "), "twitch");
assert.equal(normalizePlatformId("YouTube"), "youtube");
assert.equal(normalizePlatformId("VK"), "vk");
assert.equal(normalizePlatformId("custom-platform"), "custom-platform");
assert.equal(normalizePlatformId(""), "");
assert.equal(normalizePlatformId(null), "");

console.log("platform-icon OK");
