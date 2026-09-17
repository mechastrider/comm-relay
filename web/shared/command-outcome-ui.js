"use strict";

/**
 * @typedef {{ trigger: string, status: "fired"|"cooldown", cooldown_expires_at_ms: number|null }} NormalizedCommandOutcome
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
  const status = raw.status === "fired" || raw.status === "cooldown" ? raw.status : "";
  if (status === "") {
    return null;
  }
  const trigger = typeof raw.trigger === "string" ? raw.trigger : "";
  const remainingMs = typeof raw.cooldown_remaining_ms === "number" ? raw.cooldown_remaining_ms : 0;
  return {
    trigger: trigger,
    status: status,
    cooldown_expires_at_ms: status === "cooldown"
      ? (typeof nowMs === "number" ? nowMs : Date.now()) + Math.max(0, remainingMs)
      : null,
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
 * @returns {"accepted"|"cooldown"|""}
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
