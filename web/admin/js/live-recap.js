import * as dom from "./dom.js";
import { apiURL, mapHTTPError, readJSON } from "./api.js";
import { t } from "./i18n-ui.js";
import {
  buildRecapHideBody,
  buildRecapHistoryURL,
  buildRecapSessionURL,
  buildRecapShowAllBody,
  buildRecapShowBody,
  canDownloadRecapImage,
  isHiddenRecapStateFrame,
  isAllTimeRecapStateFrame,
  isCurrentRecapStateFrame,
  recapDownloadFilename,
  recapDownloadPresentation,
  recapDisplayData,
  recapStateFrameApplies,
  RECAP_WINDOW_ALL,
  RECAP_WINDOW_SESSION,
} from "./live-recap-helpers.js";
import { encodeRecapSharePNG, triggerRecapDownload } from "./recap-share-image.js";
import {
  beginRecapShow,
  canApplyRecapDialogResult,
  canApplyRecapRead,
  canCloseRecapDialog,
  cancelRecapConfirmation,
  closeRecapDialog as closeRecapDialogState,
  openRecapDialog,
  resolveRecapShowConflict,
} from "./live-recap-state.js";
import {
  createRecapHistoryRow,
  formatRecapTime,
  renderRecapSessionDetail,
} from "./live-recap-session-render.js";

let opener = null;
let current = null;
let history = [];
let nextCursor = null;
let selectedDetail = null;
let view = "current";
let dialogWindow = RECAP_WINDOW_SESSION;
let busy = false;
let encoding = false;
let offline = false;
let confirmation = false;
let historyLoaded = false;
let loadController = null;
let historyController = null;
let detailController = null;
let readRetry = null;
let dialogState = { open: false, generation: 0, confirmation: false, showing: false };

function isOpen() { return Boolean(dom.liveRecapDialog && dom.liveRecapDialog.open); }
function region() { return dom.liveRecapBody; }
function isUnavailable(error) { return !error.status || error.status === 503; }

function setStatus(message, error) {
  if (!dom.liveRecapStatus) return;
  dom.liveRecapStatus.textContent = message || "";
  dom.liveRecapStatus.hidden = !message;
  dom.liveRecapStatus.setAttribute("role", error ? "alert" : "status");
  dom.liveRecapStatus.classList.toggle("notice--error", Boolean(error));
}

function setBusy(next, generation) {
  if (generation !== undefined && !canApplyRecapRead(dialogState, generation)) return;
  busy = next;
  if (region()) region().setAttribute("aria-busy", next ? "true" : "false");
  render();
}

function abortPendingReads() {
  [loadController, historyController, detailController].forEach(function (controller) {
    if (controller) controller.abort();
  });
  loadController = null;
  historyController = null;
  detailController = null;
}

function clearBody() {
  if (region()) region().textContent = "";
}

function appendText(parent, tag, text, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function renderWindowSwitch(parent) {
  const group = document.createElement("div");
  group.className = "live-recap-window-switch";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", t("recap.windowSwitcher"));
  [["session", "recap.windowSession"], ["all", "recap.windowAllTime"]].forEach(function ([value, labelKey]) {
    const label = document.createElement("label");
    label.className = "live-recap-window-switch__option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "live-recap-window";
    input.value = value;
    input.checked = dialogWindow === value;
    input.disabled = busy || encoding;
    input.addEventListener("change", function () {
      if (!input.checked || busy || encoding) return;
      dialogWindow = value === RECAP_WINDOW_ALL ? RECAP_WINDOW_ALL : RECAP_WINDOW_SESSION;
      render();
    });
    label.append(input, document.createTextNode(t(labelKey)));
    group.append(label);
  });
  parent.append(group);
}

function renderDetail(detail, historical, previewWindow) {
  const body = region();
  if (!body) return;
  renderRecapSessionDetail(body, detail, {
    historical,
    previewWindow,
    current,
  });
}

function renderCurrent() {
  const body = region();
  if (!current || !current.session) {
    appendText(body, "p", t("recap.currentUnavailable"), "empty-state");
    return;
  }
  renderWindowSwitch(body);
  renderDetail(current.session, false, dialogWindow);
}

function renderConfirmation() {
  const body = region();
  const session = current && current.session ? recapDisplayData(current.session) : null;
  appendText(body, "h3", t("recap.confirmTitle"));
  appendText(body, "p", t("recap.confirmSession", { id: session && session.id, time: formatRecapTime(session && session.started_at) }), "field-hint");
  const description = appendText(body, "p", t("recap.confirmPermanent", { time: formatRecapTime(session && session.started_at) }));
  description.id = "live-recap-confirm-description";
  appendText(body, "p", t("recap.confirmNoReset"), "field-hint");
}

function historyRow(summary) {
  return createRecapHistoryRow(summary, function (id, button) {
    openHistoryDetail(id, button);
  });
}

function renderHistory() {
  const body = region();
  if (selectedDetail) {
    renderDetail(selectedDetail.detail, true);
    return;
  }
  if (!history.length && historyLoaded) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = t("recap.historyEmpty");
    body.append(empty);
  }
  const list = document.createElement("div");
  list.className = "live-recap-history";
  history.forEach(function (summary) { list.append(historyRow(summary)); });
  body.append(list);
  if (nextCursor) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "btn-physical btn-small";
    more.disabled = busy;
    more.textContent = t("recap.loadMore");
    more.addEventListener("click", function () { loadHistory(nextCursor); });
    body.append(more);
  }
}

function render() {
  if (!isOpen()) return;
  clearBody();
  const currentSelected = view === "current";
  if (dom.liveRecapCurrentTab) dom.liveRecapCurrentTab.setAttribute("aria-selected", currentSelected ? "true" : "false");
  if (dom.liveRecapHistoryTab) dom.liveRecapHistoryTab.setAttribute("aria-selected", currentSelected ? "false" : "true");
  if (dom.liveRecapClose) dom.liveRecapClose.disabled = !canCloseRecapDialog(dialogState);
  if (confirmation) renderConfirmation();
  else if (view === "history") renderHistory();
  else renderCurrent();
  const session = current && current.session ? recapDisplayData(current.session) : null;
  const captured = Boolean(current && current.snapshot);
  const sessionWindow = dialogWindow === RECAP_WINDOW_SESSION;
  const canDownload = canDownloadRecapImage({
    dialogWindow,
    snapshot: current && current.snapshot,
    allTime: current && current.all_time,
  });
  if (dom.liveRecapBack) dom.liveRecapBack.hidden = !selectedDetail;
  if (dom.liveRecapRetry) dom.liveRecapRetry.hidden = !readRetry;
  if (dom.liveRecapCancel) {
    dom.liveRecapCancel.hidden = !confirmation;
    dom.liveRecapCancel.disabled = dialogState.showing;
  }
  if (dom.liveRecapShow) {
    dom.liveRecapShow.hidden = view !== "current" || confirmation || !sessionWindow;
    dom.liveRecapShow.disabled = busy || offline || encoding || !session;
    dom.liveRecapShow.textContent = captured ? t("recap.showAgain") : t("recap.show");
  }
  if (dom.liveRecapShowAll) {
    dom.liveRecapShowAll.hidden = view !== "current" || confirmation || sessionWindow;
    dom.liveRecapShowAll.disabled = busy || offline || encoding || !session;
  }
  if (dom.liveRecapConfirm) {
    dom.liveRecapConfirm.hidden = !confirmation;
    dom.liveRecapConfirm.disabled = busy || offline || encoding || !session;
  }
  if (dom.liveRecapHide) {
    dom.liveRecapHide.hidden = view !== "current" || confirmation || !(current && current.visible);
    dom.liveRecapHide.disabled = busy || offline || encoding;
  }
  if (dom.liveRecapDownload) {
    dom.liveRecapDownload.hidden = view !== "current" || confirmation;
    dom.liveRecapDownload.disabled = busy || offline || encoding || !canDownload;
    dom.liveRecapDownload.setAttribute("aria-disabled", dom.liveRecapDownload.disabled ? "true" : "false");
    if (!canDownload && sessionWindow) {
      dom.liveRecapDownload.title = t("recap.downloadNeedsCapture");
    } else {
      dom.liveRecapDownload.removeAttribute("title");
    }
  }
  dom.liveRecapDialog.setAttribute(
    "aria-describedby",
    confirmation ? "live-recap-confirm-description" : "live-recap-status"
  );
}

async function request(path, options) {
  const response = await fetch(apiURL(path), options);
  const payload = await readJSON(response);
  if (!response.ok) {
    const error = new Error(mapHTTPError(response.status, payload && payload.error));
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadCurrent(options) {
  const opts = options || {};
  const generation = dialogState.generation;
  const previousController = loadController;
  const controller = new AbortController();
  loadController = controller;
  if (previousController) previousController.abort();
  if (!opts.background) {
    if (region()) region().setAttribute("aria-busy", "true");
    setStatus("");
  }
  try {
    const payload = await request("/api/stream-recaps/current", { signal: controller.signal });
    if (loadController !== controller || !canApplyRecapRead(dialogState, generation)) return null;
    current = payload;
    if (payload && payload.window === RECAP_WINDOW_ALL) {
      dialogWindow = RECAP_WINDOW_ALL;
    }
    offline = false;
    readRetry = null;
    setStatus("");
    render();
    return payload;
  } catch (error) {
    if (error.name === "AbortError") return null;
    if (loadController !== controller || !canApplyRecapRead(dialogState, generation)) return null;
    offline = isUnavailable(error);
    readRetry = function () { return loadCurrent(); };
    setStatus(offline ? t("recap.offline") : error.message, true);
    render();
    return null;
  } finally {
    if (loadController === controller) {
      if (canApplyRecapRead(dialogState, generation) && region()) region().setAttribute("aria-busy", "false");
      loadController = null;
    }
  }
}

async function loadHistory(cursor) {
  const generation = dialogState.generation;
  const previousController = historyController;
  const controller = new AbortController();
  historyController = controller;
  if (previousController) previousController.abort();
  setBusy(true, generation);
  try {
    const payload = await request(buildRecapHistoryURL(cursor), { signal: controller.signal });
    if (historyController !== controller || !canApplyRecapRead(dialogState, generation)) return;
    const sessions = Array.isArray(payload && payload.sessions) ? payload.sessions : [];
    history = cursor ? history.concat(sessions) : sessions;
    nextCursor = typeof payload.next_cursor === "string" && payload.next_cursor ? payload.next_cursor : null;
    historyLoaded = true;
    offline = false;
    readRetry = null;
    setStatus(t("recap.historyLoaded"));
  } catch (error) {
    if (error.name === "AbortError" || historyController !== controller || !canApplyRecapRead(dialogState, generation)) return;
    offline = isUnavailable(error);
    readRetry = function () { return loadHistory(cursor || null); };
    setStatus(offline ? t("recap.offline") : error.message, true);
  } finally {
    if (historyController === controller) historyController = null;
    setBusy(false, generation);
  }
}

async function openHistoryDetail(id, origin) {
  const generation = dialogState.generation;
  const previousController = detailController;
  const controller = new AbortController();
  detailController = controller;
  if (previousController) previousController.abort();
  setBusy(true, generation);
  try {
    const detail = await request(buildRecapSessionURL(id), { signal: controller.signal });
    if (detailController !== controller || !canApplyRecapRead(dialogState, generation)) return;
    selectedDetail = { detail: detail, origin_id: id, origin: origin };
    offline = false;
    readRetry = null;
    setStatus("");
  } catch (error) {
    if (error.name === "AbortError" || detailController !== controller || !canApplyRecapRead(dialogState, generation)) return;
    offline = isUnavailable(error);
    readRetry = function () { return openHistoryDetail(id, origin); };
    setStatus(offline ? t("recap.offline") : error.message, true);
  } finally {
    if (detailController === controller) detailController = null;
    setBusy(false, generation);
  }
}

function discardConfirmation() {
  dialogState = cancelRecapConfirmation(Object.assign({}, dialogState, { confirmation: confirmation }));
  confirmation = dialogState.confirmation;
}

async function showRecap() {
  if (busy || offline || !current || !current.session_id || dialogState.showing) return;
  const generation = dialogState.generation;
  const sessionID = current.session_id;
  dialogState = beginRecapShow(dialogState);
  setBusy(true, generation);
  try {
    const payload = await request("/api/stream-recaps/show", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildRecapShowBody(sessionID)) });
    if (!canApplyRecapDialogResult(dialogState, generation)) return;
    current.visible = payload.visible === true;
    current.window = payload.window || RECAP_WINDOW_SESSION;
    current.snapshot = payload.snapshot || current.snapshot;
    if (current.session) current.session.snapshot = current.snapshot;
    confirmation = false;
    setStatus(t("recap.shown"));
  } catch (error) {
    if (error.status === 409) {
      dialogState = resolveRecapShowConflict(dialogState);
      confirmation = dialogState.confirmation;
      setStatus(t("recap.sessionChanged"), true);
      await loadCurrent({ background: true });
      if (canApplyRecapRead(dialogState, generation)) setStatus(t("recap.sessionChanged"), true);
    } else {
      offline = isUnavailable(error);
      setStatus(offline ? t("recap.offline") : error.message, true);
    }
  } finally {
    if (canApplyRecapRead(dialogState, generation)) {
      dialogState = Object.assign({}, dialogState, { showing: false });
    }
    setBusy(false, generation);
  }
}

async function showAllTimeRecap() {
  if (busy || offline || encoding || !current || dialogState.showing) return;
  const generation = dialogState.generation;
  dialogState = beginRecapShow(dialogState);
  setBusy(true, generation);
  try {
    const payload = await request("/api/stream-recaps/show-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRecapShowAllBody()),
    });
    if (!canApplyRecapDialogResult(dialogState, generation)) return;
    current.visible = payload.visible === true;
    current.window = payload.window || RECAP_WINDOW_ALL;
    if (payload.all_time) current.all_time = payload.all_time;
    setStatus(t("recap.allTimeShown"));
  } catch (error) {
    if (!canApplyRecapDialogResult(dialogState, generation)) return;
    offline = isUnavailable(error);
    setStatus(offline ? t("recap.offline") : error.message, true);
  } finally {
    if (canApplyRecapRead(dialogState, generation)) {
      dialogState = Object.assign({}, dialogState, { showing: false });
    }
    setBusy(false, generation);
  }
}

async function downloadRecapImage() {
  if (busy || offline || encoding || !current) return;
  const presentation = recapDownloadPresentation(current, dialogWindow);
  if (!presentation.snapshot) {
    setStatus(t("recap.downloadNeedsCapture"), true);
    return;
  }
  const generation = dialogState.generation;
  encoding = true;
  setStatus(t("recap.downloadProgress"));
  render();
  try {
    const blob = await encodeRecapSharePNG(presentation);
    const result = await triggerRecapDownload(blob, recapDownloadFilename(dialogWindow), t("recap.saveDialogTitle"));
    if (result.cancelled) {
      setStatus(t("recap.downloadCancelled"));
    } else {
      setStatus(t("recap.downloadDone"));
    }
  } catch {
    setStatus(t("recap.downloadFailed"), true);
  } finally {
    encoding = false;
    if (canApplyRecapRead(dialogState, generation)) render();
  }
}

async function hideRecap() {
  if (busy || offline) return;
  const generation = dialogState.generation;
  setBusy(true, generation);
  try {
    const payload = await request("/api/stream-recaps/hide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildRecapHideBody()) });
    if (!canApplyRecapRead(dialogState, generation)) return;
    if (current) current.visible = payload.visible === true;
    setStatus(t("recap.hidden"));
  } catch (error) {
    if (!canApplyRecapDialogResult(dialogState, generation)) return;
    offline = isUnavailable(error);
    setStatus(offline ? t("recap.offline") : error.message, true);
  } finally { setBusy(false, generation); }
}

function switchView(next) {
  if (busy || confirmation) return;
  view = next;
  selectedDetail = null;
  render();
  if (next === "history" && !historyLoaded) loadHistory(null);
}

function closeDialog() {
  if (!isOpen() || !canCloseRecapDialog(dialogState)) return;
  dialogState = closeRecapDialogState(dialogState);
  confirmation = dialogState.confirmation;
  abortPendingReads();
  setBusy(false);
  dom.liveRecapDialog.close();
}

function focusFirst() {
  const target = dom.liveRecapHeading || dom.liveRecapCurrentTab;
  if (target) target.focus({ preventScroll: true });
}

function trapFocus(event) {
  if (event.key !== "Tab" || !isOpen()) return;
  const focusable = Array.from(dom.liveRecapDialog.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"))
    .filter(function (element) { return !element.hidden && element.getClientRects().length > 0; });
  if (!focusable.length) return;
  const first = focusable[0]; const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

export function handleLiveRecapWire(frame) {
  if (!isOpen() || !current) return false;
  if (!recapStateFrameApplies(frame, current.session_id)) return false;
  if (isHiddenRecapStateFrame(frame)) {
    current.visible = false;
    discardConfirmation();
    render();
    loadCurrent({ background: true });
    return true;
  }
  current.visible = frame.visible === true;
  if (frame.window) current.window = frame.window;
  if (isAllTimeRecapStateFrame(frame) && frame.all_time) {
    current.all_time = frame.all_time;
  }
  if (isCurrentRecapStateFrame(frame, current.session_id) && frame.snapshot) {
    current.snapshot = frame.snapshot;
    if (current.session) current.session.snapshot = frame.snapshot;
  }
  render();
  return true;
}

export function reconcileLiveRecapOnReconnect() {
  if (isOpen()) loadCurrent({ background: true });
}

export function initLiveRecap() {
  if (!dom.liveRecapButton || !dom.liveRecapDialog) return;
  dom.liveRecapButton.addEventListener("click", function () {
    opener = dom.liveRecapButton;
    view = "current"; dialogWindow = RECAP_WINDOW_SESSION; selectedDetail = null; confirmation = false; offline = false; readRetry = null; encoding = false;
    dialogState = openRecapDialog(dialogState);
    dom.liveRecapDialog.showModal();
    focusFirst();
    loadCurrent();
  });
  dom.liveRecapCurrentTab.addEventListener("click", function () { switchView("current"); });
  dom.liveRecapHistoryTab.addEventListener("click", function () { switchView("history"); });
  dom.liveRecapShow.addEventListener("click", function () { if (!busy && !dialogState.showing) { confirmation = true; dialogState = Object.assign({}, dialogState, { confirmation: true }); render(); dom.liveRecapConfirm.focus(); } });
  dom.liveRecapConfirm.addEventListener("click", showRecap);
  dom.liveRecapCancel.addEventListener("click", function () { if (!dialogState.showing) { discardConfirmation(); render(); dom.liveRecapShow.focus(); } });
  dom.liveRecapBack.addEventListener("click", function () {
    if (busy || !selectedDetail) return;
    const originID = selectedDetail.origin_id;
    selectedDetail = null;
    render();
    const origin = dom.liveRecapBody && Array.from(
      dom.liveRecapBody.querySelectorAll("button[data-session-id]")
    ).find(function (button) { return button.dataset.sessionId === originID; });
    if (origin) origin.focus({ preventScroll: true });
  });
  dom.liveRecapHide.addEventListener("click", hideRecap);
  if (dom.liveRecapShowAll) dom.liveRecapShowAll.addEventListener("click", showAllTimeRecap);
  if (dom.liveRecapDownload) dom.liveRecapDownload.addEventListener("click", downloadRecapImage);
  dom.liveRecapRetry.addEventListener("click", function () { if (!busy && readRetry) readRetry(); });
  dom.liveRecapClose.addEventListener("click", closeDialog);
  dom.liveRecapDialog.addEventListener("cancel", function (event) { event.preventDefault(); closeDialog(); });
  dom.liveRecapDialog.addEventListener("click", function (event) { if (event.target === dom.liveRecapDialog) closeDialog(); });
  dom.liveRecapDialog.addEventListener("keydown", trapFocus);
  dom.liveRecapDialog.addEventListener("close", function () {
    dialogState = closeRecapDialogState(dialogState);
    confirmation = dialogState.confirmation;
    abortPendingReads();
    setBusy(false);
    if (opener) opener.focus({ preventScroll: true });
  });
  window.addEventListener("admin-locale-applied", function () { if (isOpen()) render(); });
}
