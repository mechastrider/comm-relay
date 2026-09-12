import { apiURL, mapHTTPError, readJSON } from "./api.js";
import { t } from "./i18n-ui.js";
import { confirmDiscardChanges } from "./discard-changes-dialog.js";

let levels = [];
let achievements = [];
let settings = null;
let loading = null;
let selectedLevelID = "";
let selectedAchievementID = "";
let levelDraft = "";
let achievementDraft = "";

const el = (id) => document.getElementById(id);
const checked = (id) => Boolean(el(id)?.checked);
const value = (id) => el(id)?.value || "";
const number = (id, fallback) => {
  const parsed = Number(value(id));
  return Number.isFinite(parsed) ? parsed : fallback;
};

function isVisible() {
  return window.location.hash.toLowerCase().startsWith("#audience/progression");
}

async function request(path, payload) {
  const response = await fetch(apiURL(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await readJSON(response);
  if (!response.ok) {
    throw new Error(mapHTTPError(response.status, body?.error));
  }
  return body;
}

async function fetchJSON(path) {
  const response = await fetch(apiURL(path), { headers: { Accept: "application/json" } });
  const body = await readJSON(response);
  if (!response.ok) {
    throw new Error(mapHTTPError(response.status, body?.error));
  }
  return body;
}

function setStatus(message) {
  const status = el("progression-status");
  if (status) status.textContent = message || "";
}

function setLevelError(message) {
  const error = el("progression-level-error");
  if (!error) return;
  error.textContent = message || "";
  error.hidden = !message;
}

function selectedLevel() { return levels.find((item) => item.id === selectedLevelID) || null; }
function selectedAchievement() { return achievements.find((item) => item.id === selectedAchievementID) || null; }

function filteredAchievements() {
  const query = value("progression-achievement-search").trim().toLocaleLowerCase();
  const filter = value("progression-achievement-filter") || "all";
  return achievements.filter(function (item) {
    const revision = item.revision || {};
    if (filter === "enabled" && !item.enabled) return false;
    if (filter === "disabled" && item.enabled) return false;
    if (filter === "secret" && !item.secret) return false;
    if (filter === "repeatable" && !revision.repeatable) return false;
    if (!query) return true;
    return [item.name, item.description, revision.metric, revision.subject_label, revision.subject_id].join(" ").toLocaleLowerCase().includes(query);
  });
}

function achievementCondition(item) {
  const revision = item?.revision || {};
  const target = revision.target || 1;
  const subject = revision.subject_label || revision.subject_id || "";
  const metric = revision.metric || value("progression-achievement-metric");
  const labels = { message_count: "progression.metricMessages", xp: "progression.metricXP", award_count: "progression.metricAwards", command_count: "progression.metricCommands", session_count: "progression.metricSessions", contract_win_count: "progression.metricContracts" };
  return t("progression.condition", { target, subject: subject ? subject + " " : "", metric: t(labels[metric] || metric) });
}

function levelPayload() {
  return { id: value("progression-level-id"), title: value("progression-level-title"), min_xp: number("progression-level-xp", -1), announce: checked("progression-level-announce") };
}

function fingerprint(payload) { return JSON.stringify(payload); }

async function allowLevelChange(opener) {
  return !levelDraft || levelDraft === fingerprint(levelPayload()) || await confirmDiscardChanges({ message: t("progression.discardConfirm"), opener });
}

async function allowAchievementChange(opener) {
  return !achievementDraft || achievementDraft === fingerprint(achievementPayload()) || await confirmDiscardChanges({ message: t("progression.discardConfirm"), opener });
}

function renderList(host, items, selectedID, label, choose) {
  if (!host) return;
  host.textContent = "";
  items.forEach(function (item) {
    const row = document.createElement("li");
    row.className = "audience-catalog-items__item";
    row.role = "option";
    row.tabIndex = item.id === selectedID ? 0 : -1;
    row.setAttribute("aria-selected", item.id === selectedID ? "true" : "false");
    if (item.id === selectedID) row.classList.add("audience-catalog-items__item--selected");
    const primary = document.createElement("span");
    primary.className = "audience-catalog-items__primary";
    primary.textContent = label(item);
    row.append(primary);
    row.addEventListener("click", function () { choose(item); });
    row.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(item); }
    });
    host.append(row);
  });
}

function fillLevel(item) {
  el("progression-level-id").value = item?.id || "";
  el("progression-level-title").value = item?.title || "";
  el("progression-level-xp").value = String(item?.min_xp ?? 0);
  el("progression-level-announce").checked = item ? item.announce !== false : true;
  const baseline = item?.min_xp === 0;
  el("progression-level-xp").readOnly = baseline;
  el("progression-level-delete").disabled = baseline;
  el("progression-level-baseline-hint").hidden = !baseline;
  levelDraft = fingerprint(levelPayload());
}

function syncSubjectField() {
  const metric = value("progression-achievement-metric");
  const subject = el("progression-subject-field");
  if (subject) subject.hidden = metric !== "award_count" && metric !== "command_count";
}

function fillAchievement(item) {
  const revision = item?.revision || {};
  el("progression-achievement-id").value = item?.id || "";
  el("progression-achievement-name").value = item?.name || "";
  el("progression-achievement-description").value = item?.description || "";
  el("progression-achievement-metric").value = revision.metric || "message_count";
  el("progression-achievement-subject").value = revision.subject_id || "";
  el("progression-achievement-target").value = String(revision.target ?? 1);
  el("progression-achievement-enabled").checked = item ? item.enabled !== false : true;
  el("progression-achievement-secret").checked = Boolean(item?.secret);
  el("progression-achievement-repeatable").checked = Boolean(revision.repeatable);
  el("progression-achievement-announce").checked = item ? item.announce !== false : true;
  syncSubjectField();
  el("progression-achievement-condition").textContent = achievementCondition(item);
  achievementDraft = fingerprint(achievementPayload());
}

function render() {
  renderList(el("progression-level-list"), levels, selectedLevelID, (item) => item.title + " · " + item.min_xp + " XP", function (item) {
    allowLevelChange(document.activeElement).then(function (allowed) { if (allowed) { selectedLevelID = item.id; fillLevel(item); render(); } });
  });
  renderList(el("progression-achievement-list"), filteredAchievements(), selectedAchievementID, (item) => item.name + " · " + achievementCondition(item), function (item) {
    allowAchievementChange(document.activeElement).then(function (allowed) { if (allowed) { selectedAchievementID = item.id; fillAchievement(item); render(); } });
  });
  el("progression-achievement-empty").hidden = filteredAchievements().length > 0;
}

function applySettings() {
  if (!settings) return;
  el("progression-level-alert-enabled").checked = settings.level_enabled !== false;
  el("progression-achievement-alert-enabled").checked = settings.achievement_enabled !== false;
  el("progression-alert-layout").value = settings.layout || "card";
  el("progression-alert-sound").value = settings.sound || "";
  el("progression-alert-volume").value = String(settings.sound_volume ?? 70);
  el("progression-alert-duration").value = String(settings.duration_ms || 5000);
}

async function load() {
  const [levelPayload, achievementPayload, nextSettings, status] = await Promise.all([
    fetchJSON("/api/progression/levels"), fetchJSON("/api/progression/achievements"), fetchJSON("/api/progression/settings"), fetchJSON("/api/progression/status"),
  ]);
  levels = Array.isArray(levelPayload?.levels) ? levelPayload.levels.slice().sort((left, right) => left.min_xp - right.min_xp || left.id.localeCompare(right.id)) : [];
  achievements = Array.isArray(achievementPayload?.achievements) ? achievementPayload.achievements : [];
  settings = nextSettings;
  if (!selectedLevel() && levels.length) selectedLevelID = levels[0].id;
  if (!selectedAchievement() && achievements.length) selectedAchievementID = achievements[0].id;
  fillLevel(selectedLevel()); fillAchievement(selectedAchievement()); applySettings(); render();
  setStatus(status?.state ? t("progression.status") + ": " + status.state : "");
  el("progression-retry").hidden = true;
}

export function ensureProgressionLoaded() {
  if (!isVisible()) return Promise.resolve();
  if (loading) return loading;
  setStatus(t("state.loading"));
  loading = load().catch(function (error) { setStatus(error.message); el("progression-retry").hidden = false; throw error; }).finally(function () { loading = null; });
  return loading;
}

function achievementPayload() {
  return { id: value("progression-achievement-id"), name: value("progression-achievement-name"), description: value("progression-achievement-description"), enabled: checked("progression-achievement-enabled"), secret: checked("progression-achievement-secret"), announce: checked("progression-achievement-announce"), metric: value("progression-achievement-metric"), subject_id: value("progression-achievement-subject"), subject_label: value("progression-achievement-subject"), target: number("progression-achievement-target", 0), repeatable: checked("progression-achievement-repeatable") };
}

export function initProgressionCatalog() {
  el("progression-level-new")?.addEventListener("click", function (event) { allowLevelChange(event.currentTarget).then(function (allowed) { if (allowed) { selectedLevelID = ""; fillLevel(null); setLevelError(""); el("progression-level-title")?.focus(); } }); });
  el("progression-achievement-new")?.addEventListener("click", function (event) { allowAchievementChange(event.currentTarget).then(function (allowed) { if (allowed) { selectedAchievementID = ""; fillAchievement(null); el("progression-achievement-name")?.focus(); } }); });
  ["progression-achievement-metric", "progression-achievement-subject", "progression-achievement-target"].forEach(function (id) { el(id)?.addEventListener("input", function () { syncSubjectField(); el("progression-achievement-condition").textContent = achievementCondition(null); }); });
  el("progression-achievement-search")?.addEventListener("input", render);
  el("progression-achievement-filter")?.addEventListener("change", render);
  el("progression-level-form")?.addEventListener("submit", async function (event) {
    event.preventDefault();
    const payload = levelPayload(); const id = payload.id;
    try { await request(id ? "/api/progression/levels/update" : "/api/progression/levels/create", payload); setLevelError(""); await load(); setStatus(t("progression.saved")); } catch (error) { setLevelError(error.message); el("progression-level-xp")?.focus(); setStatus(error.message); }
  });
  el("progression-achievement-form")?.addEventListener("submit", async function (event) {
    event.preventDefault(); const payload = achievementPayload(); const existing = selectedAchievement();
    if (existing && (existing.revision?.metric !== payload.metric || existing.revision?.subject_id !== payload.subject_id || existing.revision?.target !== payload.target || Boolean(existing.revision?.repeatable) !== payload.repeatable) && !await confirmDiscardChanges({ message: t("progression.revisionConfirm"), opener: event.submitter })) return;
    try { await request(payload.id ? "/api/progression/achievements/update" : "/api/progression/achievements/create", payload); await load(); setStatus(t("progression.saved")); } catch (error) { setStatus(error.message); }
  });
  el("progression-level-test")?.addEventListener("click", async function () { try { const result = await request("/api/progression/preview", previewPayload({ kind: "level", title: value("progression-level-title") })); setStatus(t("progression.preview") + ": " + String(result.delivered_clients || 0)); } catch (error) { setStatus(error.message); } });
  el("progression-level-delete")?.addEventListener("click", async function (event) { const item = selectedLevel(); if (!item || !await confirmDiscardChanges({ message: t("progression.deleteConfirm"), opener: event.currentTarget })) return; try { await request("/api/progression/levels/delete", { id: item.id }); selectedLevelID = ""; await load(); } catch (error) { setStatus(error.message); } });
  el("progression-achievement-delete")?.addEventListener("click", async function (event) { const item = selectedAchievement(); if (!item || !await confirmDiscardChanges({ message: t("progression.deleteConfirm"), opener: event.currentTarget })) return; try { await request("/api/progression/achievements/delete", { id: item.id }); selectedAchievementID = ""; await load(); } catch (error) { setStatus(error.message); } });
  el("progression-achievement-test")?.addEventListener("click", async function () { try { const payload = achievementPayload(); const result = await request("/api/progression/preview", previewPayload({ kind: "achievement", name: payload.name, description: payload.description })); setStatus(t("progression.preview") + ": " + String(result.delivered_clients || 0)); } catch (error) { setStatus(error.message); } });
  el("progression-settings-form")?.addEventListener("submit", async function (event) { event.preventDefault(); try { settings = await request("/api/progression/settings/update", { achievement_enabled: checked("progression-achievement-alert-enabled"), level_enabled: checked("progression-level-alert-enabled"), layout: value("progression-alert-layout"), sound: value("progression-alert-sound"), sound_volume: number("progression-alert-volume", 70), duration_ms: number("progression-alert-duration", 5000) }); setStatus(t("progression.saved")); } catch (error) { setStatus(error.message); } });
  el("progression-reconcile")?.addEventListener("click", async function () { try { const status = await request("/api/progression/reconcile", {}); setStatus(t("progression.status") + ": " + (status.state || "")); } catch (error) { setStatus(error.message); } });
  el("progression-retry")?.addEventListener("click", function () { ensureProgressionLoaded().catch(function () {}); });
}

function previewPayload(payload) {
  return { ...payload, layout: value("progression-alert-layout"), sound: value("progression-alert-sound"), sound_volume: number("progression-alert-volume", 70), duration_ms: number("progression-alert-duration", 5000) };
}
