const SIZING_MODES = new Set(["auto", "fixed"]);
const TITLE_MODES = new Set(["theme", "custom", "hidden"]);

function cloneSurfaces(surfaces) {
  const current = surfaces && typeof surfaces === "object" ? surfaces : {};
  const next = {};
  Object.keys(current).forEach(function (key) {
    const value = current[key];
    next[key] = value && typeof value === "object" ? Object.assign({}, value) : value;
  });
  return next;
}

export function normalizeLeaderboardSurfaceOverride(value) {
  const raw = value && typeof value === "object" ? value : {};
  const next = {};
  if (raw.sizing_mode === "auto" || raw.sizing_mode === "fixed") {
    next.sizing_mode = raw.sizing_mode;
  }
  if (typeof raw.font_size_px === "number" && raw.font_size_px >= 12 && raw.font_size_px <= 48) {
    next.font_size_px = raw.font_size_px;
  }
  if (raw.layout === "chips") {
    next.layout = "chips";
  }
  if (raw.title_mode === "theme" || raw.title_mode === "custom" || raw.title_mode === "hidden") {
    next.title_mode = raw.title_mode;
  }
  if (typeof raw.title === "string" && raw.title.trim() !== "") {
    next.title = raw.title.trim();
  }
  if (raw.show_message_count === true) {
    next.show_message_count = true;
  }
  if (typeof raw.max_entries === "number" && raw.max_entries >= 1 && raw.max_entries <= 20 && raw.max_entries !== 5) {
    next.max_entries = raw.max_entries;
  }
  return next;
}

export function resolveLeaderboardFormValues(value, inheritedFontSizePx) {
  const raw = value && typeof value === "object" ? value : {};
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const sizingMode = SIZING_MODES.has(raw.sizing_mode)
    ? raw.sizing_mode
    : typeof raw.font_size_px === "number" ? "fixed" : "auto";
  const titleMode = TITLE_MODES.has(raw.title_mode)
    ? raw.title_mode
    : title ? "custom" : "theme";
  return {
    sizing_mode: sizingMode,
    font_size_px:
      typeof raw.font_size_px === "number" && raw.font_size_px >= 12 && raw.font_size_px <= 48
        ? raw.font_size_px
        : inheritedFontSizePx,
    layout: raw.layout === "chips" ? "chips" : "panel",
    title_mode: titleMode,
    title: title,
    show_message_count: raw.show_message_count === true,
    max_entries:
      typeof raw.max_entries === "number" && raw.max_entries >= 1 && raw.max_entries <= 20
        ? raw.max_entries
        : 5,
  };
}

export function withLeaderboardPresentation(surfaces, values, touched) {
  const next = cloneSurfaces(surfaces);
  const leaderboard = next.leaderboard && typeof next.leaderboard === "object"
    ? Object.assign({}, next.leaderboard)
    : {};
  const state = touched && typeof touched === "object" ? touched : {};
  const form = values && typeof values === "object" ? values : {};

  if (state.sizing) {
    if (form.sizing_mode === "fixed") {
      leaderboard.sizing_mode = "fixed";
      if (Number.isFinite(form.font_size_px)) {
        leaderboard.font_size_px = form.font_size_px;
      }
    } else {
      delete leaderboard.sizing_mode;
      delete leaderboard.font_size_px;
    }
  } else if (state.font && form.sizing_mode === "fixed" && Number.isFinite(form.font_size_px)) {
    leaderboard.font_size_px = form.font_size_px;
  }

  if (form.layout === "chips") {
    leaderboard.layout = "chips";
  } else {
    delete leaderboard.layout;
  }

  if (state.title) {
    if (form.title_mode === "hidden") {
      leaderboard.title_mode = "hidden";
      delete leaderboard.title;
    } else if (form.title_mode === "custom") {
      leaderboard.title_mode = "custom";
      leaderboard.title = String(form.title || "").trim();
    } else {
      delete leaderboard.title_mode;
      delete leaderboard.title;
    }
  } else if (state.titleText && form.title_mode === "custom") {
    leaderboard.title = String(form.title || "").trim();
  }

  if (state.messages) {
    if (form.show_message_count === true) {
      leaderboard.show_message_count = true;
    } else {
      delete leaderboard.show_message_count;
    }
  }

  if (state.maxEntries) {
    if (Number.isFinite(form.max_entries) && form.max_entries !== 5) {
      leaderboard.max_entries = form.max_entries;
    } else {
      delete leaderboard.max_entries;
    }
  }

  next.leaderboard = leaderboard;
  return next;
}

export function conditionalFieldNeedsOwnerFocus(activeElement, field) {
  return Boolean(activeElement && field && field.contains(activeElement));
}

export function leaderboardPreviewQuery(values) {
  const form = values && typeof values === "object" ? values : {};
  const fixed = form.sizing_mode === "fixed";
  return {
    sizing_mode: fixed ? "fixed" : "auto",
    font_size_px: fixed ? String(form.font_size_px) : undefined,
    base_font_size_px: fixed ? undefined : String(form.font_size_px),
    title_mode: TITLE_MODES.has(form.title_mode) ? form.title_mode : "theme",
    title: form.title_mode === "custom" ? String(form.title || "").trim() : undefined,
    show_message_count: form.show_message_count === true ? "1" : "0",
    limit: String(form.max_entries),
  };
}
