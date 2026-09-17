import { t } from "./i18n-ui.js";
import {
  recapAllTimePresentation,
  recapDisplayData,
  recapTotals,
  RECAP_WINDOW_ALL,
} from "./live-recap-helpers.js";

export function formatRecapTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return t("recap.unknownTime");
  return new Intl.DateTimeFormat(document.documentElement.lang === "en" ? "en-GB" : "ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
  }).format(date);
}

function appendText(parent, tag, text, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

export function appendRecapTotals(parent, totals) {
  const list = document.createElement("dl");
  list.className = "live-recap-totals";
  [["recap.totalViewers", totals.viewer_count], ["recap.totalMessages", totals.message_count], ["recap.totalXP", totals.xp]].forEach(function ([key, value]) {
    const item = document.createElement("div");
    item.className = "live-recap-totals__item";
    appendText(item, "dt", t(key));
    appendText(item, "dd", String(value));
    list.append(item);
  });
  parent.append(list);
}

function appendPortrait(parent, url, name) {
  const holder = document.createElement("span");
  holder.className = "live-recap-portrait";
  const fallback = function () {
    holder.textContent = String(name || "?").trim().slice(0, 1).toUpperCase() || "?";
  };
  if (typeof url === "string" && url) {
    const image = document.createElement("img");
    image.src = url;
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", function () {
      image.remove();
      fallback();
    }, { once: true });
    holder.append(image);
  } else {
    fallback();
  }
  parent.append(holder);
}

export function appendRecapRanking(parent, entries) {
  if (!entries.length) return;
  const section = document.createElement("section");
  appendText(section, "h3", t("recap.topViewers"));
  const list = document.createElement("ol");
  list.className = "live-recap-ranking";
  entries.forEach(function (entry) {
    const item = document.createElement("li");
    appendPortrait(item, entry.portrait_url, entry.display_name);
    const copy = document.createElement("span");
    copy.className = "live-recap-ranking__copy";
    appendText(copy, "strong", entry.display_name || t("viewers.unnamed"));
    if (entry.title) appendText(copy, "small", entry.title);
    item.append(copy);
    appendText(item, "span", t("recap.rankingMeta", { xp: String(entry.xp || 0), messages: String(entry.message_count || 0) }), "live-recap-ranking__meta");
    list.append(item);
  });
  section.append(list);
  parent.append(section);
}

export function appendRecapAchievements(parent, groups) {
  if (!groups.length) return;
  const section = document.createElement("section");
  appendText(section, "h3", t("recap.achievements"));
  const list = document.createElement("ul");
  list.className = "live-recap-achievements";
  groups.forEach(function (group) {
    const item = document.createElement("li");
    appendPortrait(item, group.viewer_portrait_url, group.viewer_display_name);
    const copy = document.createElement("span");
    appendText(copy, "strong", group.viewer_display_name || t("viewers.unnamed"));
    appendText(copy, "span", group.name || "");
    if (group.description) appendText(copy, "small", group.description);
    item.append(copy);
    list.append(item);
  });
  section.append(list);
  parent.append(section);
}

/**
 * @param {unknown} summary
 * @param {(sessionId: string, origin: HTMLButtonElement) => void} onSelect
 * @returns {HTMLButtonElement}
 */
export function createRecapHistoryRow(summary, onSelect) {
  const data = recapDisplayData(summary);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "live-recap-history-row";
  button.dataset.sessionId = data.id;
  appendText(button, "strong", formatRecapTime(data.started_at));
  const markers = [data.is_current ? t("recap.currentMarker") : t("recap.completedMarker")];
  if (data.has_recap) markers.push(t("recap.capturedMarker"));
  appendText(button, "span", markers.join(" · "), "field-hint");
  const totals = recapTotals(data);
  appendText(button, "span", t("recap.historyTotals", {
    viewers: String(totals.viewer_count),
    messages: String(totals.message_count),
    xp: String(totals.xp),
  }));
  button.addEventListener("click", function () {
    onSelect(data.id, button);
  });
  return button;
}

/**
 * @param {HTMLElement} parent
 * @param {unknown} detail
 * @param {{ historical?: boolean, previewWindow?: string, current?: { all_time?: unknown } | null }} [options]
 */
export function renderRecapSessionDetail(parent, detail, options) {
  const opts = options || {};
  const historical = Boolean(opts.historical);
  const previewWindow = opts.previewWindow;
  const current = opts.current;
  const data = recapDisplayData(detail);
  const allTimePreview = previewWindow === RECAP_WINDOW_ALL;
  const heading = appendText(
    parent,
    "h3",
    allTimePreview ? t("recap.allTimeSummary") : (historical ? t("recap.sessionDetail") : t("recap.currentSummary"))
  );
  heading.tabIndex = -1;
  if (!allTimePreview) {
    appendText(parent, "p", t("recap.startedAt", { time: formatRecapTime(data.started_at) }), "field-hint");
    if (data.snapshot && data.snapshot.captured_at) {
      appendText(parent, "p", t("recap.capturedAt", { time: formatRecapTime(data.snapshot.captured_at) }), "field-hint");
    }
  } else if (current && current.all_time && current.all_time.generated_at) {
    appendText(parent, "p", t("recap.allTimeGeneratedAt", { time: formatRecapTime(current.all_time.generated_at) }), "field-hint");
  }
  const presentation = allTimePreview ? recapAllTimePresentation(current && current.all_time) : null;
  if (allTimePreview && !presentation) {
    appendText(parent, "p", t("recap.emptyAllTime"), "empty-state");
    return;
  }
  const totalsSource = allTimePreview && presentation ? presentation : (data.snapshot || data);
  appendRecapTotals(parent, recapTotals(totalsSource));
  const source = allTimePreview && presentation ? presentation : (data.snapshot || data);
  appendRanking(parent, Array.isArray(source.ranking) ? source.ranking : []);
  if (!allTimePreview) {
    appendRecapAchievements(parent, Array.isArray(source.achievement_groups) ? source.achievement_groups : []);
  }
  const achievements = allTimePreview ? [] : (Array.isArray(source.achievement_groups) ? source.achievement_groups : []);
  const ranking = Array.isArray(source.ranking) ? source.ranking : [];
  if (!ranking.length && !achievements.length) {
    appendText(parent, "p", allTimePreview ? t("recap.emptyAllTime") : t("recap.emptySession"), "empty-state");
  }
}

function appendRanking(parent, entries) {
  appendRecapRanking(parent, entries);
}
