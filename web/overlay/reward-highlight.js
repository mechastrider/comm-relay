"use strict";

export const REWARD_HIGHLIGHT_MS = 2500;

export function rewardMessageKey(platform, id) {
  if (typeof platform !== "string" || platform === "" || typeof id !== "string" || id === "") {
    return "";
  }
  return platform + "\0" + id;
}

export function awardMessageKey(alert) {
  if (!alert || alert.source !== "award") {
    return "";
  }
  return rewardMessageKey(alert.message_platform, alert.message_id);
}

export function rewardLabelText(alert) {
  const awardName = typeof alert?.award_name === "string" ? alert.award_name.trim() : "";
  const points = typeof alert?.points === "number" && alert.points > 0 ? "+" + String(alert.points) : "";
  return [awardName, points].filter(Boolean).join(" ");
}

export function findRewardedEntry(entries, alert) {
  const key = awardMessageKey(alert);
  if (key === "" || !Array.isArray(entries)) {
    return null;
  }
  return entries.find(function (entry) {
    return entry.messageKey === key;
  }) || null;
}

export function restartRewardHighlight(entry, alert, options) {
  if (!entry) {
    return false;
  }
  if (entry.rewardTimer !== null && entry.rewardTimer !== undefined) {
    options.clearTimeout(entry.rewardTimer);
  }
  entry.reward = alert;
  options.onStart(entry, alert);
  entry.rewardTimer = options.setTimeout(function () {
    entry.rewardTimer = null;
    entry.reward = null;
    options.onEnd(entry);
  }, REWARD_HIGHLIGHT_MS);
  return true;
}
