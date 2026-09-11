import { apiURL, mapHTTPError, readJSON } from "./api.js";
import { t } from "./i18n-ui.js";
import { previewStreamerName, renderSplashPreview } from "./catalog-template.js";
import { insertSplashVariable } from "./catalog-template-core.js";

let greetings = [];
let selectedID = "";
let loading = null;
let dirty = false;

const el = (id) => document.getElementById(id);

function selected() { return greetings.find((item) => item.id === selectedID) || null; }
function visible() { return window.location.hash.toLowerCase().startsWith("#audience/greetings"); }
function label(item) { return item.id === "returning_viewer" ? t("greetings.returningViewer") : t("greetings.newViewer"); }
function hint(item) { return item.id === "returning_viewer" ? t("greetings.returningViewerHint") : t("greetings.newViewerHint"); }

function setBusy(next) {
  [el("greetings-save"), el("greetings-test")].forEach((button) => { if (button) button.disabled = next; });
}

function currentPayload() {
  const item = selected();
  return {
    id: item ? item.id : "",
    enabled: Boolean(el("greeting-enabled")?.checked),
    splash_template: el("greeting-template")?.value || "",
    sound: el("greeting-sound")?.value || "",
    duration_ms: Number(el("greeting-duration")?.value || 0),
    image_asset: el("greeting-image-name")?.dataset.filename || "",
    sound_file: el("greeting-sound-name")?.dataset.filename || "",
    sound_volume: Number(el("greeting-volume")?.value || 70),
    layout: document.querySelector('input[name="greeting-layout"]:checked')?.value || "card",
    image_fit: el("greeting-image-fit")?.value || "contain",
    image_size_pct: Number(el("greeting-image-size")?.value || 100),
  };
}

function updatePreview() {
  renderSplashPreview(el("greeting-template-preview"), el("greeting-template")?.value || "", { viewer: "Alice", streamer: previewStreamerName(), message: "Hello!" });
  const volume = el("greeting-volume"); const size = el("greeting-image-size");
  if (el("greeting-volume-output") && volume) el("greeting-volume-output").textContent = volume.value + "%";
  if (el("greeting-image-size-output") && size) el("greeting-image-size-output").textContent = size.value + "%";
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
    const choose = () => {
      if (item.id !== selectedID && dirty && !window.confirm(t("greetings.discardConfirm"))) return;
      selectedID = item.id; fill(); renderList();
      if (window.matchMedia("(max-width: 720px)").matches) el("greetings-editor-heading")?.focus();
    };
    row.addEventListener("click", choose); row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); } });
    list.append(row);
  });
}

function fill() {
  const item = selected(); const form = el("greetings-form"); if (!item || !form) return;
  form.hidden = false;
  el("greeting-enabled").checked = Boolean(item.enabled); el("greeting-template").value = item.splash_template || ""; el("greeting-sound").value = item.sound || ""; el("greeting-duration").value = String(item.duration_ms || 5000);
  el("greeting-image-name").dataset.filename = item.image_asset || ""; el("greeting-image-name").textContent = item.image_asset || "";
  el("greeting-sound-name").dataset.filename = item.sound_file || ""; el("greeting-sound-name").textContent = item.sound_file || "";
  el("greeting-volume").value = String(item.sound_volume ?? 70); el("greeting-image-fit").value = item.image_fit || "contain"; el("greeting-image-size").value = String(item.image_size_pct || 100);
  const layout = document.querySelector('input[name="greeting-layout"][value="' + (item.layout || "card") + '"]'); if (layout) layout.checked = true;
  el("greeting-trigger").textContent = hint(item); el("greetings-status").textContent = ""; dirty = false; clearErrors(); updatePreview();
}

function clearErrors() { document.querySelectorAll("[data-greeting-error]").forEach((node) => { node.hidden = true; node.textContent = ""; }); document.querySelectorAll("[aria-invalid=true]").forEach((node) => node.removeAttribute("aria-invalid")); }
function showErrors(fields) { clearErrors(); const inputs={splash_template:el("greeting-template"),duration_ms:el("greeting-duration"),image_asset:el("greeting-image-file"),sound_file:el("greeting-sound-file"),sound_volume:el("greeting-volume"),layout:document.querySelector('input[name="greeting-layout"]'),image_fit:el("greeting-image-fit"),image_size_pct:el("greeting-image-size")}; let first = null; Object.entries(fields || {}).forEach(([field, message]) => { const error = document.querySelector('[data-greeting-error="' + field + '"]'); const input = inputs[field]; if (error) { error.textContent = message; error.hidden = false; } if (input) { input.setAttribute("aria-invalid", "true"); if (!first) first = input; } }); if (first) first.focus(); }

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

async function upload(file, kind, target) {
  if (!file) return; setBusy(true); const body = new FormData(); body.append("kind", kind); body.append("file", file);
  try { const response = await fetch(apiURL("/api/overlay/assets/upload"), { method: "POST", body }); const result = await readJSON(response); if (!response.ok) throw new Error(mapHTTPError(response.status, result?.error)); target.dataset.filename = result.filename || ""; target.textContent = result.filename || ""; } finally { setBusy(false); }
}

export function initGreetingsCatalog() {
  // Greetings deliberately omit {points}; reuse the shared accessible chip style for the allowed variables.
  const chips = el("greeting-template-vars"); if (chips) { chips.textContent = ""; const hints={"{viewer}":"catalog.variableViewer","{streamer}":"catalog.variableStreamer","{message}":"catalog.variableMessage"}; ["{viewer}", "{streamer}", "{message}"].forEach((token) => { const button=document.createElement("button"); const hint=t(hints[token]); button.type="button"; button.className="catalog-template-chip has-tooltip"; button.textContent=token; button.setAttribute("aria-label", t("catalog.insertVariable",{variable:token})+". "+hint); const tooltip=document.createElement("span"); tooltip.className="ui-tooltip"; tooltip.setAttribute("role", "tooltip"); tooltip.textContent=hint; button.append(tooltip); button.addEventListener("click",()=>{ insertSplashVariable(el("greeting-template"),token); dirty=true; updatePreview(); el("greeting-template").focus(); }); chips.append(button); }); }
  el("greeting-template")?.addEventListener("input", updatePreview); el("greeting-volume")?.addEventListener("input", updatePreview); el("greeting-image-size")?.addEventListener("input", updatePreview);
  el("greetings-form")?.addEventListener("input", () => { dirty = true; }); el("greetings-form")?.addEventListener("change", () => { dirty = true; });
  el("greeting-image-file")?.addEventListener("change", (event) => upload(event.target.files?.[0], "alert_image", el("greeting-image-name")).catch((error) => { el("greetings-status").textContent = error.message; }));
  el("greeting-sound-file")?.addEventListener("change", (event) => upload(event.target.files?.[0], "alert_sound", el("greeting-sound-name")).catch((error) => { el("greetings-status").textContent = error.message; }));
  el("greeting-image-clear")?.addEventListener("click", () => { el("greeting-image-name").dataset.filename=""; el("greeting-image-name").textContent=""; }); el("greeting-sound-clear")?.addEventListener("click", () => { el("greeting-sound-name").dataset.filename=""; el("greeting-sound-name").textContent=""; });
  el("greetings-retry")?.addEventListener("click", () => ensureGreetingsLoaded().catch(() => {}));
  el("greetings-form")?.addEventListener("submit", async (event) => { event.preventDefault(); setBusy(true); try { const saved=await request("/api/greetings/update", currentPayload()); const index=greetings.findIndex((item)=>item.id===saved.id); if(index>=0) greetings[index]=saved; renderList(); fill(); el("greetings-status").textContent=t("greetings.saved"); } catch(error) { showErrors(error.fields); el("greetings-status").textContent=error.message; } finally { setBusy(false); } });
  el("greetings-test")?.addEventListener("click", async () => { setBusy(true); try { const result=await request("/api/greetings/preview", currentPayload()); el("greetings-status").textContent=result.delivered_clients ? t("greetings.previewDelivered",{count:result.delivered_clients}) : t("greetings.previewNone"); } catch(error) { showErrors(error.fields); el("greetings-status").textContent=error.message; } finally { setBusy(false); } });
}
