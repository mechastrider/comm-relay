import assert from "node:assert/strict";
import {
  buildOverlayTestURL,
  isDebugScenarioCompatible,
  scenariosForSurface,
  testPathForSurface,
  validateDebugScenario,
} from "./overlay-debug-helpers.js";

const origin = "http://127.0.0.1:17877";
assert.deepEqual(scenariosForSurface("chat"), ["message", "rewarded_message"]);
assert.deepEqual(scenariosForSurface("leaderboard"), ["leaderboard_update"]);
assert.deepEqual(scenariosForSurface("alerts"), ["command_alert", "rewarded_message", "alert_burst"]);
assert.equal(testPathForSurface("chat"), "/overlay/test/chat");
assert.equal(testPathForSurface("leaderboard"), "/overlay/test/leaderboard");
assert.equal(testPathForSurface("alerts"), "/overlay/test/alert");
assert.equal(isDebugScenarioCompatible("chat", { scenario: "message" }), true);
assert.equal(isDebugScenarioCompatible("leaderboard", { scenario: "message" }), false);
assert.equal(isDebugScenarioCompatible("alerts", { scenario: "alert_burst" }), true);

const stable = new URL(buildOverlayTestURL("alerts", { origin }));
assert.equal(stable.pathname, "/overlay/test/alert");
assert.equal(stable.port, "17877", "the panel must retain the actual local server port");
assert.equal(stable.search, "");
const snapshot = new URL(buildOverlayTestURL("chat", {
  origin,
  appearance: { preset: "draft-look", font_family: "mono", preview: "sample", sample: "true", preview_background: "scene" },
}));
assert.equal(snapshot.pathname, "/overlay/test/chat");
assert.equal(snapshot.searchParams.get("preset"), "draft-look");
assert.equal(snapshot.searchParams.get("font_family"), "mono");
assert.equal(snapshot.searchParams.has("preview"), false);
assert.equal(snapshot.searchParams.has("sample"), false);
assert.equal(snapshot.searchParams.has("preview_background"), false);
const changedDraft = new URL(buildOverlayTestURL("chat", { origin, appearance: { font_family: "system" } }));
assert.equal(snapshot.searchParams.get("font_family"), "mono", "a copied snapshot URL stays immutable");
assert.equal(changedDraft.searchParams.get("font_family"), "system");

assert.deepEqual(validateDebugScenario({ scenario: "message", display_name: "n", message: "m" }), {});
assert.deepEqual(validateDebugScenario({ scenario: "unknown" }), { scenario: "scenario" });
assert.deepEqual(validateDebugScenario({ scenario: "message", display_name: "x".repeat(65) }), { display_name: "display_name" });
assert.deepEqual(validateDebugScenario({ scenario: "message", message: "x".repeat(501) }), { message: "message" });
assert.deepEqual(validateDebugScenario({ scenario: "message", label: "x".repeat(81) }), { label: "label" });
assert.deepEqual(validateDebugScenario({ scenario: "message", points: 1.5 }), { points: "points" });
assert.deepEqual(validateDebugScenario({ scenario: "message", points: 1001 }), { points: "points" });

console.log("overlay debug panel helpers OK");
