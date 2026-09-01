/**
 * Pure helpers for Studio draft comparison and OBS source URLs.
 */

import {
  ADD_TO_OBS_DISMISSED_KEY,
  STUDIO_MODE_KEY,
  STUDIO_SETUP_STATE_KEY,
  STUDIO_SURFACE_RAIL_COLLAPSED_KEY,
} from "./constants.js";
import { buildLeaderboardURL } from "./leaderboard-url.js";

const ADD_TO_OBS_DISMISSED_TRUTHY = new Set(["1", "true", "yes"]);
const STUDIO_SETUP_STATES = new Set(["unseen", "seen", "skipped", "completed"]);

const STUDIO_SURFACES = new Set(["chat", "leaderboard", "alerts"]);
const LEADERBOARD_LAYOUTS = new Set(["panel", "chips"]);
const OVERLAY_DISPLAY_MODES = new Set(["normal", "compact"]);

/** @type {readonly number[]} */
export const MESSAGE_TTL_CHIP_VALUES = [8, 20, 0];

/**
 * Map a stored TTL to a chip value when it matches 8, 20, or 0.
 *
 * @param {unknown} ttlSeconds
 * @returns {8 | 20 | 0 | null}
 */
export function messageTtlToChipValue(ttlSeconds) {
  const parsed = Number.parseInt(String(ttlSeconds), 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return MESSAGE_TTL_CHIP_VALUES.includes(parsed) ? /** @type {8 | 20 | 0} */ (parsed) : null;
}

/**
 * @param {unknown} chipValue
 * @returns {boolean}
 */
export function isMessageTtlChipValue(chipValue) {
  return messageTtlToChipValue(chipValue) !== null;
}

/**
 * Coerce a chip selection to a persisted TTL, or null when invalid.
 *
 * @param {unknown} chipValue
 * @returns {8 | 20 | 0 | null}
 */
export function chipValueToMessageTtl(chipValue) {
  return messageTtlToChipValue(chipValue);
}

/**
 * @param {unknown} value
 * @returns {"panel"|"chips"}
 */
function normalizeLayout(value) {
  const raw = String(value || "").trim().toLowerCase();
  return LEADERBOARD_LAYOUTS.has(raw) ? /** @type {"panel"|"chips"} */ (raw) : "panel";
}

/**
 * @param {unknown} preset
 * @returns {Record<string, unknown>}
 */
function normalizePreset(preset) {
  const raw = preset && typeof preset === "object" ? /** @type {Record<string, unknown>} */ (preset) : {};
  const surfaces =
    raw.surfaces && typeof raw.surfaces === "object"
      ? /** @type {Record<string, unknown>} */ (raw.surfaces)
      : {};
  const leaderboard =
    surfaces.leaderboard && typeof surfaces.leaderboard === "object"
      ? /** @type {Record<string, unknown>} */ (surfaces.leaderboard)
      : {};
  const fontSizePx = typeof raw.font_size_px === "number" ? raw.font_size_px : 18;
  const leaderboardFont =
    typeof leaderboard.font_size_px === "number" ? leaderboard.font_size_px : fontSizePx;
  const style = raw.style && typeof raw.style === "object" ? raw.style : {};
  return {
    id: typeof raw.id === "string" ? raw.id : "",
    name: typeof raw.name === "string" ? raw.name : "",
    max_messages: typeof raw.max_messages === "number" ? raw.max_messages : 30,
    message_ttl_seconds: typeof raw.message_ttl_seconds === "number" ? raw.message_ttl_seconds : 20,
    font_size_px: fontSizePx,
    display_mode: raw.display_mode === "compact" ? "compact" : "normal",
    theme: typeof raw.theme === "string" ? raw.theme : "default",
    style: style,
    surfaces: {
      leaderboard: {
        font_size_px: leaderboardFont,
        layout: normalizeLayout(leaderboard.layout),
      },
    },
  };
}

/**
 * Normalize overlay appearance fields used by Studio draft/publish.
 *
 * @param {unknown} overlay
 * @returns {Record<string, unknown>}
 */
export function normalizeOverlayAppearanceDraft(overlay) {
  const raw = overlay && typeof overlay === "object" ? /** @type {Record<string, unknown>} */ (overlay) : {};
  const presets = Array.isArray(raw.presets) ? raw.presets.map(normalizePreset) : [];
  presets.sort(function (left, right) {
    return String(left.id).localeCompare(String(right.id));
  });
  const displayMode = raw.display_mode === "compact" ? "compact" : "normal";
  return {
    max_messages: typeof raw.max_messages === "number" ? raw.max_messages : 30,
    message_ttl_seconds: typeof raw.message_ttl_seconds === "number" ? raw.message_ttl_seconds : 20,
    font_size_px: typeof raw.font_size_px === "number" ? raw.font_size_px : 18,
    display_mode: OVERLAY_DISPLAY_MODES.has(displayMode) ? displayMode : "normal",
    theme: typeof raw.theme === "string" ? raw.theme : "default",
    active_preset_id: typeof raw.active_preset_id === "string" ? raw.active_preset_id : "",
    presets: presets,
  };
}

/**
 * Appearance fields compared for Studio dirty state (excludes edited-look id).
 *
 * @param {unknown} overlay
 * @returns {Record<string, unknown>}
 */
function overlayAppearanceContentForDirtyCompare(overlay) {
  const normalized = normalizeOverlayAppearanceDraft(overlay);
  return {
    max_messages: normalized.max_messages,
    message_ttl_seconds: normalized.message_ttl_seconds,
    font_size_px: normalized.font_size_px,
    display_mode: normalized.display_mode,
    theme: normalized.theme,
    presets: normalized.presets,
  };
}

/**
 * @param {unknown} baseline
 * @param {unknown} draft
 * @returns {boolean}
 */
export function overlayDraftIsDirty(baseline, draft) {
  return (
    JSON.stringify(overlayAppearanceContentForDirtyCompare(baseline)) !==
    JSON.stringify(overlayAppearanceContentForDirtyCompare(draft))
  );
}

/**
 * @param {unknown} overlay
 * @returns {Record<string, unknown>}
 */
export function cloneOverlayAppearanceDraft(overlay) {
  return JSON.parse(JSON.stringify(normalizeOverlayAppearanceDraft(overlay)));
}

/**
 * @param {unknown} editedPresetId
 * @param {unknown} onAirPresetId
 * @returns {boolean}
 */
export function shouldShowUseOnStream(editedPresetId, onAirPresetId) {
  const edited = typeof editedPresetId === "string" ? editedPresetId.trim() : "";
  const onAir = typeof onAirPresetId === "string" ? onAirPresetId.trim() : "";
  if (!edited || !onAir) {
    return false;
  }
  return edited !== onAir;
}

/**
 * @param {boolean} visible
 * @param {boolean} dirty
 * @param {boolean} inFlight
 * @returns {boolean}
 */
export function shouldDisableUseOnStream(visible, dirty, inFlight) {
  return !visible || dirty || inFlight;
}

/**
 * @param {number} presetCount
 * @returns {boolean}
 */
export function shouldShowPresetCrudInPrimary(presetCount) {
  return Number.isFinite(presetCount) && presetCount > 1;
}

/**
 * @param {{ origin: string, pathname: string, presetId?: string, followActive?: boolean }} options
 * @returns {string}
 */
export function overlaySourceURL(options) {
  const origin = options.origin;
  const pathname = options.pathname;
  const url = new URL(pathname, origin);
  if (!options.followActive && options.presetId) {
    url.searchParams.set("preset", String(options.presetId));
  }
  return url.href;
}

/**
 * @param {string} origin
 * @returns {string}
 */
export function buildDockMessagesURL(origin) {
  return new URL("/dock/messages", origin).href;
}

/**
 * @param {string} origin
 * @param {string} pathname
 * @returns {boolean}
 */
export function sourceUrlOmitsPreset(origin, pathname) {
  const url = new URL(pathname, origin);
  return !url.searchParams.has("preset");
}

/**
 * @param {string} href
 * @param {string} presetId
 * @returns {boolean}
 */
export function sourceUrlPinsPreset(href, presetId) {
  const url = new URL(href);
  return url.searchParams.get("preset") === presetId;
}

/**
 * @param {unknown} surface
 * @returns {"chat"|"leaderboard"|"alerts"}
 */
export function normalizeStudioSurface(surface) {
  const raw = String(surface || "").trim().toLowerCase();
  return STUDIO_SURFACES.has(raw) ? /** @type {"chat"|"leaderboard"|"alerts"} */ (raw) : "chat";
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function parseAddToObsDismissedValue(value) {
  if (value === null || value === undefined) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "") {
    return false;
  }
  return ADD_TO_OBS_DISMISSED_TRUTHY.has(normalized);
}

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 * @returns {boolean}
 */
export function readAddToObsDismissedPreference(storage) {
  if (!storage || typeof storage.getItem !== "function") {
    return false;
  }
  try {
    return parseAddToObsDismissedValue(storage.getItem(ADD_TO_OBS_DISMISSED_KEY));
  } catch {
    return false;
  }
}

/**
 * @param {Pick<Storage, "setItem"|"removeItem"> | null | undefined} storage
 * @param {boolean} dismissed
 */
export function writeAddToObsDismissedPreference(storage, dismissed) {
  if (!storage) {
    return;
  }
  try {
    if (dismissed) {
      storage.setItem(ADD_TO_OBS_DISMISSED_KEY, "1");
      return;
    }
    if (typeof storage.removeItem === "function") {
      storage.removeItem(ADD_TO_OBS_DISMISSED_KEY);
    }
  } catch {
    /* localStorage can be unavailable in locked-down browser contexts. */
  }
}

/**
 * @param {unknown} value
 * @returns {"unseen"|"seen"|"skipped"|"completed"}
 */
export function normalizeStudioSetupState(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return STUDIO_SETUP_STATES.has(normalized)
    ? /** @type {"unseen"|"seen"|"skipped"|"completed"} */ (normalized)
    : "unseen";
}

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 * @returns {"unseen"|"seen"|"skipped"|"completed"}
 */
export function readStudioSetupState(storage) {
  if (!storage || typeof storage.getItem !== "function") {
    return "unseen";
  }
  try {
    const stored = storage.getItem(STUDIO_SETUP_STATE_KEY);
    if (stored !== null) {
      return normalizeStudioSetupState(stored);
    }
    return parseAddToObsDismissedValue(storage.getItem(ADD_TO_OBS_DISMISSED_KEY))
      ? "completed"
      : "unseen";
  } catch {
    return "unseen";
  }
}

/**
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 * @param {unknown} state
 */
export function writeStudioSetupState(storage, state) {
  if (!storage || typeof storage.setItem !== "function") {
    return;
  }
  try {
    storage.setItem(STUDIO_SETUP_STATE_KEY, normalizeStudioSetupState(state));
  } catch {
    /* localStorage can be unavailable in locked-down browser contexts. */
  }
}

/**
 * @param {unknown} value
 * @returns {"essentials"|"all"}
 */
export function normalizeStudioMode(value) {
  return String(value || "").trim().toLowerCase() === "all" ? "all" : "essentials";
}

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 * @returns {"essentials"|"all"}
 */
export function readStudioModePreference(storage) {
  if (!storage || typeof storage.getItem !== "function") {
    return "essentials";
  }
  try {
    return normalizeStudioMode(storage.getItem(STUDIO_MODE_KEY));
  } catch {
    return "essentials";
  }
}

/**
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 * @param {unknown} mode
 */
export function writeStudioModePreference(storage, mode) {
  if (!storage || typeof storage.setItem !== "function") {
    return;
  }
  try {
    storage.setItem(STUDIO_MODE_KEY, normalizeStudioMode(mode));
  } catch {
    /* localStorage can be unavailable in locked-down browser contexts. */
  }
}

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 * @returns {boolean}
 */
export function readStudioSurfaceRailCollapsedPreference(storage) {
  if (!storage || typeof storage.getItem !== "function") {
    return false;
  }
  try {
    return storage.getItem(STUDIO_SURFACE_RAIL_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 * @param {boolean} collapsed
 */
export function writeStudioSurfaceRailCollapsedPreference(storage, collapsed) {
  if (!storage || typeof storage.setItem !== "function") {
    return;
  }
  try {
    storage.setItem(STUDIO_SURFACE_RAIL_COLLAPSED_KEY, collapsed ? "true" : "false");
  } catch {
    /* localStorage can be unavailable in locked-down browser contexts. */
  }
}

/**
 * Follow-active OBS URL for a Studio on-stream surface (no preset query).
 *
 * @param {unknown} surface
 * @param {{ origin?: string, period?: string }} [options]
 * @returns {string}
 */
export function buildFollowActiveURLForSurface(surface, options) {
  const normalized = normalizeStudioSurface(surface);
  const opts = options || {};
  const origin =
    opts.origin ||
    (typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin
      : "http://127.0.0.1");
  if (normalized === "leaderboard") {
    return buildLeaderboardURL({
      origin: origin,
      period: opts.period || "session",
      followActive: true,
    });
  }
  if (normalized === "alerts") {
    return overlaySourceURL({
      origin: origin,
      pathname: "/overlay/alert",
      followActive: true,
    });
  }
  return overlaySourceURL({
    origin: origin,
    pathname: "/overlay",
    followActive: true,
  });
}
