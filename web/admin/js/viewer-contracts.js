import { apiURL, readJSON } from "./api.js";
import { t } from "./i18n-ui.js";
import { validateViewerContractDraft } from "./viewer-contracts-helpers.js";


const el = {
  region: document.getElementById("live-contracts-region"),
  status: document.getElementById("live-contracts-status"),
  error: document.getElementById("live-contracts-error"),
  retry: document.getElementById("live-contracts-retry"),
  draft: document.getElementById("live-contracts-draft"),
  title: document.getElementById("live-contract-title"),
  objective: document.getElementById("live-contract-objective"),
  reward: document.getElementById("live-contract-reward"),
  emptyCatalog: document.getElementById("live-contracts-empty-catalog"),
  open: document.getElementById("live-contract-open"),
  active: document.getElementById("live-contracts-active"),
  activeTitle: document.getElementById("live-contract-active-title"),
  activeObjective: document.getElementById("live-contract-active-objective"),
  activeReward: document.getElementById("live-contract-active-reward"),
  activeTime: document.getElementById("live-contract-active-time"),
  repeat: document.getElementById("live-contract-repeat"),
  award: document.getElementById("live-contract-award"),
  close: document.getElementById("live-contract-close"),
  winnerDialog: document.getElementById("live-contract-winner-dialog"),
  winnerSearch: document.getElementById("live-contract-viewer-search"),
  winnerStatus: document.getElementById("live-contract-viewer-status"),
  winnerResults: document.getElementById("live-contract-viewer-results"),
  winnerCancel: document.getElementById("live-contract-winner-cancel"),
  winnerNext: document.getElementById("live-contract-winner-next"),
  awardDialog: document.getElementById("live-contract-award-dialog"),
  awardConfirmation: document.getElementById("live-contract-award-confirmation"),
  awardCancel: document.getElementById("live-contract-award-cancel"),
  awardConfirm: document.getElementById("live-contract-award-confirm"),
  closeDialog: document.getElementById("live-contract-close-dialog"),
  closeCancel: document.getElementById("live-contract-close-cancel"),
  closeConfirm: document.getElementById("live-contract-close-confirm"),
};

const errors = {
  title: document.getElementById("live-contract-title-error"),
  objective: document.getElementById("live-contract-objective-error"),
  reward: document.getElementById("live-contract-reward-error"),
};

let activeContract = null;
let awards = [];
let controller = null;
let viewerController = null;
let requestInFlight = false;
let selectedViewer = null;
let restoreFocus = null;
let suppressRestoreFocus = false;

function setStatus(message) {
  if (el.status) el.status.textContent = message || "";
}

function setBusy(busy) {
  requestInFlight = busy;
  if (el.region) el.region.setAttribute("aria-busy", busy ? "true" : "false");
  if (el.open) el.open.disabled = busy || awards.length === 0;
  if (el.repeat) el.repeat.disabled = busy;
  if (el.award) el.award.disabled = busy;
  if (el.close) el.close.disabled = busy;
}

function showError(message) {
  if (!el.error) return;
  const body = el.error.querySelector(".notice__body");
  if (body) body.textContent = message;
  el.error.hidden = false;
}

function hideError() {
  if (el.error) el.error.hidden = true;
}

function clearFieldErrors() {
  Object.entries(errors).forEach(function ([name, node]) {
    if (node) node.hidden = true;
    const input = el[name];
    if (input) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  });
}

function showFieldError(name, message) {
  const node = errors[name];
  const input = el[name];
  if (node) {
    node.textContent = message;
    node.hidden = false;
  }
  if (input) {
    input.setAttribute("aria-invalid", "true");
    if (node && node.id) {
      input.setAttribute("aria-describedby", node.id);
    }
  }
}

function validateDraft() {
  clearFieldErrors();
  const draft = validateViewerContractDraft({
    title: el.title.value,
    objective: el.objective.value,
    rewardID: el.reward.value,
  });
  let first = null;
  if (!draft.titleValid) {
    showFieldError("title", t("contracts.invalidTitle"));
    first = el.title;
  }
  if (!draft.objectiveValid) {
    showFieldError("objective", t("contracts.invalidObjective"));
    first = first || el.objective;
  }
  if (!draft.rewardValid) {
    showFieldError("reward", t("contracts.invalidReward"));
    first = first || el.reward;
  }
  return { valid: !first, first, title: draft.title, objective: draft.objective };
}

function renderAwards() {
  if (!el.reward) return;
  const prior = el.reward.value;
  el.reward.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = t("contracts.selectReward");
  el.reward.append(placeholder);
  awards.forEach(function (award) {
    const option = document.createElement("option");
    option.value = award.id;
    option.textContent = `${award.name} · +${award.points} XP`;
    el.reward.append(option);
  });
  el.reward.value = awards.some(function (award) { return award.id === prior; }) ? prior : "";
  if (el.emptyCatalog) el.emptyCatalog.hidden = awards.length > 0;
}

function render() {
  const hasActive = Boolean(activeContract);
  if (el.draft) el.draft.hidden = hasActive;
  if (el.active) el.active.hidden = !hasActive;
  if (!hasActive) {
    setBusy(requestInFlight);
    return;
  }
  el.activeTitle.textContent = activeContract.title;
  el.activeObjective.textContent = activeContract.objective;
  el.activeReward.textContent = `${activeContract.reward_name} · +${activeContract.reward_points} XP`;
  const announcedAt = new Date(activeContract.announced_at);
  el.activeTime.textContent = Number.isNaN(announcedAt.valueOf()) ? "" : t("contracts.announcedAt", { time: announcedAt.toLocaleString() });
  setBusy(requestInFlight);
}

async function request(path, options) {
  const response = await fetch(apiURL(path), options);
  const payload = await readJSON(response);
  if (!response.ok) {
    const error = new Error(payload && payload.error ? payload.error : t("contracts.requestFailed"));
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function openLiveContracts() {
  if (!el.region) return;
  if (controller) controller.abort();
  controller = new AbortController();
  const currentController = controller;
  hideError();
  setStatus(t("state.loading"));
  setBusy(true);
  try {
    const [current, catalog] = await Promise.all([
      request("/api/viewer-contracts/current", { signal: currentController.signal }),
      request("/api/awards", { signal: currentController.signal }),
    ]);
    if (controller !== currentController) return;
    activeContract = current.contract || null;
    awards = Array.isArray(catalog.awards) ? catalog.awards : [];
    renderAwards();
    setStatus("");
  } catch (error) {
    if (error.name === "AbortError") return;
    showError(t("contracts.loadFailed"));
    setStatus(t("contracts.offline"));
  } finally {
    if (controller === currentController) {
      setBusy(false);
      render();
    }
  }
}

export function deactivateLiveContracts() {
  if (controller) controller.abort();
  controller = null;
  if (viewerController) viewerController.abort();
  viewerController = null;
  selectedViewer = null;
  restoreFocus = null;
  suppressRestoreFocus = false;
  [el.winnerDialog, el.awardDialog, el.closeDialog].forEach(closeDialog);
}

async function openContract(event) {
  event.preventDefault();
  const draft = validateDraft();
  if (!draft.valid) {
    draft.first.focus();
    return;
  }
  setBusy(true);
  hideError();
  try {
    const response = await request("/api/viewer-contracts/open", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draft.title, objective: draft.objective, reward_id: el.reward.value }),
    });
    activeContract = response.contract;
    el.title.value = "";
    el.objective.value = "";
    el.reward.value = "";
    setStatus(t("contracts.opened"));
  } catch (error) {
    if (error.status === 409) {
      setStatus(t("contracts.conflict"));
      await openLiveContracts();
    } else {
      showError(error.message || t("contracts.openFailed"));
    }
  } finally {
    setBusy(false);
    render();
  }
}

async function announceAgain() {
  if (!activeContract) return;
  setBusy(true);
  try {
    await request("/api/viewer-contracts/announce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeContract.id }) });
    setStatus(t("contracts.announcedAgain"));
  } catch (error) {
    if (error.status === 409) {
      setStatus(t("contracts.conflict"));
      await openLiveContracts();
    } else showError(error.message);
  } finally {
    setBusy(false);
  }
}

async function loadViewers() {
  if (viewerController) viewerController.abort();
  viewerController = new AbortController();
  const currentViewerController = viewerController;
  const query = el.winnerSearch.value.trim();
  el.winnerStatus.textContent = t("state.loading");
  try {
    const response = await request(`/api/viewers?q=${encodeURIComponent(query)}`, { signal: currentViewerController.signal });
    if (viewerController !== currentViewerController) return;
    const viewers = Array.isArray(response.viewers) ? response.viewers.slice(0, 50) : [];
    el.winnerResults.replaceChildren();
    viewers.forEach(function (viewer) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "viewer-contract-viewer";
      button.setAttribute("aria-selected", selectedViewer && selectedViewer.id === viewer.id ? "true" : "false");
      button.textContent = viewer.display_name || viewer.id;
      const meta = document.createElement("span");
      meta.className = "viewer-contract-viewer__meta";
      meta.textContent = Array.isArray(viewer.platforms) ? viewer.platforms.join(" · ") : "";
      button.append(meta);
      button.addEventListener("click", function () {
        selectedViewer = viewer;
        el.winnerNext.disabled = false;
        loadViewers().catch(function () { /* keep a usable selection */ });
      });
      item.append(button);
      el.winnerResults.append(item);
    });
    el.winnerStatus.textContent = viewers.length ? "" : t("contracts.noViewers");
  } catch (error) {
    if (error.name === "AbortError") return;
    throw error;
  } finally {
    if (viewerController === currentViewerController) viewerController = null;
  }
}

function openWinnerPicker() {
  if (!activeContract) return;
  restoreFocus = el.award;
  selectedViewer = null;
  el.winnerNext.disabled = true;
  el.winnerSearch.value = "";
  el.winnerDialog.showModal();
  el.winnerSearch.focus();
  loadViewers().catch(function () { el.winnerStatus.textContent = t("contracts.viewerLoadFailed"); });
}

function closeDialog(dialog) {
  if (dialog && dialog.open) dialog.close();
}

function showAwardConfirmation() {
  if (!selectedViewer || !activeContract) return;
  suppressRestoreFocus = true;
  closeDialog(el.winnerDialog);
  el.awardConfirmation.textContent = t("contracts.awardConfirmation", {
    viewer: selectedViewer.display_name || selectedViewer.id,
    title: activeContract.title,
    reward: activeContract.reward_name,
    points: activeContract.reward_points,
  });
  el.awardDialog.showModal();
  el.awardConfirm.focus();
}

async function confirmAward() {
  if (!selectedViewer || !activeContract) return;
  let focusDraft = false;
  setBusy(true);
  try {
    await request("/api/viewer-contracts/award", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeContract.id, viewer_id: selectedViewer.id }) });
    activeContract = null;
    restoreFocus = null;
    closeDialog(el.awardDialog);
    setStatus(t("contracts.awarded"));
    focusDraft = true;
  } catch (error) {
    if (error.status === 404) {
      selectedViewer = null;
      closeDialog(el.awardDialog);
      el.winnerDialog.showModal();
      el.winnerSearch.focus();
      el.winnerStatus.textContent = t("contracts.viewerMissing");
    } else if (error.status === 409) {
      closeDialog(el.awardDialog);
      setStatus(t("contracts.conflict"));
      await openLiveContracts();
    } else showError(error.message);
  } finally {
    setBusy(false);
    render();
    if (focusDraft) el.title.focus();
  }
}

function openCloseConfirmation() {
  if (!activeContract) return;
  restoreFocus = el.close;
  el.closeDialog.showModal();
  el.closeConfirm.focus();
}

async function confirmClose() {
  if (!activeContract) return;
  let focusDraft = false;
  setBusy(true);
  try {
    await request("/api/viewer-contracts/close", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeContract.id }) });
    activeContract = null;
    restoreFocus = null;
    closeDialog(el.closeDialog);
    setStatus(t("contracts.closed"));
    focusDraft = true;
  } catch (error) {
    if (error.status === 409) {
      setStatus(t("contracts.conflict"));
      await openLiveContracts();
    } else showError(error.message);
  } finally {
    setBusy(false);
    render();
    if (focusDraft) el.title.focus();
  }
}

export function initLiveContracts() {
  if (!el.region) return;
  el.draft.addEventListener("submit", openContract);
  el.retry.addEventListener("click", function () { openLiveContracts().catch(function () {}); });
  el.repeat.addEventListener("click", announceAgain);
  el.award.addEventListener("click", openWinnerPicker);
  el.close.addEventListener("click", openCloseConfirmation);
  el.winnerSearch.addEventListener("input", function () { loadViewers().catch(function () { el.winnerStatus.textContent = t("contracts.viewerLoadFailed"); }); });
  el.winnerCancel.addEventListener("click", function () { closeDialog(el.winnerDialog); });
  el.winnerNext.addEventListener("click", showAwardConfirmation);
  el.awardCancel.addEventListener("click", function () { closeDialog(el.awardDialog); });
  el.awardConfirm.addEventListener("click", confirmAward);
  el.closeCancel.addEventListener("click", function () { closeDialog(el.closeDialog); });
  el.closeConfirm.addEventListener("click", confirmClose);
  [el.winnerDialog, el.awardDialog, el.closeDialog].forEach(function (dialog) {
    dialog.addEventListener("close", function () {
      if (suppressRestoreFocus) {
        suppressRestoreFocus = false;
        return;
      }
      if (restoreFocus) restoreFocus.focus();
    });
  });
  ["title", "objective", "reward"].forEach(function (name) {
    el[name].addEventListener("input", function () { if (errors[name]) errors[name].hidden = true; el[name].removeAttribute("aria-invalid"); });
  });
}
