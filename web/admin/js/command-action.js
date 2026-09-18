export const COMMAND_ACTION_ALERT = "alert";
export const COMMAND_ACTION_SHOW_LEADERBOARD = "show_leaderboard";
export const COMMAND_ACTION_LIKE = "like";
export const COMMAND_ACTION_BUFF = "buff";

export function normalizeCommandAction(value) {
  if (value === COMMAND_ACTION_SHOW_LEADERBOARD) {
    return COMMAND_ACTION_SHOW_LEADERBOARD;
  }
  if (value === COMMAND_ACTION_LIKE) {
    return COMMAND_ACTION_LIKE;
  }
  if (value === COMMAND_ACTION_BUFF) {
    return COMMAND_ACTION_BUFF;
  }
  return COMMAND_ACTION_ALERT;
}

export function commandUsesAlertPresentation(value) {
  return normalizeCommandAction(value) === COMMAND_ACTION_ALERT;
}

export function buildCommandPayload(common, presentation) {
  const action = normalizeCommandAction(common && common.action);
  const payload = {
    trigger: String(common && common.trigger || ""),
    aliases: Array.isArray(common && common.aliases) ? common.aliases : [],
    enabled: common ? Boolean(common.enabled) : true,
    action: action,
    cooldown_seconds: Number(common && common.cooldown_seconds),
  };
  if (action === COMMAND_ACTION_ALERT) {
    return Object.assign(payload, presentation || {});
  }
  if (action === COMMAND_ACTION_LIKE) {
    return Object.assign(payload, {
      award_id: String(common && common.award_id != null ? common.award_id : ""),
    });
  }
  if (action === COMMAND_ACTION_BUFF) {
    return Object.assign(payload, {
      points: Number(common && common.points),
    });
  }
  return payload;
}
