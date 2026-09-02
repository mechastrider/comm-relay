import assert from "node:assert/strict";
import { isOverlayDebugPage, overlayWebSocketURL, testSurfaceForPathname } from "./overlay-debug.js";

const production = { protocol: "http:", host: "127.0.0.1:17877", pathname: "/overlay" };
const chat = { protocol: "https:", host: "localhost:17877", pathname: "/overlay/test/chat" };
const leaderboard = { protocol: "http:", host: "localhost:17877", pathname: "/overlay/test/leaderboard" };
const alert = { protocol: "http:", host: "localhost:17877", pathname: "/overlay/test/alert" };

assert.equal(testSurfaceForPathname(chat.pathname), "chat");
assert.equal(testSurfaceForPathname(leaderboard.pathname), "leaderboard");
assert.equal(testSurfaceForPathname(alert.pathname), "alerts");
assert.equal(testSurfaceForPathname("/overlay/test/unknown"), "");
assert.equal(isOverlayDebugPage(production), false);
assert.equal(isOverlayDebugPage(chat), true);
assert.equal(overlayWebSocketURL(production), "ws://127.0.0.1:17877/ws");
assert.equal(overlayWebSocketURL(chat), "wss://localhost:17877/ws/overlay-debug");
assert.equal(overlayWebSocketURL(leaderboard), "ws://localhost:17877/ws/overlay-debug");
assert.equal(overlayWebSocketURL(alert), "ws://localhost:17877/ws/overlay-debug");

console.log("overlay debug routing OK");
