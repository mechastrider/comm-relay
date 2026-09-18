import * as dom from "./dom.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { t } from "./i18n-ui.js";
import { setRegionState } from "./shell-state.js";
import {
  validateCommandTrigger,
  parseCommandAliasesText,
  validateCommandAliasesText,
  validateCommandAliasesAgainstTrigger,
  formatCommandAliasesForEditor,
} from "./audience-helpers.js";
import { parseAudienceHash } from "./audience-tabs.js";
import { parseWorkspaceHash } from "./workspace-router.js";
import { neighboringCatalogSelection } from "./catalog-selection.js";
import {
  bindSplashVariableChips,
  previewStreamerName,
  renderSplashPreview,
} from "./catalog-template.js";
import { createCatalogMediaController } from "./catalog-media-ui.js?v=2";
import {
  buildCommandPayload,
  commandUsesAlertPresentation,
  normalizeCommandAction,
  COMMAND_ACTION_LIKE,
  COMMAND_ACTION_BUFF,
} from "./command-action.js";

const commandMedia = createCatalogMediaController({
  imagePreview: dom.commandImagePreview,
  imageInput: dom.commandImageInput,
  imageClear: dom.commandImageClear,
  imageError: dom.commandImageError,
  imageFitInput: dom.commandImageFitInput,
  imageFitError: dom.commandImageFitError,
  imageSizeInput: dom.commandImageSizeInput,
  imageSizeValue: dom.commandImageSizeValue,
  imageSizeError: dom.commandImageSizeError,
  soundFileInput: dom.commandSoundFileInput,
  soundFileClear: dom.commandSoundFileClear,
  soundFileError: dom.commandSoundFileError,
  soundVolumeInput: dom.commandSoundVolumeInput,
  soundVolumeValue: dom.commandSoundVolumeValue,
  soundVolumeError: dom.commandSoundVolumeError,
  soundPlay: dom.commandSoundPlay,
  soundStop: dom.commandSoundStop,
  builtInSoundInput: dom.commandSoundInput,
  layoutName: "command-layout",
  layoutError: dom.commandLayoutError,
  graphicKind: "command",
  graphicIdentity: function (record) {
    return {
      identifier: String(record.trigger || record.id || ""),
      label: String(record.trigger || ""),
    };
  },
});
commandMedia.bind();

const FETCH_TIMEOUT_MS = 15000;

/** @type {Array<Record<string, unknown>>} */
let commandsCache = [];
/** @type {Array<Record<string, unknown>>} */
let commandAwardsCache = [];
let selectedCommandId = null;
let creatingNew = false;
let listLoadInFlight = null;
let listHasLoaded = false;
let listLoadError = false;
let saveInFlight = false;
let deleteInFlight = false;
let pendingDelete = null;
let pendingSelectionAfterDelete = null;

function isCommandsVisible() {
  return parseWorkspaceHash(window.location.hash) === "audience" &&
    parseAudienceHash(window.location.hash) === "commands";
}

function commandActionListKey(action) {
  const normalized = normalizeCommandAction(action);
  if (normalized === "show_leaderboard") {
    return "commands.actionLeaderboardShort";
  }
  if (normalized === COMMAND_ACTION_LIKE) {
    return "commands.actionLikeShort";
  }
  if (normalized === COMMAND_ACTION_BUFF) {
    return "commands.actionBuffShort";
  }
  return "commands.actionAlertShort";
}

function renderCommandAwardOptions(selectedId) {
  if (!dom.commandAwardInput) {
    return;
  }
  const previous = selectedId != null ? String(selectedId) : dom.commandAwardInput.value;
  dom.commandAwardInput.textContent = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = t("commands.likeAwardPlaceholder");
  dom.commandAwardInput.append(placeholder);
  commandAwardsCache.forEach(function (award) {
    const option = document.createElement("option");
    option.value = String(award.id || "");
    option.textContent = String(award.name || award.id || "");
    dom.commandAwardInput.append(option);
  });
  dom.commandAwardInput.value = previous;
}

async function loadCommandAwardsCache() {
  const response = await fetch(apiURL("/api/awards"), {
    headers: { Accept: "application/json" },
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    const message = mapHTTPError(response.status, payload && payload.error);
    throw new Error(message);
  }
  commandAwardsCache = Array.isArray(payload.awards) ? payload.awards : [];
  renderCommandAwardOptions();
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

function setAliasesFieldError(message) {
  setFieldError(dom.commandAliasesInput, dom.commandAliasesError, message);
  if (dom.commandAliasesInput) {
    dom.commandAliasesInput.setAttribute(
      "aria-describedby",
      message ? "command-aliases-hint command-aliases-error" : "command-aliases-hint"
    );
  }
}

function mapAliasesServerFieldError(raw) {
  switch (String(raw || "").trim()) {
    case "invalid alias":
      return t("commands.aliasesInvalid");
    case "alias already exists":
      return t("commands.aliasesDuplicate");
    case "alias must not match trigger":
      return t("commands.aliasesMatchesTrigger");
    case "too many aliases":
      return t("commands.aliasesTooMany");
    default:
      return raw || "";
  }
}

function clearFieldErrors() {
  setFieldError(dom.commandTriggerInput, dom.commandTriggerError, "");
  setAliasesFieldError("");
  setFieldError(dom.commandActionInput, dom.commandActionError, "");
  setFieldError(dom.commandAwardInput, dom.commandAwardError, "");
  setFieldError(dom.commandPointsInput, dom.commandPointsError, "");
  setFieldError(dom.commandSplashInput, dom.commandSplashError, "");
  commandMedia.clearFieldErrors();
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

function showEditorError(message) {
  if (!dom.commandsEditorStatus) {
    return;
  }
  dom.commandsEditorStatus.textContent = message || t("catalog.saveFailed");
  dom.commandsEditorStatus.hidden = false;
}

function hideEditorError() {
  if (dom.commandsEditorStatus) {
    dom.commandsEditorStatus.hidden = true;
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

    const labelCol = document.createElement("div");
    labelCol.className = "audience-catalog-items__label";
    labelCol.append(trigger);
    const aliasList = Array.isArray(cmd.aliases) ? cmd.aliases : [];
    if (aliasList.length > 0) {
      const aliases = document.createElement("span");
      aliases.className = "audience-catalog-items__aliases";
      aliases.textContent = aliasList
        .map(function (alias) {
          return "!" + String(alias || "");
        })
        .join(", ");
      labelCol.append(aliases);
    }

    const meta = document.createElement("span");
    meta.className = "audience-catalog-items__meta";
    const actionKey = commandActionListKey(cmd.action);
    meta.textContent = t(actionKey) + " · " +
      (cmd.enabled ? t("commands.enabledShort") : t("commands.disabledShort"));

    item.append(labelCol, meta);
    item.addEventListener("click", function () {
      selectCommand(String(cmd.id || ""), false);
      focusCommandItem(String(cmd.id || ""));
      revealCommandEditor();
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

function revealCommandEditor() {
  if (!window.matchMedia("(max-width: 1023px)").matches) {
    return;
  }
  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      const editor = dom.commandsEditorForm?.closest(".audience-catalog-editor");
      editor?.scrollIntoView({ block: "start" });
    });
  });
}

function focusCommandCreate() {
  window.requestAnimationFrame(function () {
    dom.commandsCreateButton?.focus();
  });
}

function updateCommandSplashPreview() {
  renderSplashPreview(dom.commandSplashPreview, dom.commandSplashInput?.value || "", {
    viewer: "Alice",
    streamer: previewStreamerName(),
    points: 0,
    message: t("catalog.sampleCommandMessage"),
  });
}

function fillEditorFromCommand(cmd) {
  if (!dom.commandsEditorForm) {
    return;
  }
  if (dom.commandTriggerInput) {
    dom.commandTriggerInput.value = String(cmd.trigger || "");
  }
  if (dom.commandAliasesInput) {
    dom.commandAliasesInput.value = formatCommandAliasesForEditor(cmd.aliases);
  }
  if (dom.commandEnabledInput) {
    dom.commandEnabledInput.checked = Boolean(cmd.enabled);
  }
  if (dom.commandActionInput) {
    dom.commandActionInput.value = normalizeCommandAction(cmd.action);
  }
  if (dom.commandAwardInput) {
    renderCommandAwardOptions(cmd.award_id);
    dom.commandAwardInput.value = String(cmd.award_id || "");
  }
  if (dom.commandPointsInput) {
    dom.commandPointsInput.value = String(cmd.points != null ? cmd.points : 25);
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
  commandMedia.fillFromRecord(cmd);
  updateCommandActionUI();
  updateCommandSplashPreview();
}

function defaultNewCommand() {
  return {
    trigger: "",
    aliases: [],
    enabled: true,
    action: "alert",
    cooldown_seconds: 30,
    splash_template: "",
    sound: "",
    duration_ms: 5000,
    sound_volume: 70,
    layout: "fullscreen",
  };
}

function selectCommand(id, isNew) {
  creatingNew = isNew;
  selectedCommandId = isNew ? null : id;
  clearFieldErrors();
  commandMedia.stopPreview();

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
  const action = dom.commandActionInput ? dom.commandActionInput.value : "alert";
  return buildCommandPayload(
    {
      trigger: dom.commandTriggerInput ? dom.commandTriggerInput.value : "",
      aliases: parseCommandAliasesText(dom.commandAliasesInput ? dom.commandAliasesInput.value : ""),
      enabled: dom.commandEnabledInput ? dom.commandEnabledInput.checked : true,
      action: action,
      cooldown_seconds: dom.commandCooldownInput ? Number(dom.commandCooldownInput.value) : 0,
      award_id: dom.commandAwardInput ? dom.commandAwardInput.value : "",
      points: dom.commandPointsInput ? Number(dom.commandPointsInput.value) : 0,
    },
    commandUsesAlertPresentation(action)
      ? Object.assign({
          splash_template: dom.commandSplashInput ? dom.commandSplashInput.value : "",
          sound: dom.commandSoundInput ? dom.commandSoundInput.value : "",
          duration_ms: dom.commandDurationInput ? Number(dom.commandDurationInput.value) : 5000,
        }, commandMedia.readPayload())
      : undefined
  );
}

function updateCommandActionUI() {
  const action = normalizeCommandAction(dom.commandActionInput?.value);
  const usesAlert = commandUsesAlertPresentation(action);
  const usesLike = action === COMMAND_ACTION_LIKE;
  const usesBuff = action === COMMAND_ACTION_BUFF;
  if (dom.commandAlertFields) {
    dom.commandAlertFields.hidden = !usesAlert;
  }
  if (dom.commandLikeFields) {
    dom.commandLikeFields.hidden = !usesLike;
  }
  if (dom.commandBuffFields) {
    dom.commandBuffFields.hidden = !usesBuff;
  }
  if (dom.commandSplashInput) {
    dom.commandSplashInput.required = usesAlert;
  }
  if (dom.commandDurationInput) {
    dom.commandDurationInput.required = usesAlert;
  }
  if (dom.commandAwardInput) {
    dom.commandAwardInput.required = false;
  }
  if (dom.commandPointsInput) {
    dom.commandPointsInput.required = false;
  }
  if (dom.commandActionHint) {
    let hintKey = "commands.actionAlertHint";
    if (action === "show_leaderboard") {
      hintKey = "commands.actionLeaderboardHint";
    } else if (usesLike) {
      hintKey = "commands.actionLikeHint";
    } else if (usesBuff) {
      hintKey = "commands.actionBuffHint";
    }
    dom.commandActionHint.textContent = t(hintKey);
  }
}

function applyFieldErrors(fields) {
  if (!fields || typeof fields !== "object") {
    return;
  }
  if (fields.trigger && dom.commandTriggerError) {
    setFieldError(dom.commandTriggerInput, dom.commandTriggerError, fields.trigger);
  }
  if (fields.aliases && dom.commandAliasesError) {
    setAliasesFieldError(mapAliasesServerFieldError(fields.aliases));
  }
  if (fields.action && dom.commandActionError) {
    setFieldError(dom.commandActionInput, dom.commandActionError, fields.action);
  }
  if (fields.splash_template && dom.commandSplashError) {
    setFieldError(dom.commandSplashInput, dom.commandSplashError, fields.splash_template);
  }
  if (fields.award_id && dom.commandAwardError) {
    setFieldError(dom.commandAwardInput, dom.commandAwardError, fields.award_id);
  }
  if (fields.points && dom.commandPointsError) {
    setFieldError(dom.commandPointsInput, dom.commandPointsError, fields.points);
  }
  commandMedia.applyFieldErrors(fields);
}

async function fetchCommandsList() {
  const controller = new AbortController();
  const timeout = window.setTimeout(function () {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    await loadCommandAwardsCache();
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
      const preferredSelection = pendingSelectionAfterDelete;
      pendingSelectionAfterDelete = null;
      const preferredStillExists = Boolean(preferredSelection) && commandsCache.some(function (item) {
        return String(item.id) === preferredSelection;
      });
      const stillSelected = Boolean(selectedCommandId) && commandsCache.some(function (item) {
        return String(item.id) === selectedCommandId;
      });
      if (preferredStillExists) {
        selectedCommandId = preferredSelection;
      } else if (!stillSelected && commandsCache.length > 0) {
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
  hideEditorError();
  const payload = readEditorPayload();
  const triggerErrorKey = validateCommandTrigger(payload.trigger);
  if (triggerErrorKey) {
    setFieldError(dom.commandTriggerInput, dom.commandTriggerError, t(triggerErrorKey));
    dom.commandTriggerInput?.focus();
    return;
  }
  const aliasesText = dom.commandAliasesInput ? dom.commandAliasesInput.value : "";
  const aliasesErrorKey = validateCommandAliasesText(aliasesText);
  if (aliasesErrorKey) {
    setAliasesFieldError(t(aliasesErrorKey));
    dom.commandAliasesInput?.focus();
    return;
  }
  const aliasesTriggerErrorKey = validateCommandAliasesAgainstTrigger(aliasesText, payload.trigger);
  if (aliasesTriggerErrorKey) {
    setAliasesFieldError(t(aliasesTriggerErrorKey));
    dom.commandAliasesInput?.focus();
    return;
  }
  if (payload.action === "alert" && String(payload.splash_template || "").trim() === "") {
    setFieldError(dom.commandSplashInput, dom.commandSplashError, t("catalog.splashRequired"));
    dom.commandSplashInput?.focus();
    return;
  }
  if (payload.action === "like" && String(payload.award_id || "").trim() === "") {
    setFieldError(dom.commandAwardInput, dom.commandAwardError, t("commands.likeAwardRequired"));
    dom.commandAwardInput?.focus();
    return;
  }
  if (payload.action === "buff") {
    const points = Number(payload.points);
    if (!Number.isFinite(points) || points < 1 || points > 1000) {
      setFieldError(dom.commandPointsInput, dom.commandPointsError, t("commands.buffPointsInvalid"));
      dom.commandPointsInput?.focus();
      return;
    }
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
      if (data && data.fields && data.fields.aliases) {
        dom.commandAliasesInput?.focus();
      }
      const message = mapHTTPError(response.status, data && data.error);
      throw new Error(message);
    }

    creatingNew = false;
    selectedCommandId = String(data.id || selectedCommandId || "");
    commandMedia.commitSavedRecord(data);
    await loadCommandsCatalog();
    selectCommand(selectedCommandId, false);
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : t("catalog.saveFailed");
    showEditorError(message);
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
    pendingSelectionAfterDelete = neighboringCatalogSelection(commandsCache, pendingDelete.id);
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
    commandMedia.releaseSavedAssets();
    closeDeletePrompt();
    await loadCommandsCatalog();
    syncEditorVisibility();
    if (selectedCommandId) {
      focusCommandItem(selectedCommandId);
    } else {
      focusCommandCreate();
    }
  } catch (err) {
    pendingSelectionAfterDelete = null;
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
    commandMedia.setGraphicIdentity(dom.commandTriggerInput?.value || "", dom.commandTriggerInput?.value || "");
  });
  dom.commandAliasesInput?.addEventListener("input", function () {
    setAliasesFieldError("");
  });
  dom.commandActionInput?.addEventListener("change", updateCommandActionUI);
  dom.commandAwardInput?.addEventListener("change", function () {
    setFieldError(dom.commandAwardInput, dom.commandAwardError, "");
  });
  dom.commandPointsInput?.addEventListener("input", function () {
    setFieldError(dom.commandPointsInput, dom.commandPointsError, "");
  });
  dom.commandSplashInput?.addEventListener("input", function () {
    setFieldError(dom.commandSplashInput, dom.commandSplashError, "");
    updateCommandSplashPreview();
  });
  bindSplashVariableChips(dom.commandSplashVars, dom.commandSplashInput, updateCommandSplashPreview);
  document.addEventListener("admin-config-applied", updateCommandSplashPreview);
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
    } else {
      commandMedia.abandonPendingUploads();
    }
  });

  window.addEventListener("admin-locale-applied", function () {
    renderCommandsList();
    renderCommandAwardOptions();
    updateCommandActionUI();
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
