import * as dom from "./dom.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { t } from "./i18n-ui.js";
import { setRegionState } from "./shell-state.js";
import { validateCommandTrigger } from "./audience-helpers.js";
import { parseAudienceHash } from "./audience-tabs.js";
import { parseWorkspaceHash } from "./workspace-router.js";

const FETCH_TIMEOUT_MS = 15000;

/** @type {Array<Record<string, unknown>>} */
let commandsCache = [];
let selectedCommandId = null;
let creatingNew = false;
let listLoadInFlight = null;
let listHasLoaded = false;
let listLoadError = false;
let saveInFlight = false;
let deleteInFlight = false;
let pendingDelete = null;

function isCommandsVisible() {
  return parseWorkspaceHash(window.location.hash) === "audience" &&
    parseAudienceHash(window.location.hash) === "commands";
}

function setFieldError(input, element, message) {
  if (!input || !element) {
    return;
  }
  element.textContent = message || "";
  element.hidden = !message;
  if (message) {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", element.id);
  } else {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  }
}

function clearFieldErrors() {
  setFieldError(dom.commandTriggerInput, dom.commandTriggerError, "");
  setFieldError(dom.commandSplashInput, dom.commandSplashError, "");
}

function setButtonsDisabled(disabled) {
  if (dom.commandsSaveButton) {
    dom.commandsSaveButton.disabled = disabled;
    dom.commandsSaveButton.setAttribute("aria-busy", saveInFlight ? "true" : "false");
  }
  if (dom.commandsDeleteButton) {
    dom.commandsDeleteButton.disabled = disabled || creatingNew || !selectedCommandId;
    dom.commandsDeleteButton.setAttribute("aria-busy", deleteInFlight ? "true" : "false");
  }
  if (dom.commandsCreateButton) {
    dom.commandsCreateButton.disabled = disabled && !listHasLoaded;
  }
  if (dom.commandsEmptyCreate) {
    dom.commandsEmptyCreate.disabled = disabled && !listHasLoaded;
  }
}

function showListError(message) {
  if (!dom.commandsListError) {
    return;
  }
  const body = dom.commandsListError.querySelector(".notice__body");
  if (body) {
    body.textContent = message;
  }
  dom.commandsListError.hidden = false;
  if (dom.commandsListEmpty) {
    dom.commandsListEmpty.hidden = true;
  }
  setRegionState(dom.commandsListRegion, "error");
}

function hideListError() {
  if (dom.commandsListError) {
    dom.commandsListError.hidden = true;
  }
}

function syncEditorVisibility() {
  const hasSelection = creatingNew || selectedCommandId;
  if (dom.commandsEditorForm) {
    dom.commandsEditorForm.hidden = !hasSelection;
  }
  if (dom.commandsEditorEmpty) {
    dom.commandsEditorEmpty.hidden = hasSelection;
  }
  setButtonsDisabled(Boolean(listLoadInFlight) || saveInFlight || deleteInFlight);
}

function renderCommandsList() {
  if (!dom.commandsList) {
    return;
  }

  dom.commandsList.textContent = "";
  commandsCache.forEach(function (cmd) {
    const item = document.createElement("li");
    item.className = "audience-catalog-items__item";
    item.setAttribute("role", "option");
    item.dataset.commandId = String(cmd.id || "");
    if (item.dataset.commandId === selectedCommandId) {
      item.classList.add("audience-catalog-items__item--selected");
      item.setAttribute("aria-selected", "true");
    } else {
      item.setAttribute("aria-selected", "false");
    }
    item.tabIndex = item.dataset.commandId === selectedCommandId ? 0 : -1;

    const trigger = document.createElement("span");
    trigger.className = "audience-catalog-items__primary";
    trigger.textContent = "!" + String(cmd.trigger || "");

    const meta = document.createElement("span");
    meta.className = "audience-catalog-items__meta";
    meta.textContent = cmd.enabled ? t("commands.enabledShort") : t("commands.disabledShort");

    item.append(trigger, meta);
    item.addEventListener("click", function () {
      selectCommand(String(cmd.id || ""), false);
      focusCommandItem(String(cmd.id || ""));
    });
    item.addEventListener("keydown", function (event) {
      if (["ArrowUp", "ArrowDown", "Home", "End", "Enter", " "].indexOf(event.key) === -1) {
        return;
      }
      event.preventDefault();
      const currentIndex = commandsCache.indexOf(cmd);
      let nextIndex = currentIndex;
      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = commandsCache.length - 1;
      } else if (event.key === "ArrowDown") {
        nextIndex = Math.min(commandsCache.length - 1, currentIndex + 1);
      } else if (event.key === "ArrowUp") {
        nextIndex = Math.max(0, currentIndex - 1);
      }
      const next = commandsCache[nextIndex];
      if (next) {
        const nextId = String(next.id || "");
        selectCommand(nextId, false);
        focusCommandItem(nextId);
      }
    });
    dom.commandsList.append(item);
  });

  const isEmpty = commandsCache.length === 0 && listHasLoaded && !listLoadError;
  if (dom.commandsListEmpty) {
    dom.commandsListEmpty.hidden = !isEmpty;
  }
  if (dom.commandsList) {
    dom.commandsList.hidden = isEmpty;
  }

  if (listLoadInFlight && !listHasLoaded) {
    setRegionState(dom.commandsListRegion, "loading");
  } else if (!listLoadError && commandsCache.length > 0) {
    setRegionState(dom.commandsListRegion, null);
  }
}

function focusCommandItem(id) {
  window.requestAnimationFrame(function () {
    const item = dom.commandsList?.querySelector('[data-command-id="' + CSS.escape(id) + '"]');
    if (item instanceof HTMLElement) {
      item.focus();
    }
  });
}

function fillEditorFromCommand(cmd) {
  if (!dom.commandsEditorForm) {
    return;
  }
  if (dom.commandTriggerInput) {
    dom.commandTriggerInput.value = String(cmd.trigger || "");
  }
  if (dom.commandEnabledInput) {
    dom.commandEnabledInput.checked = Boolean(cmd.enabled);
  }
  if (dom.commandCooldownInput) {
    dom.commandCooldownInput.value = String(cmd.cooldown_seconds != null ? cmd.cooldown_seconds : 30);
  }
  if (dom.commandSplashInput) {
    dom.commandSplashInput.value = String(cmd.splash_template || "");
  }
  if (dom.commandSoundInput) {
    dom.commandSoundInput.value = String(cmd.sound || "");
  }
  if (dom.commandDurationInput) {
    dom.commandDurationInput.value = String(cmd.duration_ms != null ? cmd.duration_ms : 5000);
  }
}

function defaultNewCommand() {
  return {
    trigger: "",
    enabled: true,
    cooldown_seconds: 30,
    splash_template: "",
    sound: "",
    duration_ms: 5000,
  };
}

function selectCommand(id, isNew) {
  creatingNew = isNew;
  selectedCommandId = isNew ? null : id;
  clearFieldErrors();

  if (isNew) {
    fillEditorFromCommand(defaultNewCommand());
  } else {
    const cmd = commandsCache.find(function (item) {
      return String(item.id) === id;
    });
    if (cmd) {
      fillEditorFromCommand(cmd);
    }
  }

  renderCommandsList();
  syncEditorVisibility();
}

function readEditorPayload() {
  return {
    trigger: dom.commandTriggerInput ? dom.commandTriggerInput.value : "",
    enabled: dom.commandEnabledInput ? dom.commandEnabledInput.checked : true,
    cooldown_seconds: dom.commandCooldownInput ? Number(dom.commandCooldownInput.value) : 0,
    splash_template: dom.commandSplashInput ? dom.commandSplashInput.value : "",
    sound: dom.commandSoundInput ? dom.commandSoundInput.value : "",
    duration_ms: dom.commandDurationInput ? Number(dom.commandDurationInput.value) : 5000,
  };
}

function applyFieldErrors(fields) {
  if (!fields || typeof fields !== "object") {
    return;
  }
  if (fields.trigger && dom.commandTriggerError) {
    setFieldError(dom.commandTriggerInput, dom.commandTriggerError, fields.trigger);
  }
  if (fields.splash_template && dom.commandSplashError) {
    setFieldError(dom.commandSplashInput, dom.commandSplashError, fields.splash_template);
  }
}

async function fetchCommandsList() {
  const controller = new AbortController();
  const timeout = window.setTimeout(function () {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(apiURL("/api/commands"), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const payload = await readJSON(response);
    if (!response.ok) {
      const message = mapHTTPError(response.status, payload && payload.error);
      throw new Error(message);
    }

    commandsCache = Array.isArray(payload.commands) ? payload.commands : [];
    listHasLoaded = true;
    listLoadError = false;
    hideListError();
    if (!creatingNew) {
      const stillSelected = Boolean(selectedCommandId) && commandsCache.some(function (item) {
        return String(item.id) === selectedCommandId;
      });
      if (!stillSelected && commandsCache.length > 0) {
        selectedCommandId = String(commandsCache[0].id || "");
      }
      if (selectedCommandId) {
        selectCommand(selectedCommandId, false);
        return;
      }
    }
    renderCommandsList();
    syncEditorVisibility();
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loadCommandsCatalog() {
  if (listLoadInFlight) {
    return listLoadInFlight;
  }

  setButtonsDisabled(true);
  listLoadInFlight = fetchCommandsList()
    .catch(function (err) {
      listLoadError = true;
      const message = err instanceof Error && err.message ? err.message : t("commands.loadFailed");
      showListError(message);
    })
    .finally(function () {
      listLoadInFlight = null;
      setButtonsDisabled(false);
      renderCommandsList();
      syncEditorVisibility();
    });

  return listLoadInFlight;
}

async function saveCommand() {
  if (saveInFlight) {
    return;
  }

  clearFieldErrors();
  const payload = readEditorPayload();
  const triggerErrorKey = validateCommandTrigger(payload.trigger);
  if (triggerErrorKey) {
    setFieldError(dom.commandTriggerInput, dom.commandTriggerError, t(triggerErrorKey));
    dom.commandTriggerInput?.focus();
    return;
  }
  if (String(payload.splash_template || "").trim() === "") {
    setFieldError(dom.commandSplashInput, dom.commandSplashError, t("catalog.splashRequired"));
    dom.commandSplashInput?.focus();
    return;
  }
  if (dom.commandsEditorForm && !dom.commandsEditorForm.reportValidity()) {
    return;
  }

  saveInFlight = true;
  setButtonsDisabled(true);

  try {
    const path = creatingNew ? "/api/commands/create" : "/api/commands/update";
    const body = creatingNew
      ? payload
      : Object.assign({ id: selectedCommandId }, payload);

    const response = await fetch(apiURL(path), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await readJSON(response);
    if (!response.ok) {
      applyFieldErrors(data && data.fields);
      const message = mapHTTPError(response.status, data && data.error);
      throw new Error(message);
    }

    creatingNew = false;
    selectedCommandId = String(data.id || selectedCommandId || "");
    await loadCommandsCatalog();
    selectCommand(selectedCommandId, false);
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : t("catalog.saveFailed");
    showListError(message);
  } finally {
    saveInFlight = false;
    setButtonsDisabled(false);
    syncEditorVisibility();
  }
}

function openDeletePrompt(id, label) {
  if (!dom.catalogDeletePrompt) {
    return;
  }
  pendingDelete = { kind: "command", id: id };
  if (dom.catalogDeletePromptMessage) {
    dom.catalogDeletePromptMessage.textContent = t("catalog.deleteMessage", { name: label });
  }
  dom.catalogDeletePrompt.showModal();
}

function closeDeletePrompt() {
  pendingDelete = null;
  if (dom.catalogDeletePrompt && dom.catalogDeletePrompt.open) {
    dom.catalogDeletePrompt.close();
  }
}

async function deleteCommand() {
  if (!pendingDelete || pendingDelete.kind !== "command" || deleteInFlight) {
    return;
  }

  deleteInFlight = true;
  setButtonsDisabled(true);

  try {
    const response = await fetch(apiURL("/api/commands/delete"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: pendingDelete.id }),
    });
    const data = await readJSON(response);
    if (!response.ok) {
      const message = mapHTTPError(response.status, data && data.error);
      throw new Error(message);
    }

    selectedCommandId = null;
    creatingNew = false;
    closeDeletePrompt();
    await loadCommandsCatalog();
    syncEditorVisibility();
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : t("catalog.deleteFailed");
    showListError(message);
    closeDeletePrompt();
  } finally {
    deleteInFlight = false;
    setButtonsDisabled(false);
    syncEditorVisibility();
  }
}

export function initCommandsCatalog() {
  if (dom.commandsCreateButton) {
    dom.commandsCreateButton.addEventListener("click", function () {
      selectCommand("", true);
      dom.commandTriggerInput?.focus();
    });
  }
  if (dom.commandsEmptyCreate) {
    dom.commandsEmptyCreate.addEventListener("click", function () {
      selectCommand("", true);
      dom.commandTriggerInput?.focus();
    });
  }
  if (dom.commandsEditorForm) {
    dom.commandsEditorForm.addEventListener("submit", function (event) {
      event.preventDefault();
      saveCommand().catch(function () {
        /* handled */
      });
    });
    dom.commandsEditorForm.addEventListener("keydown", function (event) {
      if (
        event.key !== "Enter" ||
        event.isComposing ||
        !(event.target instanceof HTMLInputElement) ||
        ["checkbox", "radio", "file"].includes(event.target.type)
      ) {
        return;
      }
      event.preventDefault();
      dom.commandsEditorForm.requestSubmit();
    });
  }
  dom.commandTriggerInput?.addEventListener("input", function () {
    setFieldError(dom.commandTriggerInput, dom.commandTriggerError, "");
  });
  dom.commandSplashInput?.addEventListener("input", function () {
    setFieldError(dom.commandSplashInput, dom.commandSplashError, "");
  });
  if (dom.commandsDeleteButton) {
    dom.commandsDeleteButton.addEventListener("click", function () {
      if (!selectedCommandId) {
        return;
      }
      const cmd = commandsCache.find(function (item) {
        return String(item.id) === selectedCommandId;
      });
      const label = cmd ? "!" + String(cmd.trigger || "") : selectedCommandId;
      openDeletePrompt(selectedCommandId, label);
    });
  }

  const listRetry = dom.commandsListError
    ? dom.commandsListError.querySelector(".state-retry")
    : null;
  if (listRetry) {
    listRetry.addEventListener("click", function () {
      loadCommandsCatalog().catch(function () {
        /* region handles error */
      });
    });
  }

  if (dom.catalogDeletePromptCancel) {
    dom.catalogDeletePromptCancel.addEventListener("click", closeDeletePrompt);
  }
  if (dom.catalogDeletePromptConfirm) {
    dom.catalogDeletePromptConfirm.addEventListener("click", function () {
      deleteCommand().catch(function () {
        /* handled */
      });
    });
  }
  if (dom.catalogDeletePrompt) {
    dom.catalogDeletePrompt.addEventListener("cancel", function (event) {
      event.preventDefault();
      closeDeletePrompt();
    });
  }

  window.addEventListener("hashchange", function () {
    if (isCommandsVisible()) {
      loadCommandsCatalog().catch(function () {
        /* region handles error */
      });
    }
  });

  window.addEventListener("admin-locale-applied", function () {
    renderCommandsList();
  });

  syncEditorVisibility();
}

export function ensureCommandsLoaded() {
  if (isCommandsVisible()) {
    loadCommandsCatalog().catch(function () {
      /* region handles error */
    });
  }
}
