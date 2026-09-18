import * as dom from "./dom.js";
import { apiURL, mapHTTPError, readJSON } from "./api.js";
import { t } from "./i18n-ui.js";
import {
  buildRecapHistoryURL,
  buildRecapSessionURL,
  recapDownloadFilename,
  recapDownloadPresentation,
  recapDisplayData,
  RECAP_WINDOW_SESSION,
} from "./live-recap-helpers.js";
import { createRecapHistoryRow, renderRecapSessionDetail } from "./live-recap-session-render.js";
import { encodeRecapSharePNG, triggerRecapDownload } from "./recap-share-image.js";
import { archiveDownloadVisible } from "./audience-archive-core.js";

export { archiveDownloadVisible, archiveViewMode } from "./audience-archive-core.js";

let sessions = [];
let nextCursor = null;
let listLoaded = false;
let selectedDetail = null;
let busy = false;
let encoding = false;
let readRetry = null;
let listController = null;
let detailController = null;

function isUnavailable(error) {
  return !error.status || error.status === 503;
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

function setStatus(message, error) {
  if (!dom.audienceArchiveStatus) return;
  dom.audienceArchiveStatus.textContent = message || "";
  dom.audienceArchiveStatus.hidden = !message;
  dom.audienceArchiveStatus.setAttribute("role", error ? "alert" : "status");
  dom.audienceArchiveStatus.classList.toggle("notice--error", Boolean(error));
}

function syncChrome() {
  const inDetail = Boolean(selectedDetail);
  if (dom.audienceArchiveBack) {
    dom.audienceArchiveBack.hidden = !inDetail;
    dom.audienceArchiveBack.disabled = busy || encoding;
  }
  if (dom.audienceArchiveDownload) {
    const canDownload = inDetail && selectedDetail && archiveDownloadVisible(selectedDetail.detail);
    dom.audienceArchiveDownload.hidden = !canDownload;
    dom.audienceArchiveDownload.disabled = busy || encoding || !canDownload;
  }
  if (dom.audienceArchiveRetry) {
    dom.audienceArchiveRetry.hidden = !readRetry;
    dom.audienceArchiveRetry.disabled = busy || encoding;
  }
}

function clearContent() {
  if (dom.audienceArchiveContent) dom.audienceArchiveContent.textContent = "";
}

function renderContent() {
  const mount = dom.audienceArchiveContent;
  if (!mount) return;
  clearContent();
  mount.setAttribute("aria-busy", busy ? "true" : "false");
  syncChrome();

  if (selectedDetail) {
    renderRecapSessionDetail(mount, selectedDetail.detail, { historical: true });
    return;
  }

  if (!sessions.length && listLoaded) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = t("recap.historyEmpty");
    mount.append(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "live-recap-history";
  sessions.forEach(function (summary) {
    list.append(createRecapHistoryRow(summary, openDetail));
  });
  mount.append(list);

  if (nextCursor) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "btn-physical btn-small";
    more.disabled = busy;
    more.textContent = t("recap.loadMore");
    more.addEventListener("click", function () {
      loadSessions(nextCursor);
    });
    mount.append(more);
  }
}

async function loadSessions(cursor) {
  const previousController = listController;
  const controller = new AbortController();
  listController = controller;
  if (previousController) previousController.abort();
  busy = true;
  renderContent();
  try {
    const payload = await request(buildRecapHistoryURL(cursor), { signal: controller.signal });
    if (listController !== controller) return;
    const page = Array.isArray(payload && payload.sessions) ? payload.sessions : [];
    sessions = cursor ? sessions.concat(page) : page;
    nextCursor = typeof payload.next_cursor === "string" && payload.next_cursor ? payload.next_cursor : null;
    listLoaded = true;
    readRetry = null;
    setStatus(t("recap.historyLoaded"));
  } catch (error) {
    if (error.name === "AbortError" || listController !== controller) return;
    readRetry = function () {
      return loadSessions(cursor || null);
    };
    setStatus(isUnavailable(error) ? t("recap.offline") : error.message, true);
  } finally {
    if (listController === controller) listController = null;
    busy = false;
    renderContent();
  }
}

async function openDetail(id, origin) {
  const previousController = detailController;
  const controller = new AbortController();
  detailController = controller;
  if (previousController) previousController.abort();
  busy = true;
  renderContent();
  try {
    const detail = await request(buildRecapSessionURL(id), { signal: controller.signal });
    if (detailController !== controller) return;
    selectedDetail = { detail: detail, origin_id: id, origin: origin };
    readRetry = null;
    setStatus("");
  } catch (error) {
    if (error.name === "AbortError" || detailController !== controller) return;
    readRetry = function () {
      return openDetail(id, origin);
    };
    setStatus(isUnavailable(error) ? t("recap.offline") : error.message, true);
  } finally {
    if (detailController === controller) detailController = null;
    busy = false;
    renderContent();
    if (selectedDetail && dom.audienceArchiveContent) {
      const heading = dom.audienceArchiveContent.querySelector("h3");
      if (heading) heading.focus({ preventScroll: true });
    }
  }
}

function backToList() {
  if (busy || !selectedDetail) return;
  const originID = selectedDetail.origin_id;
  selectedDetail = null;
  renderContent();
  const origin = dom.audienceArchiveContent && Array.from(
    dom.audienceArchiveContent.querySelectorAll("button[data-session-id]")
  ).find(function (button) {
    return button.dataset.sessionId === originID;
  });
  if (origin) origin.focus({ preventScroll: true });
}

async function downloadArchiveImage() {
  if (busy || encoding || !selectedDetail || !archiveDownloadVisible(selectedDetail.detail)) return;
  const data = recapDisplayData(selectedDetail.detail);
  const presentation = recapDownloadPresentation({ snapshot: data.snapshot }, RECAP_WINDOW_SESSION);
  if (!presentation.snapshot) {
    setStatus(t("recap.downloadNeedsCapture"), true);
    return;
  }
  encoding = true;
  setStatus(t("recap.downloadProgress"));
  syncChrome();
  try {
    const blob = await encodeRecapSharePNG(presentation);
    triggerRecapDownload(blob, recapDownloadFilename(RECAP_WINDOW_SESSION));
    setStatus(t("recap.downloadDone"));
  } catch {
    setStatus(t("recap.downloadFailed"), true);
  } finally {
    encoding = false;
    syncChrome();
  }
}

export function ensureAudienceArchiveLoaded() {
  if (listLoaded || busy) return;
  loadSessions(null);
}

export function initAudienceArchive() {
  if (!dom.audienceArchivePanel || !dom.audienceArchiveContent) return;
  if (dom.audienceArchiveBack) {
    dom.audienceArchiveBack.addEventListener("click", backToList);
  }
  if (dom.audienceArchiveDownload) {
    dom.audienceArchiveDownload.addEventListener("click", downloadArchiveImage);
  }
  if (dom.audienceArchiveRetry) {
    dom.audienceArchiveRetry.addEventListener("click", function () {
      if (!busy && readRetry) readRetry();
    });
  }
  window.addEventListener("admin-locale-applied", function () {
    if (!dom.audienceArchivePanel.hidden) renderContent();
  });
}
