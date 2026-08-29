import * as dom from "./dom.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { t } from "./i18n-ui.js";
import { setRegionState } from "./shell-state.js";
import { validateAwardPoints } from "./audience-helpers.js";
import { parseAudienceHash } from "./audience-tabs.js";
import { parseWorkspaceHash } from "./workspace-router.js";

const FETCH_TIMEOUT_MS = 15000;

/** @type {Array<Record<string, unknown>>} */
let awardsCache = [];
let selectedAwardId = null;
let creatingNew = false;
let listLoadInFlight = null;
let listHasLoaded = false;
let listLoadError = false;
let saveInFlight = false;
let deleteInFlight = false;
let pendingDelete = null;

function isAwardsVisible() {
  return parseWorkspaceHash(window.location.hash) === "audience" &&
    parseAudienceHash(window.location.hash) === "awards";
}

function setFieldError(element, message) {
  if (!element) {
    return;
  }
  element.textContent = message || "";
  element.hidden = !message;
}

function clearFieldErrors() {
  setFieldError(dom.awardPointsError, "");
}

function setButtonsDisabled(disabled) {
  if (dom.awardsSaveButton) {
    dom.awardsSaveButton.disabled = disabled;
  }
  if (dom.awardsDeleteButton) {
    dom.awardsDeleteButton.disabled = disabled || creatingNew || !selectedAwardId;
  }
  if (dom.awardsCreateButton) {
    dom.awardsCreateButton.disabled = disabled && !listHasLoaded;
  }
  if (dom.awardsEmptyCreate) {
    dom.awardsEmptyCreate.disabled = disabled && !listHasLoaded;
  }
}

function showListError(message) {
  if (!dom.awardsListError) {
    return;
  }
  const body = dom.awardsListError.querySelector(".notice__body");
  if (body) {
    body.textContent = message;
  }
  dom.awardsListError.hidden = false;
  if (dom.awardsListEmpty) {
    dom.awardsListEmpty.hidden = true;
  }
  setRegionState(dom.awardsListRegion, "error");
}

function hideListError() {
  if (dom.awardsListError) {
    dom.awardsListError.hidden = true;
  }
}

function syncEditorVisibility() {
  const hasSelection = creatingNew || selectedAwardId;
  if (dom.awardsEditorForm) {
    dom.awardsEditorForm.hidden = !hasSelection;
  }
  if (dom.awardsEditorEmpty) {
    dom.awardsEditorEmpty.hidden = hasSelection;
  }
  setButtonsDisabled(Boolean(listLoadInFlight) || saveInFlight || deleteInFlight);
}

function renderAwardsList() {
  if (!dom.awardsList) {
    return;
  }

  dom.awardsList.textContent = "";
  awardsCache.forEach(function (award) {
    const item = document.createElement("li");
    item.className = "audience-catalog-items__item";
    item.setAttribute("role", "option");
    item.dataset.awardId = String(award.id || "");
    if (item.dataset.awardId === selectedAwardId) {
      item.classList.add("audience-catalog-items__item--selected");
      item.setAttribute("aria-selected", "true");
    } else {
      item.setAttribute("aria-selected", "false");
    }

    const name = document.createElement("span");
    name.className = "audience-catalog-items__primary";
    name.textContent = String(award.name || "");

    const meta = document.createElement("span");
    meta.className = "audience-catalog-items__meta";
    meta.textContent = t("awards.pointsShort", { points: Number(award.points) || 0 });

    item.append(name, meta);
    item.addEventListener("click", function () {
      selectAward(String(award.id || ""), false);
    });
    dom.awardsList.append(item);
  });

  const isEmpty = awardsCache.length === 0 && listHasLoaded && !listLoadError;
  if (dom.awardsListEmpty) {
    dom.awardsListEmpty.hidden = !isEmpty;
  }
  if (dom.awardsList) {
    dom.awardsList.hidden = isEmpty;
  }

  if (listLoadInFlight && !listHasLoaded) {
    setRegionState(dom.awardsListRegion, "loading");
  } else if (!listLoadError && awardsCache.length > 0) {
    setRegionState(dom.awardsListRegion, null);
  }
}

function fillEditorFromAward(award) {
  if (!dom.awardsEditorForm) {
    return;
  }
  if (dom.awardNameInput) {
    dom.awardNameInput.value = String(award.name || "");
  }
  if (dom.awardPointsInput) {
    dom.awardPointsInput.value = String(award.points != null ? award.points : 10);
  }
  if (dom.awardSplashInput) {
    dom.awardSplashInput.value = String(award.splash_template || "");
  }
  if (dom.awardSoundInput) {
    dom.awardSoundInput.value = String(award.sound || "");
  }
  if (dom.awardDurationInput) {
    dom.awardDurationInput.value = String(award.duration_ms != null ? award.duration_ms : 5000);
  }
}

function defaultNewAward() {
  return {
    name: "",
    points: 10,
    splash_template: "",
    sound: "",
    duration_ms: 5000,
  };
}

function selectAward(id, isNew) {
  creatingNew = isNew;
  selectedAwardId = isNew ? null : id;
  clearFieldErrors();

  if (isNew) {
    fillEditorFromAward(defaultNewAward());
  } else {
    const award = awardsCache.find(function (item) {
      return String(item.id) === id;
    });
    if (award) {
      fillEditorFromAward(award);
    }
  }

  renderAwardsList();
  syncEditorVisibility();
}

function readEditorPayload() {
  return {
    name: dom.awardNameInput ? dom.awardNameInput.value : "",
    points: dom.awardPointsInput ? Number(dom.awardPointsInput.value) : 0,
    splash_template: dom.awardSplashInput ? dom.awardSplashInput.value : "",
    sound: dom.awardSoundInput ? dom.awardSoundInput.value : "",
    duration_ms: dom.awardDurationInput ? Number(dom.awardDurationInput.value) : 5000,
  };
}

function applyFieldErrors(fields) {
  if (!fields || typeof fields !== "object") {
    return;
  }
  if (fields.points && dom.awardPointsError) {
    setFieldError(dom.awardPointsError, fields.points);
  }
}

async function fetchAwardsList() {
  const controller = new AbortController();
  const timeout = window.setTimeout(function () {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(apiURL("/api/awards"), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const payload = await readJSON(response);
    if (!response.ok) {
      const message = mapHTTPError(response.status, payload && payload.error);
      throw new Error(message);
    }

    awardsCache = Array.isArray(payload.awards) ? payload.awards : [];
    listHasLoaded = true;
    listLoadError = false;
    hideListError();
    if (!creatingNew) {
      const stillSelected = Boolean(selectedAwardId) && awardsCache.some(function (item) {
        return String(item.id) === selectedAwardId;
      });
      if (!stillSelected && awardsCache.length > 0) {
        selectedAwardId = String(awardsCache[0].id || "");
      }
      if (selectedAwardId) {
        selectAward(selectedAwardId, false);
        return;
      }
    }
    renderAwardsList();
    syncEditorVisibility();
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loadAwardsCatalog() {
  if (listLoadInFlight) {
    return listLoadInFlight;
  }

  setButtonsDisabled(true);
  listLoadInFlight = fetchAwardsList()
    .catch(function (err) {
      listLoadError = true;
      const message = err instanceof Error && err.message ? err.message : t("awards.loadFailed");
      showListError(message);
    })
    .finally(function () {
      listLoadInFlight = null;
      setButtonsDisabled(false);
      renderAwardsList();
      syncEditorVisibility();
    });

  return listLoadInFlight;
}

async function saveAward() {
  if (saveInFlight) {
    return;
  }

  clearFieldErrors();
  const payload = readEditorPayload();
  const pointsErrorKey = validateAwardPoints(payload.points);
  if (pointsErrorKey) {
    setFieldError(dom.awardPointsError, t(pointsErrorKey));
    return;
  }
  if (String(payload.name || "").trim() === "") {
    return;
  }
  if (String(payload.splash_template || "").trim() === "") {
    return;
  }

  saveInFlight = true;
  setButtonsDisabled(true);

  try {
    const path = creatingNew ? "/api/awards/create" : "/api/awards/update";
    const body = creatingNew
      ? payload
      : Object.assign({ id: selectedAwardId }, payload);

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
    selectedAwardId = String(data.id || selectedAwardId || "");
    await loadAwardsCatalog();
    selectAward(selectedAwardId, false);
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
  pendingDelete = { kind: "award", id: id };
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

async function deleteAward() {
  if (!pendingDelete || pendingDelete.kind !== "award" || deleteInFlight) {
    return;
  }

  deleteInFlight = true;
  setButtonsDisabled(true);

  try {
    const response = await fetch(apiURL("/api/awards/delete"), {
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

    selectedAwardId = null;
    creatingNew = false;
    closeDeletePrompt();
    await loadAwardsCatalog();
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

export function initAwardsCatalog() {
  if (dom.awardsCreateButton) {
    dom.awardsCreateButton.addEventListener("click", function () {
      selectAward("", true);
    });
  }
  if (dom.awardsEmptyCreate) {
    dom.awardsEmptyCreate.addEventListener("click", function () {
      selectAward("", true);
    });
  }
  if (dom.awardsSaveButton) {
    dom.awardsSaveButton.addEventListener("click", function () {
      saveAward().catch(function () {
        /* handled */
      });
    });
  }
  if (dom.awardsDeleteButton) {
    dom.awardsDeleteButton.addEventListener("click", function () {
      if (!selectedAwardId) {
        return;
      }
      const award = awardsCache.find(function (item) {
        return String(item.id) === selectedAwardId;
      });
      const label = award ? String(award.name || "") : selectedAwardId;
      openDeletePrompt(selectedAwardId, label);
    });
  }

  const listRetry = dom.awardsListError
    ? dom.awardsListError.querySelector(".state-retry")
    : null;
  if (listRetry) {
    listRetry.addEventListener("click", function () {
      loadAwardsCatalog().catch(function () {
        /* region handles error */
      });
    });
  }

  if (dom.catalogDeletePromptCancel) {
    dom.catalogDeletePromptCancel.addEventListener("click", closeDeletePrompt);
  }
  if (dom.catalogDeletePromptConfirm) {
    dom.catalogDeletePromptConfirm.addEventListener("click", function () {
      deleteAward().catch(function () {
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
    if (isAwardsVisible()) {
      loadAwardsCatalog().catch(function () {
        /* region handles error */
      });
    }
  });

  window.addEventListener("admin-locale-applied", function () {
    renderAwardsList();
  });

  syncEditorVisibility();
}

export function ensureAwardsLoaded() {
  if (isAwardsVisible()) {
    loadAwardsCatalog().catch(function () {
      /* region handles error */
    });
  }
}
