export const COMMAND_ACTION_ALERT = "alert";
export const COMMAND_ACTION_SHOW_LEADERBOARD = "show_leaderboard";

export function normalizeCommandAction(value) {
  return value === COMMAND_ACTION_SHOW_LEADERBOARD
    ? COMMAND_ACTION_SHOW_LEADERBOARD
    : COMMAND_ACTION_ALERT;
}

export function commandUsesAlertPresentation(value) {
  return normalizeCommandAction(value) === COMMAND_ACTION_ALERT;
}

export function buildCommandPayload(common, presentation) {
  const action = normalizeCommandAction(common && common.action);
  const payload = {
    trigger: String(common && common.trigger || ""),
    enabled: common ? Boolean(common.enabled) : true,
    action: action,
    cooldown_seconds: Number(common && common.cooldown_seconds),
  };
  return action === COMMAND_ACTION_ALERT
    ? Object.assign(payload, presentation || {})
    : payload;
}
