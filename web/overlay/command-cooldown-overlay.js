"use strict";

import { rewardMessageKey } from "./reward-highlight.js";

export const COMMAND_COOLDOWN_OVERLAY_MS = 5000;
export const COMMAND_OUTCOME_WAIT_MS = 2500;

export function commandOutcomeMessageKey(platform, id) {
  return rewardMessageKey(platform, id);
}

export function commandOutcomeKeyFromFrame(outcome) {
  if (!outcome || typeof outcome !== "object") {
    return "";
  }
  return commandOutcomeMessageKey(outcome.message_platform, outcome.message_id);
}

export function isCommandOutcomeFreezeStatus(status) {
  return status === "cooldown" || status === "rejected";
}

export function shouldIgnoreCommandOutcome(outcome, hideCommandCooldownOverlay) {
  if (hideCommandCooldownOverlay) {
    return true;
  }
  if (!outcome || typeof outcome !== "object") {
    return true;
  }
  return !isCommandOutcomeFreezeStatus(outcome.status);
}

export function shouldHoldCommandMessageForOutcome(
  hideCommandMessages,
  isCommand,
  hasPendingCooldown
) {
  if (hasPendingCooldown === true) {
    return false;
  }
  return hideCommandMessages === true && isCommand === true;
}

export function shouldClearRenderedMessageDedupeKey(hasVisibleEntry) {
  return hasVisibleEntry !== true;
}

export function planCommandOutcomeHandling(
  outcome,
  hideCommandCooldownOverlay,
  hideCommandMessages,
  hasEntry,
  hasHeldMessage
) {
  if (!outcome || typeof outcome !== "object") {
    return { action: "ignore", key: "" };
  }
  const key = commandOutcomeKeyFromFrame(outcome);
  if (key === "") {
    return { action: "ignore", key: "" };
  }
  if (outcome.status === "fired") {
    return {
      action: "fired",
      key: key,
      dropHeldMessage: hasHeldMessage,
      removeVisibleEntry: hideCommandMessages && hasEntry,
    };
  }
  if (!isCommandOutcomeFreezeStatus(outcome.status)) {
    return { action: "ignore", key: key };
  }
  if (hideCommandCooldownOverlay) {
    return {
      action: "cooldown_suppressed",
      key: key,
      dropHeldMessage: hasHeldMessage,
    };
  }
  if (hasEntry) {
    return { action: "cooldown_apply", key: key };
  }
  if (hasHeldMessage) {
    return { action: "cooldown_show_held", key: key };
  }
  return { action: "cooldown_buffer", key: key };
}

export function shouldRenderHeldCommandMessage(
  hideCommandMessages,
  isCommand,
  forceCommandCooldown
) {
  if (forceCommandCooldown) {
    return true;
  }
  return !shouldHideSuccessfulCommandMessage(
    hideCommandMessages,
    isCommand,
    false,
    false
  );
}

export function shouldHideSuccessfulCommandMessage(
  hideCommandMessages,
  isCommand,
  hasPendingCooldown,
  commandCooldownActive
) {
  if (!isCommand) {
    return false;
  }
  if (commandCooldownActive) {
    return false;
  }
  if (hasPendingCooldown) {
    return false;
  }
  return hideCommandMessages;
}

export function findEntryByMessageKey(entries, key) {
  if (key === "" || !Array.isArray(entries)) {
    return null;
  }
  return entries.find(function (entry) {
    return entry.messageKey === key;
  }) || null;
}

export function rememberPendingCommandCooldown(pending, key) {
  if (key === "" || !pending || typeof pending.set !== "function") {
    return false;
  }
  pending.set(key, true);
  return true;
}

export function takePendingCommandCooldown(pending, key) {
  if (key === "" || !pending || typeof pending.get !== "function") {
    return false;
  }
  if (!pending.has(key)) {
    return false;
  }
  pending.delete(key);
  return true;
}

export function takePendingCommandMessage(pending, key, clearTimeoutFn) {
  if (key === "" || !pending || typeof pending.get !== "function") {
    return null;
  }
  const held = pending.get(key);
  if (!held) {
    return null;
  }
  if (held.waitTimer !== null && held.waitTimer !== undefined && typeof clearTimeoutFn === "function") {
    clearTimeoutFn(held.waitTimer);
  }
  pending.delete(key);
  return held.frame || null;
}

export function clearPendingCommandMessage(pending, key, clearTimeoutFn) {
  if (key === "" || !pending || typeof pending.get !== "function") {
    return;
  }
  const held = pending.get(key);
  if (!held) {
    return;
  }
  if (held.waitTimer !== null && held.waitTimer !== undefined && typeof clearTimeoutFn === "function") {
    clearTimeoutFn(held.waitTimer);
  }
  pending.delete(key);
}

export function restartCommandCooldownOverlay(entry, options) {
  if (!entry) {
    return false;
  }
  if (entry.commandCooldownTimer !== null && entry.commandCooldownTimer !== undefined) {
    options.clearTimeout(entry.commandCooldownTimer);
  }
  options.onStart(entry);
  entry.commandCooldownTimer = options.setTimeout(function () {
    entry.commandCooldownTimer = null;
    options.onEnd(entry);
  }, COMMAND_COOLDOWN_OVERLAY_MS);
  return true;
}
