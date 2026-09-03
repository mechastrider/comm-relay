import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const chat = readFileSync(new URL("./overlay.js", import.meta.url), "utf8");
const leaderboard = readFileSync(new URL("../leaderboard/leaderboard.js", import.meta.url), "utf8");
const alert = readFileSync(new URL("../alert/alert.js", import.meta.url), "utf8");

for (const source of [chat, leaderboard, alert]) {
  assert.match(source, /overlayWebSocketURL\(window\.location\)/, "surface uses the shared fail-closed WebSocket selector");
  assert.match(source, /debug_reset/, "surface handles the global reset frame");
}
assert.match(chat, /debugTestEnabled \? undefined : loadRecentMessages\(\)/, "test chat skips production history restore");
assert.match(leaderboard, /if \(!debugTestEnabled\) \{\s*await loadSnapshot\(\);/, "test leaderboard skips production snapshot fetch");
assert.match(chat, /highlightRewardedMessage\(frame\)/, "test rewards use the production reward path");
assert.match(alert, /scheduler\.reset\(\);\s*clearSplash\(\);/, "test alert reset clears queue and visible lifecycle");

console.log("overlay debug surface contract OK");
