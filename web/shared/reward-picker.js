"use strict";

let awardsCache = null;
let awardsCachePromise = null;

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
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

export function invalidateAwardsCache() {
  awardsCache = null;
  awardsCachePromise = null;
}

function buildPickerItem(award, onSelect) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "reward-picker__item";
  item.dataset.awardId = typeof award.id === "string" ? award.id : "";
  const name = typeof award.name === "string" ? award.name : award.id;
  const points = typeof award.points === "number" ? award.points : 0;
  item.textContent = name + " (+" + String(points) + ")";
  item.addEventListener("click", function () {
    onSelect(award, item);
  });
  return item;
}

export function createRewardControl(message, options) {
  const t = options.t;
  const resolveURL = options.resolveURL;
  const displayName = options.displayName;
  const flipClass = options.flipClass || "reward-picker--flip";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "message-list__reward has-tooltip";
  button.textContent = t("reward.action");
  button.setAttribute("aria-label", t("reward.actionAria", { user: displayName(message) }));
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");

  const tooltip = document.createElement("span");
  tooltip.className = "ui-tooltip";
  tooltip.textContent = t("reward.action");
  button.appendChild(tooltip);

  let activePicker = null;
  let dismissHandler = null;
  let feedback = null;
  let grantInFlight = false;

  function reportFeedback(message) {
    if (!feedback) {
      feedback = document.createElement("p");
      feedback.className = "message-list__reward-feedback";
      feedback.setAttribute("role", "status");
      feedback.setAttribute("aria-live", "polite");
      if (button.parentNode) {
        button.parentNode.appendChild(feedback);
      }
    }
    feedback.textContent = message;
  }

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
    invalidateAwardsCache();

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
      awards = await loadAwards(resolveURL);
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
      });
    });
    items.forEach(function (item) { list.appendChild(item); });
    picker.appendChild(list);
    positionPicker(picker, button, flipClass);
    enableRewardRetry(button);
    items[0].focus();

    picker.addEventListener("keydown", function (event) {
      const currentIndex = items.indexOf(document.activeElement);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next].focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev].focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        items[0].focus();
      } else if (event.key === "End") {
        event.preventDefault();
        items[items.length - 1].focus();
      }
    });
  }

  async function grantSelected(award, selectedItem) {
    if (!award || grantInFlight || !activePicker) {
      return;
    }

    const requestPicker = activePicker;
    grantInFlight = true;
    button.disabled = true;
    setRewardItemPending(selectedItem, true);
    const body = awardGrantRequest(message, award);

    let errorNode = activePicker && activePicker.querySelector(".reward-picker__error");
    if (errorNode) {
      errorNode.remove();
    }

    try {
      const response = await fetch(resolveURL("/api/awards/grant"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error("grant failed");
      }
      grantInFlight = false;
      if (activePicker === requestPicker) {
        dismissPicker();
      }
      reportFeedback(awardGrantStatus(t, award));
    } catch {
      grantInFlight = false;
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
