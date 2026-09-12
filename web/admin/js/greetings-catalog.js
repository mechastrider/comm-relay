import * as dom from "./dom.js";
import { apiURL, mapHTTPError, readJSON } from "./api.js";
import { t } from "./i18n-ui.js";
import { previewStreamerName, renderSplashPreview } from "./catalog-template.js";
import { insertSplashVariable } from "./catalog-template-core.js";
import { confirmDiscardChanges } from "./discard-changes-dialog.js";
import { createCatalogMediaController } from "./catalog-media-ui.js";

const greetingMedia = createCatalogMediaController({
  imagePreview: dom.greetingImagePreview,
  imageInput: dom.greetingImageInput,
  imageClear: dom.greetingImageClear,
  imageError: dom.greetingImageError,
  imageFitInput: dom.greetingImageFitInput,
  imageFitError: dom.greetingImageFitError,
  imageSizeInput: dom.greetingImageSizeInput,
  imageSizeValue: dom.greetingImageSizeValue,
  imageSizeError: dom.greetingImageSizeError,
  soundFileInput: dom.greetingSoundFileInput,
  soundFileClear: dom.greetingSoundFileClear,
  soundFileError: dom.greetingSoundFileError,
  soundVolumeInput: dom.greetingSoundVolumeInput,
  soundVolumeValue: dom.greetingSoundVolumeValue,
  soundVolumeError: dom.greetingSoundVolumeError,
  soundPlay: dom.greetingSoundPlay,
  soundStop: dom.greetingSoundStop,
  builtInSoundInput: dom.greetingSoundInput,
  layoutName: "greeting-layout",
  layoutError: dom.greetingLayoutError,
  graphicKind: "greeting",
  graphicIdentity: function (record) {
    return {
      identifier: String(record.id || ""),
      label: String(record.id || ""),
    };
  },
});
greetingMedia.bind();

let greetings = [];
let selectedID = "";
let loading = null;
let dirty = false;
let saving = false;

const el = (id) => document.getElementById(id);

function selected() { return greetings.find((item) => item.id === selectedID) || null; }
function visible() { return window.location.hash.toLowerCase().startsWith("#audience/greetings"); }
function label(item) { return item.id === "returning_viewer" ? t("greetings.returningViewer") : t("greetings.newViewer"); }
function hint(item) { return item.id === "returning_viewer" ? t("greetings.returningViewerHint") : t("greetings.newViewerHint"); }

function setFieldError(input, element, message) {
  if (!input || !element) {
    return;
  }
  element.textContent = message || "";
  element.hidden = !message;
  if (message) {
    input.setAttribute("aria-invalid", "true");
    if (element.id) {
      input.setAttribute("aria-describedby", element.id);
    }
  } else {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  }
}

function setBusy(next) {
  saving = Boolean(next);
  [el("greetings-save"), el("greetings-test")].forEach((button) => { if (button) button.disabled = next; });
  const list = el("greetings-list"); if (list) list.setAttribute("aria-busy", saving ? "true" : "false");
  const form = el("greetings-form"); if (form) { form.setAttribute("aria-busy", saving ? "true" : "false"); form.querySelectorAll("input, select, button").forEach((control) => { control.disabled = saving; }); }
}

function currentPayload() {
  const item = selected();
  return {
    id: item ? item.id : "",
    enabled: Boolean(el("greeting-enabled")?.checked),
    splash_template: el("greeting-template")?.value || "",
    sound: el("greeting-sound")?.value || "",
    duration_ms: Number(el("greeting-duration")?.value || 0),
    ...greetingMedia.readPayload(),
  };
}

function updatePreview() {
  renderSplashPreview(el("greeting-template-preview"), el("greeting-template")?.value || "", { viewer: "Alice", streamer: previewStreamerName(), message: "Hello!" });
}

function renderList() {
  const list = el("greetings-list"); if (!list) return;
  list.textContent = "";
  greetings.forEach((item) => {
    const row = document.createElement("li"); row.className = "audience-catalog-items__item"; row.role = "option"; row.tabIndex = item.id === selectedID ? 0 : -1; row.setAttribute("aria-selected", item.id === selectedID ? "true" : "false");
    if (item.id === selectedID) row.classList.add("audience-catalog-items__item--selected");
    const primary = document.createElement("span"); primary.className = "audience-catalog-items__primary"; primary.textContent = label(item);
    const meta = document.createElement("span"); meta.className = "audience-catalog-items__meta"; meta.textContent = hint(item) + " · " + (item.enabled ? t("commands.enabledShort") : t("commands.disabledShort"));
    row.append(primary, meta);
    const choose = async () => {
      if (saving) return;
      if (item.id !== selectedID && dirty && !await confirmDiscardChanges({ message: t("greetings.discardConfirm"), opener: row })) return;
      if (item.id !== selectedID) {
        greetingMedia.abandonPendingUploads();
        greetingMedia.stopPreview();
      }
      selectedID = item.id; fill(); renderList();
      if (window.matchMedia("(max-width: 720px)").matches) el("greetings-editor-heading")?.focus();
    };
    row.addEventListener("click", function () { void choose(); }); row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void choose(); } });
    list.append(row);
  });
}

function fill() {
  const item = selected(); const form = el("greetings-form"); if (!item || !form) return;
  form.hidden = false;
  greetingMedia.stopPreview();
  el("greeting-enabled").checked = Boolean(item.enabled);
  el("greeting-template").value = item.splash_template || "";
  el("greeting-sound").value = item.sound || "";
  el("greeting-duration").value = String(item.duration_ms || 5000);
  greetingMedia.fillFromRecord(item);
  greetingMedia.setGraphicIdentity(item.id, label(item));
  el("greeting-trigger").textContent = hint(item);
  el("greetings-status").textContent = "";
  dirty = false;
  clearErrors();
  updatePreview();
}

function clearErrors() {
  document.querySelectorAll("[data-greeting-error]").forEach((node) => { node.hidden = true; node.textContent = ""; });
  greetingMedia.clearFieldErrors();
}

function showErrors(fields) {
  clearErrors();
  if (fields?.splash_template) {
    setFieldError(el("greeting-template"), document.querySelector('[data-greeting-error="splash_template"]'), fields.splash_template);
  }
  if (fields?.duration_ms) {
    setFieldError(el("greeting-duration"), document.querySelector('[data-greeting-error="duration_ms"]'), fields.duration_ms);
  }
  greetingMedia.applyFieldErrors(fields);
}

async function request(path, payload) {
  const response = await fetch(apiURL(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const body = await readJSON(response); if (!response.ok) { const error = new Error(mapHTTPError(response.status, body?.error)); error.fields = body?.fields; throw error; } return body;
}

async function load() {
  const response = await fetch(apiURL("/api/greetings"), { headers: { Accept: "application/json" } }); const body = await readJSON(response);
  if (!response.ok) throw new Error(mapHTTPError(response.status, body?.error));
  greetings = Array.isArray(body?.greetings) ? body.greetings : []; if (!selectedID || !selected()) selectedID = greetings[0]?.id || ""; renderList(); fill();
}

export function ensureGreetingsLoaded() {
  if (!visible()) return Promise.resolve(); if (loading) return loading;
  loading = load().catch((error) => { const box = el("greetings-list-error"); if (box) { box.hidden = false; const body = box.querySelector(".notice__body"); if (body) body.textContent = error.message; } throw error; }).finally(() => { loading = null; }); return loading;
}

export function initGreetingsCatalog() {
  // Greetings deliberately omit {points}; reuse the shared accessible chip style for the allowed variables.
  const chips = el("greeting-template-vars"); if (chips) { chips.textContent = ""; const hints={"{viewer}":"catalog.variableViewer","{streamer}":"catalog.variableStreamer","{message}":"catalog.variableMessage"}; ["{viewer}", "{streamer}", "{message}"].forEach((token) => { const button=document.createElement("button"); const hint=t(hints[token]); button.type="button"; button.className="catalog-template-chip has-tooltip"; button.textContent=token; button.setAttribute("aria-label", t("catalog.insertVariable",{variable:token})+". "+hint); const tooltip=document.createElement("span"); tooltip.className="ui-tooltip"; tooltip.setAttribute("role", "tooltip"); tooltip.textContent=hint; button.append(tooltip); button.addEventListener("click",()=>{ insertSplashVariable(el("greeting-template"),token); dirty=true; updatePreview(); el("greeting-template").focus(); }); chips.append(button); }); }
  el("greeting-template")?.addEventListener("input", updatePreview);
  el("greetings-form")?.addEventListener("input", () => { dirty = true; });
  el("greetings-form")?.addEventListener("change", () => { dirty = true; });
  el("greetings-retry")?.addEventListener("click", () => ensureGreetingsLoaded().catch(() => {}));
  el("greetings-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const saved = await request("/api/greetings/update", currentPayload());
      const index = greetings.findIndex((item) => item.id === saved.id);
      if (index >= 0) greetings[index] = saved;
      greetingMedia.commitSavedRecord(saved);
      renderList();
      fill();
      el("greetings-status").textContent = t("greetings.saved");
    } catch (error) {
      showErrors(error.fields);
      el("greetings-status").textContent = error.message;
    } finally {
      setBusy(false);
    }
  });
  el("greetings-test")?.addEventListener("click", async () => {
    setBusy(true);
    try {
      const result = await request("/api/greetings/preview", currentPayload());
      el("greetings-status").textContent = result.delivered_clients ? t("greetings.previewDelivered", { count: result.delivered_clients }) : t("greetings.previewNone");
    } catch (error) {
      showErrors(error.fields);
      el("greetings-status").textContent = error.message;
    } finally {
      setBusy(false);
    }
  });
  window.addEventListener("hashchange", function () {
    if (!visible()) {
      greetingMedia.abandonPendingUploads();
      greetingMedia.stopPreview();
    }
  });
}
