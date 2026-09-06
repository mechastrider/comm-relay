const VISIBILITY_STATES = new Set(["hidden", "timed", "pinned"]);
const VISIBILITY_POLICIES = new Set(["always", "automatic", "on_request"]);

export function isProductionLeaderboard(options) {
  return !options?.previewEnabled && !options?.debugTestEnabled;
}

export function parseLeaderboardVisibility(frame) {
  if (!frame || frame.type !== "leaderboard_visibility") {
    return null;
  }
  const state = String(frame.state || "");
  const policy = String(frame.policy || "");
  if (!VISIBILITY_STATES.has(state) || !VISIBILITY_POLICIES.has(policy)) {
    return null;
  }
  const visibleUntil = typeof frame.visible_until === "string" ? frame.visible_until : null;
  return {
    state: state,
    policy: policy,
    visible: state !== "hidden" && frame.visible !== false,
    visibleUntil: visibleUntil,
    reason: String(frame.reason || "policy"),
  };
}
