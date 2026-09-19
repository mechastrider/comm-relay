"use strict";

let awardsCache = null;
let awardsCachePromise = null;

const LIKE_AWARD_ID = "like";
const SVG_NS = "http://www.w3.org/2000/svg";

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asAwardIdList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids = [];
  const seen = new Set();
  value.forEach(function (id) {
    const trimmed = trimString(id);
    if (trimmed === "" || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    ids.push(trimmed);
  });
  return ids;
}

export function grantedAwardIdsFromMessage(message) {
  if (!message || typeof message !== "object") {
    return [];
  }
  return asAwardIdList(message.granted_award_ids);
}

export function isAwardGranted(message, awardId) {
  const id = trimString(awardId);
  if (id === "") {
    return false;
  }
  return grantedAwardIdsFromMessage(message).includes(id);
}

export function markAwardGranted(message, awardId) {
  const id = trimString(awardId);
  if (!message || typeof message !== "object" || id === "") {
    return;
  }
  const ids = grantedAwardIdsFromMessage(message);
  if (!ids.includes(id)) {
    ids.push(id);
  }
  message.granted_award_ids = ids;
}

export function isAwardGrantConflict(error) {
  return Boolean(error && error.alreadyGranted);
}

export function messageCanBeRewarded(message) {
  if (!message || typeof message !== "object") {
    return false;
  }
  return trimString(message.user_id) !== "" && trimString(message.platform) !== "";
}

export function awardGrantRequest(message, award) {
  const body = {
    platform: message.platform,
    user_id: message.user_id,
    award_id: typeof award.id === "string" ? award.id : "",
  };
  if (typeof message.id === "string" && message.id !== "") {
    body.message_id = message.id;
  }
  if (typeof message.message === "string" && message.message !== "") {
    body.message_text = message.message;
  }
  return body;
}

export function awardGrantStatus(t, award) {
  const name = typeof award.name === "string" ? award.name : award.id;
  const points = typeof award.points === "number" ? award.points : 0;
  return t("reward.grantSucceeded", { award: name, points: points });
}

export function awardGrantFailure(t) {
  return t("reward.grantFailed");
}

export function awardAlreadyGrantedStatus(t) {
  return t("reward.alreadyGranted");
}

export function getCachedAwards() {
  return awardsCache;
}

export function findLikeAward(awards) {
  if (!Array.isArray(awards)) {
    return null;
  }
  const found = awards.find(function (award) {
    return award && award.id === LIKE_AWARD_ID;
  });
  return found || null;
}

export function pickerAwardsFromCatalog(awards) {
  if (!Array.isArray(awards)) {
    return [];
  }
  return awards.filter(function (award) {
    return award && award.id !== LIKE_AWARD_ID;
  });
}

export function createGrantFeedbackElement() {
  const feedback = document.createElement("p");
  feedback.className = "message-list__grant-feedback";
  feedback.hidden = true;
  return feedback;
}

export function createGrantFeedbackReporter(feedbackElement, t) {
  return {
    reportSuccess: function (award) {
      if (!feedbackElement) {
        return;
      }
      feedbackElement.hidden = false;
      feedbackElement.setAttribute("role", "status");
      feedbackElement.setAttribute("aria-live", "polite");
      feedbackElement.textContent = awardGrantStatus(t, award);
    },
    reportAlreadyGranted: function () {
      if (!feedbackElement) {
        return;
      }
      feedbackElement.hidden = false;
      feedbackElement.setAttribute("role", "status");
      feedbackElement.setAttribute("aria-live", "polite");
      feedbackElement.textContent = awardAlreadyGrantedStatus(t);
    },
    reportFailure: function () {
      if (!feedbackElement) {
        return;
      }
      feedbackElement.hidden = false;
      feedbackElement.setAttribute("role", "alert");
      feedbackElement.removeAttribute("aria-live");
      feedbackElement.textContent = awardGrantFailure(t);
    },
  };
}

function closePicker(picker, trigger) {
  if (picker && picker.parentNode) {
    picker.parentNode.removeChild(picker);
  }
  if (trigger) {
    restoreRewardTrigger(trigger);
  }
}

export function restoreRewardTrigger(trigger) {
  trigger.setAttribute("aria-expanded", "false");
  trigger.disabled = false;
  trigger.focus();
}

export function enableRewardRetry(trigger) {
  trigger.disabled = false;
}

export function setRewardItemPending(item, pending) {
  if (!item) {
    return;
  }
  item.disabled = pending;
  item.setAttribute("aria-busy", pending ? "true" : "false");
}

function positionPicker(picker, trigger, flipClass) {
  const triggerRect = trigger.getBoundingClientRect();
  const panel = trigger.closest(".message-panel") || document.documentElement;
  const panelRect = panel.getBoundingClientRect();
  const maxHeight = Math.max(120, panelRect.bottom - triggerRect.bottom - 12);
  const flipMaxHeight = Math.max(120, triggerRect.top - panelRect.top - 12);

  picker.style.maxHeight = String(maxHeight) + "px";
  picker.classList.remove(flipClass);

  const spaceBelow = panelRect.bottom - triggerRect.bottom;
  const estimatedHeight = Math.min(picker.scrollHeight || 180, maxHeight);
  if (spaceBelow < estimatedHeight + 8 && triggerRect.top - panelRect.top > estimatedHeight + 8) {
    picker.classList.add(flipClass);
    picker.style.maxHeight = String(flipMaxHeight) + "px";
  }
}

async function loadAwards(resolveURL) {
  if (awardsCache) {
    return awardsCache;
  }
  if (awardsCachePromise) {
    return awardsCachePromise;
  }

  awardsCachePromise = fetch(resolveURL("/api/awards"))
    .then(function (response) {
      if (!response.ok) {
        throw new Error("list awards failed");
      }
      return response.json();
    })
    .then(function (payload) {
      const awards = payload && Array.isArray(payload.awards) ? payload.awards : [];
      awardsCache = awards;
      awardsCachePromise = null;
      return awards;
    })
    .catch(function (err) {
      awardsCachePromise = null;
      throw err;
    });

  return awardsCachePromise;
}

export function prefetchAwards(resolveURL) {
  return loadAwards(resolveURL);
}

export function invalidateAwardsCache() {
  awardsCache = null;
  awardsCachePromise = null;
}

function buildPickerItem(award, onSelect, granted) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "reward-picker__item";
  item.dataset.awardId = typeof award.id === "string" ? award.id : "";
  const name = typeof award.name === "string" ? award.name : award.id;
  const points = typeof award.points === "number" ? award.points : 0;
  item.textContent = name + " (+" + String(points) + ")";
  if (granted) {
    item.disabled = true;
    item.classList.add("is-granted");
    item.setAttribute("aria-disabled", "true");
    return item;
  }
  item.addEventListener("click", function () {
    onSelect(award, item);
  });
  return item;
}

function likeAwardLabel(award) {
  const name = typeof award.name === "string" && award.name.trim() !== ""
    ? award.name.trim()
    : LIKE_AWARD_ID;
  return name;
}

function createStrokeIcon(paths) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  paths.forEach(function (d) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  });
  return svg;
}

function createThumbsUpIcon() {
  const svg = createStrokeIcon([
    "M7 11v8",
    "M11 11V7.5a2.5 2.5 0 0 1 5 0V11h3.2a1.5 1.5 0 0 1 1.4 2.1l-2.2 6.4A2 2 0 0 1 17.6 20H11",
  ]);
  return svg;
}

function createMedalIcon() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "8");
  circle.setAttribute("r", "5.5");
  svg.appendChild(circle);
  const ribbon = document.createElementNS(SVG_NS, "path");
  ribbon.setAttribute("d", "M8.2 13.4 7 21l5-3 5 3-1.2-7.6");
  svg.appendChild(ribbon);
  return svg;
}

function createTrashIcon() {
  return createStrokeIcon([
    "M4 7h16",
    "M9 7V5h6v2",
    "M7 7l1 13h8l1-13",
  ]);
}

function appendTooltip(button, label) {
  const tooltip = document.createElement("span");
  tooltip.className = "ui-tooltip";
  tooltip.textContent = label;
  button.appendChild(tooltip);
}

function applyLikeGrantedChrome(button) {
  if (!button) {
    return;
  }
  button.disabled = true;
  button.classList.add("is-used");
}

function resolveFeedback(options, button) {
  if (options.feedback) {
    return options.feedback;
  }
  if (options.feedbackElement) {
    return createGrantFeedbackReporter(options.feedbackElement, options.t);
  }
  let legacyNode = null;
  function ensureLegacy() {
    if (!legacyNode && button.parentNode) {
      legacyNode = document.createElement("p");
      legacyNode.className = "message-list__grant-feedback";
      button.parentNode.appendChild(legacyNode);
    }
    return legacyNode;
  }
  return {
    reportSuccess: function (award) {
      const node = ensureLegacy();
      if (node) {
        node.hidden = false;
        node.setAttribute("role", "status");
        node.setAttribute("aria-live", "polite");
        node.textContent = awardGrantStatus(options.t, award);
      }
    },
    reportAlreadyGranted: function () {
      const node = ensureLegacy();
      if (node) {
        node.hidden = false;
        node.setAttribute("role", "status");
        node.setAttribute("aria-live", "polite");
        node.textContent = awardAlreadyGrantedStatus(options.t);
      }
    },
    reportFailure: function () {
      const node = ensureLegacy();
      if (node) {
        node.hidden = false;
        node.setAttribute("role", "alert");
        node.removeAttribute("aria-live");
        node.textContent = awardGrantFailure(options.t);
      }
    },
  };
}

async function postAwardGrant(message, award, resolveURL) {
  const response = await fetch(resolveURL("/api/awards/grant"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(awardGrantRequest(message, award)),
  });
  if (response.status === 409) {
    const error = new Error("award already granted");
    error.alreadyGranted = true;
    throw error;
  }
  if (!response.ok) {
    throw new Error("grant failed");
  }
}

export function createStreamerLikeControl(message, options) {
  const likeAward = options.likeAward;
  if (!likeAward) {
    return null;
  }
  const resolveURL = options.resolveURL;
  const label = likeAwardLabel(likeAward);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "message-list__like message-list__icon-button has-tooltip";
  button.setAttribute("aria-label", label);
  button.appendChild(createThumbsUpIcon());
  appendTooltip(button, label);

  const feedback = resolveFeedback(options, button);
  let grantInFlight = false;

  if (isAwardGranted(message, LIKE_AWARD_ID)) {
    applyLikeGrantedChrome(button);
  }

  button.addEventListener("click", async function () {
    if (grantInFlight || button.disabled || isAwardGranted(message, LIKE_AWARD_ID)) {
      return;
    }
    grantInFlight = true;
    button.disabled = true;
    try {
      await postAwardGrant(message, likeAward, resolveURL);
      markAwardGranted(message, LIKE_AWARD_ID);
      applyLikeGrantedChrome(button);
      feedback.reportSuccess(likeAward);
    } catch (error) {
      if (isAwardGrantConflict(error)) {
        markAwardGranted(message, LIKE_AWARD_ID);
        applyLikeGrantedChrome(button);
        feedback.reportAlreadyGranted();
      } else {
        feedback.reportFailure();
        button.disabled = false;
      }
    } finally {
      grantInFlight = false;
    }
  });

  return button;
}

export function mountMessageGrantActions(actionsContainer, feedbackElement, message, options) {
  if (!messageCanBeRewarded(message) || !actionsContainer) {
    return;
  }
  const awards = getCachedAwards();
  const likeAward = findLikeAward(awards);
  const grantOptions = Object.assign({}, options, { feedbackElement: feedbackElement });
  if (likeAward) {
    const likeControl = createStreamerLikeControl(message, Object.assign({}, grantOptions, { likeAward: likeAward }));
    if (likeControl) {
      actionsContainer.appendChild(likeControl);
    }
  }
  actionsContainer.appendChild(createRewardControl(message, grantOptions));
}

export function createMessageDeleteControl(message, options) {
  const t = options.t;
  const displayName = options.displayName;
  const labelKey = options.labelKey || "msg.delete";
  const ariaKey = options.ariaKey || "msg.deleteAria";
  const label = t(labelKey);
  const ariaLabel = t(ariaKey, { user: displayName(message) });

  const button = document.createElement("button");
  button.type = "button";
  if (options.iconOnly) {
    button.className = "message-list__delete message-list__icon-button message-list__icon-button--delete has-tooltip";
    button.setAttribute("aria-label", ariaLabel);
    button.appendChild(createTrashIcon());
    appendTooltip(button, label);
  } else {
    button.className = "message-list__delete";
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
  }
  button.addEventListener("click", function () {
    if (typeof options.onDelete === "function") {
      options.onDelete(message, button);
    }
  });
  return button;
}

export function createRewardControl(message, options) {
  const t = options.t;
  const resolveURL = options.resolveURL;
  const displayName = options.displayName;
  const flipClass = options.flipClass || "reward-picker--flip";
  const iconOnly = Boolean(options.iconOnly);

  const button = document.createElement("button");
  button.type = "button";
  if (iconOnly) {
    button.className = "message-list__reward message-list__icon-button has-tooltip";
    button.appendChild(createMedalIcon());
  } else {
    button.className = "message-list__reward has-tooltip";
    button.textContent = t("reward.action");
  }
  button.setAttribute("aria-label", t("reward.actionAria", { user: displayName(message) }));
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");
  appendTooltip(button, t("reward.action"));

  const feedback = resolveFeedback(options, button);

  let activePicker = null;
  let dismissHandler = null;
  let grantInFlight = false;

  function dismissPicker() {
    if (grantInFlight) {
      return false;
    }
    if (dismissHandler) {
      document.removeEventListener("pointerdown", dismissHandler, true);
      document.removeEventListener("keydown", dismissHandler, true);
      dismissHandler = null;
    }
    if (activePicker) {
      closePicker(activePicker, button);
      activePicker = null;
    }
    return true;
  }

  async function openPicker() {
    if (activePicker || button.disabled) {
      return;
    }

    button.disabled = true;

    const picker = document.createElement("div");
    picker.className = "reward-picker";
    picker.setAttribute("role", "menu");
    picker.tabIndex = -1;

    const status = document.createElement("p");
    status.className = "reward-picker__status";
    status.textContent = t("reward.loading");
    picker.appendChild(status);
    document.body.appendChild(picker);
    activePicker = picker;
    button.setAttribute("aria-expanded", "true");

    const triggerRect = button.getBoundingClientRect();
    picker.style.position = "fixed";
    picker.style.left = String(Math.max(8, triggerRect.left)) + "px";
    picker.style.top = String(triggerRect.bottom + 4) + "px";
    picker.style.minWidth = String(Math.max(160, triggerRect.width)) + "px";

    dismissHandler = function (event) {
      if (event.type === "keydown") {
        if (event.key === "Escape") {
          event.preventDefault();
          dismissPicker();
        }
        return;
      }
      const target = event.target;
      if (picker.contains(target) || button.contains(target)) {
        return;
      }
      dismissPicker();
    };
    document.addEventListener("pointerdown", dismissHandler, true);
    document.addEventListener("keydown", dismissHandler, true);

    let awards;
    try {
      awards = pickerAwardsFromCatalog(await loadAwards(resolveURL));
    } catch {
      status.textContent = awardGrantFailure(t);
      status.setAttribute("role", "alert");
      enableRewardRetry(button);
      return;
    }

    picker.textContent = "";
    if (!awards || awards.length === 0) {
      const empty = document.createElement("p");
      empty.className = "reward-picker__empty";
      empty.textContent = t("reward.emptyCatalog");
      picker.appendChild(empty);
      positionPicker(picker, button, flipClass);
      enableRewardRetry(button);
      picker.focus();
      return;
    }

    const list = document.createElement("div");
    list.className = "reward-picker__list";
    list.setAttribute("role", "none");

    const items = awards.map(function (award) {
      return buildPickerItem(award, function (selectedAward, selectedItem) {
        grantSelected(selectedAward, selectedItem);
      }, isAwardGranted(message, award && award.id));
    });
    items.forEach(function (item) { list.appendChild(item); });
    picker.appendChild(list);
    positionPicker(picker, button, flipClass);
    enableRewardRetry(button);
    const choosable = items.filter(function (item) { return !item.disabled; });
    if (choosable.length > 0) {
      choosable[0].focus();
    } else {
      picker.focus();
    }

    picker.addEventListener("keydown", function (event) {
      if (choosable.length === 0) {
        return;
      }
      const currentIndex = choosable.indexOf(document.activeElement);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = currentIndex < choosable.length - 1 ? currentIndex + 1 : 0;
        choosable[next].focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : choosable.length - 1;
        choosable[prev].focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        choosable[0].focus();
      } else if (event.key === "End") {
        event.preventDefault();
        choosable[choosable.length - 1].focus();
      }
    });
  }

  async function grantSelected(award, selectedItem) {
    if (!award || grantInFlight || !activePicker || isAwardGranted(message, award.id)) {
      return;
    }

    const requestPicker = activePicker;
    grantInFlight = true;
    button.disabled = true;
    setRewardItemPending(selectedItem, true);

    let errorNode = activePicker && activePicker.querySelector(".reward-picker__error");
    if (errorNode) {
      errorNode.remove();
    }

    try {
      await postAwardGrant(message, award, resolveURL);
      markAwardGranted(message, award.id);
      grantInFlight = false;
      if (activePicker === requestPicker) {
        dismissPicker();
      }
      feedback.reportSuccess(award);
    } catch (error) {
      grantInFlight = false;
      if (isAwardGrantConflict(error)) {
        markAwardGranted(message, award.id);
        if (activePicker === requestPicker) {
          dismissPicker();
        }
        feedback.reportAlreadyGranted();
        return;
      }
      enableRewardRetry(button);
      setRewardItemPending(selectedItem, false);
      if (selectedItem) {
        selectedItem.focus();
      }
      if (activePicker === requestPicker) {
        const err = document.createElement("p");
        err.className = "reward-picker__error";
        err.setAttribute("role", "alert");
        err.textContent = awardGrantFailure(t);
        activePicker.insertBefore(err, activePicker.firstChild);
      }
    }
  }

  button.addEventListener("click", function () {
    if (activePicker) {
      dismissPicker();
      return;
    }
    openPicker();
  });

  return button;
}
