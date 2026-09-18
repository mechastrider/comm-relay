"use strict";

export const COMMAND_OUTCOME_REJECTED_DISPLAY_MS = 5000;

/**
 * @typedef {{
 *   trigger: string,
 *   status: "fired"|"cooldown"|"rejected",
 *   cooldown_expires_at_ms: number|null,
 *   rejected_expires_at_ms?: number|null,
 *   reason?: string,
 *   reason_label?: string,
 * }} NormalizedCommandOutcome
 */

/**
 * @param {string} platform
 * @param {string} id
 * @returns {string}
 */
export function commandOutcomeMessageKey(platform, id) {
  if (typeof platform !== "string" || platform === "" || typeof id !== "string" || id === "") {
    return "";
  }
  return platform + "\0" + id;
}

/**
 * @param {unknown} raw
 * @param {number} [nowMs]
 * @returns {NormalizedCommandOutcome|null}
 */
export function commandOutcomeFromRecentField(raw, nowMs) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const status =
    raw.status === "fired" || raw.status === "cooldown" || raw.status === "rejected"
      ? raw.status
      : "";
  if (status === "") {
    return null;
  }
  const trigger = typeof raw.trigger === "string" ? raw.trigger : "";
  const now = typeof nowMs === "number" ? nowMs : Date.now();
  const remainingMs = typeof raw.cooldown_remaining_ms === "number" ? raw.cooldown_remaining_ms : 0;
  const reason = typeof raw.reason === "string" ? raw.reason : "";
  const reasonLabel = typeof raw.reason_label === "string" ? raw.reason_label : "";

  if (status === "rejected") {
    return {
      trigger: trigger,
      status: "rejected",
      cooldown_expires_at_ms: null,
      rejected_expires_at_ms: now + COMMAND_OUTCOME_REJECTED_DISPLAY_MS,
      reason: reason,
      reason_label: reasonLabel,
    };
  }

  return {
    trigger: trigger,
    status: status,
    cooldown_expires_at_ms: status === "cooldown"
      ? now + Math.max(0, remainingMs)
      : null,
    reason: reason,
    reason_label: reasonLabel,
  };
}

/**
 * @param {unknown} wire command_outcome WebSocket frame
 * @param {number} [nowMs]
 * @returns {{ platform: string, id: string, outcome: NormalizedCommandOutcome }|null}
 */
export function commandOutcomeFromWire(wire, nowMs) {
  if (!wire || typeof wire !== "object" || wire.type !== "command_outcome") {
    return null;
  }
  const platform = typeof wire.message_platform === "string" ? wire.message_platform : "";
  const id = typeof wire.message_id === "string" ? wire.message_id : "";
  if (platform === "" || id === "") {
    return null;
  }
  const outcome = commandOutcomeFromRecentField(wire, nowMs);
  if (!outcome) {
    return null;
  }
  return { platform: platform, id: id, outcome: outcome };
}

/**
 * @param {number|null|undefined} expiresAtMs
 * @param {number} nowMs
 * @returns {number}
 */
export function cooldownSecondsRemaining(expiresAtMs, nowMs) {
  if (typeof expiresAtMs !== "number" || !Number.isFinite(expiresAtMs)) {
    return 0;
  }
  return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
}

/**
 * @param {NormalizedCommandOutcome|null|undefined} outcome
 * @param {number} nowMs
 * @returns {boolean}
 */
export function isCooldownOutcomeActive(outcome, nowMs) {
  if (!outcome || outcome.status !== "cooldown") {
    return false;
  }
  return cooldownSecondsRemaining(outcome.cooldown_expires_at_ms, nowMs) > 0;
}

/**
 * @param {NormalizedCommandOutcome|null|undefined} outcome
 * @param {number} nowMs
 * @returns {boolean}
 */
export function isRejectedOutcomeActive(outcome, nowMs) {
  if (!outcome || outcome.status !== "rejected") {
    return false;
  }
  if (typeof outcome.rejected_expires_at_ms !== "number") {
    return true;
  }
  return nowMs < outcome.rejected_expires_at_ms;
}

/**
 * @param {NormalizedCommandOutcome|null|undefined} outcome
 * @param {(key: string, params?: Record<string, unknown>) => string} translate
 * @returns {string}
 */
export function commandOutcomeReasonLabel(outcome, translate) {
  if (!outcome || outcome.status !== "rejected") {
    return "";
  }
  const direct = String(outcome.reason_label || "").trim();
  if (direct !== "") {
    return direct;
  }
  const reason = String(outcome.reason || "").trim();
  if (reason !== "") {
    const key = "msg.commandReject." + reason;
    const mapped = translate(key);
    if (mapped !== key) {
      return mapped;
    }
  }
  return translate("msg.commandRejected");
}

/**
 * @param {NormalizedCommandOutcome|null|undefined} outcome
 * @param {number} nowMs
 * @returns {"accepted"|"cooldown"|"rejected"|""}
 */
export function commandOutcomeChromeKind(outcome, nowMs) {
  if (!outcome) {
    return "";
  }
  if (outcome.status === "fired") {
    return "accepted";
  }
  if (isCooldownOutcomeActive(outcome, nowMs)) {
    return "cooldown";
  }
  if (isRejectedOutcomeActive(outcome, nowMs)) {
    return "rejected";
  }
  return "";
}

const OUTCOME_BADGE_CLASS = "message-list__command-outcome";

/**
 * @param {HTMLElement} item
 * @param {NormalizedCommandOutcome|null|undefined} outcome
 * @param {number} nowMs
 * @param {(key: string, params?: Record<string, unknown>) => string} translate
 */
export function applyCommandOutcomeChrome(item, outcome, nowMs, translate) {
  if (!item) {
    return;
  }
  const kind = commandOutcomeChromeKind(outcome, nowMs);
  item.classList.toggle("message-list__item--command-accepted", kind === "accepted");
  item.classList.toggle("message-list__item--command-cooldown", kind === "cooldown");
  item.classList.toggle("message-list__item--command-rejected", kind === "rejected");

  let badge = item.querySelector("." + OUTCOME_BADGE_CLASS);
  if (kind === "") {
    if (badge) {
      badge.remove();
    }
    item.removeAttribute("aria-label");
    return;
  }

  const meta = item.querySelector(".message-list__meta");
  if (!meta) {
    return;
  }
  if (!badge) {
    badge = document.createElement("span");
    badge.className = OUTCOME_BADGE_CLASS;
    badge.setAttribute("role", "status");
    meta.appendChild(badge);
  }

  if (kind === "accepted") {
    const label = translate("msg.commandAccepted");
    badge.textContent = label;
    badge.setAttribute("aria-label", label);
    item.setAttribute("aria-label", label);
    return;
  }

  if (kind === "rejected") {
    const reasonText = commandOutcomeReasonLabel(outcome, translate);
    const frozenLabel = translate("msg.commandRejectedFrozen");
    badge.textContent = reasonText;
    badge.setAttribute("aria-label", frozenLabel + ". " + reasonText);
    item.setAttribute("aria-label", frozenLabel + ". " + reasonText);
    return;
  }

  const seconds = cooldownSecondsRemaining(outcome.cooldown_expires_at_ms, nowMs);
  const remainingLabel = translate("msg.commandCooldownRemaining", { seconds: seconds });
  const frozenLabel = translate("msg.commandCooldownFrozen");
  badge.textContent = remainingLabel;
  badge.setAttribute("aria-label", frozenLabel + ". " + remainingLabel);
  item.setAttribute("aria-label", frozenLabel + ". " + remainingLabel);
}

/**
 * @param {ParentNode} listRoot
 * @param {string} platform
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export function findMessageListItemByPlatformId(listRoot, platform, id) {
  if (!listRoot || platform === "" || id === "") {
    return null;
  }
  const items = listRoot.querySelectorAll("li[data-message-id]");
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item.dataset.messagePlatform === platform && item.dataset.messageId === id) {
      return item;
    }
  }
  return null;
}

/**
 * @param {unknown} message
 * @param {number} [nowMs]
 * @returns {unknown}
 */
export function normalizeMessageCommandOutcome(message, nowMs) {
  if (!message || typeof message !== "object") {
    return message;
  }
  const raw = message.command_outcome;
  if (!raw) {
    return message;
  }
  const outcome = commandOutcomeFromRecentField(raw, nowMs);
  if (!outcome) {
    return message;
  }
  return Object.assign({}, message, { command_outcome: outcome });
}
