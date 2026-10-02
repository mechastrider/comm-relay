export const DEBUG_SCENARIOS = {
  chat: ["message", "rewarded_message"],
  leaderboard: ["leaderboard_update"],
  alerts: ["command_alert", "rewarded_message", "alert_burst"],
};

const TEST_PATHS = {
  chat: "/overlay/test/chat",
  leaderboard: "/overlay/test/leaderboard",
  alerts: "/overlay/test/alert",
};
const LIMITS = { display_name: 64, message: 500, label: 80, points: [1, 1000] };
const SAFE_APPEARANCE_QUERY_KEYS = new Set([
  "preset", "period", "layout", "max_messages", "message_ttl_seconds", "font_size_px",
  "display_mode", "theme", "font_family", "line_height", "text_edge", "text_edge_strength",
  "platform_marker", "panel_color", "panel_opacity", "panel_image", "panel_image_fit",
  "panel_image_scope", "border_width", "border_color", "border_radius",
]);

export function testPathForSurface(surface) {
  return TEST_PATHS[surface] || TEST_PATHS.chat;
}

export function scenariosForSurface(surface) {
  return DEBUG_SCENARIOS[surface] || DEBUG_SCENARIOS.chat;
}

export function isDebugScenarioCompatible(surface, payload) {
  return Boolean(
    payload && typeof payload === "object" && scenariosForSurface(surface).includes(payload.scenario)
  );
}

export function buildOverlayTestURL(surface, options = {}) {
  const url = new URL(testPathForSurface(surface), options.origin || "http://127.0.0.1");
  const appearance = options.appearance && typeof options.appearance === "object" ? options.appearance : {};
  Object.entries(appearance).forEach(function ([key, value]) {
    if (value !== "" && value != null && SAFE_APPEARANCE_QUERY_KEYS.has(key)) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.href;
}

export function validateDebugScenario(payload) {
  const errors = {};
  if (!Object.values(DEBUG_SCENARIOS).flat().includes(payload.scenario)) {
    errors.scenario = "scenario";
  }
  ["display_name", "message", "label"].forEach(function (field) {
    if (Array.from(payload[field] || "").length > LIMITS[field]) {
      errors[field] = field;
    }
  });
  if (payload.points !== undefined && (!Number.isInteger(payload.points) || payload.points < 1 || payload.points > 1000)) {
    errors.points = "points";
  }
  return errors;
}

export { LIMITS };
