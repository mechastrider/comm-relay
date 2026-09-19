"use strict";

import {
  applyCommandOutcomeChrome,
  commandOutcomeFromWire,
  commandOutcomeMessageKey,
  findMessageListItemByPlatformId,
  isCooldownOutcomeActive,
  isRejectedOutcomeActive,
  normalizeMessageCommandOutcome,
} from "./command-outcome-ui.js?v=2";

/**
 * @typedef {import("./command-outcome-ui.js").NormalizedCommandOutcome} NormalizedCommandOutcome
 */

/**
 * @param {{
 *   listRoot: ParentNode|null,
 *   translate: (key: string, params?: Record<string, unknown>) => string,
 *   findMessage: (platform: string, id: string) => { command_outcome?: NormalizedCommandOutcome }|null,
 *   setMessageOutcome: (platform: string, id: string, outcome: NormalizedCommandOutcome|null) => void,
 * }} options
 */
export function createCommandOutcomeLive(options) {
  const pending = new Map();

  function rememberPending(platform, id, outcome) {
    const key = commandOutcomeMessageKey(platform, id);
    if (key === "") {
      return;
    }
    pending.set(key, outcome);
  }

  function takePending(platform, id) {
    const key = commandOutcomeMessageKey(platform, id);
    if (key === "" || !pending.has(key)) {
      return null;
    }
    const outcome = pending.get(key);
    pending.delete(key);
    return outcome;
  }

  function applyChrome(platform, id, outcome) {
    const item = findMessageListItemByPlatformId(options.listRoot, platform, id);
    applyCommandOutcomeChrome(item, outcome, Date.now(), options.translate);
  }

  function handleWire(wire) {
    const parsed = commandOutcomeFromWire(wire, Date.now());
    if (!parsed) {
      return;
    }
    const existing = options.findMessage(parsed.platform, parsed.id);
    if (existing) {
      options.setMessageOutcome(parsed.platform, parsed.id, parsed.outcome);
      applyChrome(parsed.platform, parsed.id, parsed.outcome);
      return;
    }
    rememberPending(parsed.platform, parsed.id, parsed.outcome);
  }

  /**
   * @param {HTMLElement} item
   * @param {{ platform?: string, id?: string, command_outcome?: NormalizedCommandOutcome }} message
   */
  function decorateListItem(item, message) {
    const platform = typeof message.platform === "string" ? message.platform : "";
    const id = typeof message.id === "string" ? message.id : "";
    if (id !== "") {
      item.dataset.messagePlatform = platform;
      item.dataset.messageId = id;
    }
    let outcome = message.command_outcome;
    const pendingOutcome = takePending(platform, id);
    if (pendingOutcome) {
      outcome = pendingOutcome;
      options.setMessageOutcome(platform, id, pendingOutcome);
    }
    applyCommandOutcomeChrome(item, outcome, Date.now(), options.translate);
  }

  function tickCooldownLabels() {
    if (!options.listRoot) {
      return;
    }
    const now = Date.now();
    const items = options.listRoot.querySelectorAll("li[data-message-id]");
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const platform = item.dataset.messagePlatform || "";
      const id = item.dataset.messageId || "";
      if (platform === "" || id === "") {
        continue;
      }
      const message = options.findMessage(platform, id);
      const outcome = message && message.command_outcome;
      if (!outcome) {
        continue;
      }
      if (outcome.status === "cooldown") {
        if (!isCooldownOutcomeActive(outcome, now)) {
          options.setMessageOutcome(platform, id, null);
          applyCommandOutcomeChrome(item, null, now, options.translate);
          continue;
        }
        applyCommandOutcomeChrome(item, outcome, now, options.translate);
        continue;
      }
      if (outcome.status === "rejected") {
        if (!isRejectedOutcomeActive(outcome, now)) {
          options.setMessageOutcome(platform, id, null);
          applyCommandOutcomeChrome(item, null, now, options.translate);
          continue;
        }
        applyCommandOutcomeChrome(item, outcome, now, options.translate);
      }
    }
  }

  return {
    handleWire: handleWire,
    decorateListItem: decorateListItem,
    tickCooldownLabels: tickCooldownLabels,
    normalizeMessage: normalizeMessageCommandOutcome,
  };
}
