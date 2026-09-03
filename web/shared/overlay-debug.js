/**
 * Dedicated, fail-closed routing helpers for Studio test surfaces.
 * Production pages must never opt into this route through a query parameter.
 */

const TEST_PATHS = {
  "/overlay/test/chat": "chat",
  "/overlay/test/leaderboard": "leaderboard",
  "/overlay/test/alert": "alerts",
};

export function testSurfaceForPathname(pathname) {
  return TEST_PATHS[String(pathname || "")] || "";
}

export function isOverlayDebugPage(location) {
  return Boolean(location && testSurfaceForPathname(location.pathname));
}

export function overlayWebSocketURL(location) {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const path = isOverlayDebugPage(location) ? "/ws/overlay-debug" : "/ws";
  return protocol + "//" + location.host + path;
}
