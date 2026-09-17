/** Pure state helpers for the Live recap dialog. */

export const RECAP_HISTORY_LIMIT = 20;
export const RECAP_WINDOW_SESSION = "session";
export const RECAP_WINDOW_ALL = "all";

/** @param {string | null | undefined} cursor */
export function buildRecapHistoryURL(cursor) {
  const query = new URLSearchParams({ limit: String(RECAP_HISTORY_LIMIT) });
  if (typeof cursor === "string" && cursor !== "") {
    query.set("cursor", cursor);
  }
  return "/api/sessions?" + query.toString();
}

/** @param {string} id */
export function buildRecapSessionURL(id) {
  return "/api/sessions/get?id=" + encodeURIComponent(id);
}

/** @param {string} sessionID */
export function buildRecapShowBody(sessionID) {
  return { session_id: String(sessionID || "") };
}

export function buildRecapHideBody() {
  return {};
}

export function buildRecapShowAllBody() {
  return {};
}

/**
 * Session visibility frames apply only to the displayed current session.
 * @param {unknown} frame
 * @param {string} sessionID
 */
export function isCurrentRecapStateFrame(frame, sessionID) {
  return Boolean(
    frame && typeof frame === "object" && frame.type === "stream_recap_state" &&
    frame.snapshot && typeof frame.snapshot === "object" &&
    frame.snapshot.session_id === sessionID &&
    (frame.window === RECAP_WINDOW_SESSION || frame.window == null)
  );
}

/** @param {unknown} frame */
export function isAllTimeRecapStateFrame(frame) {
  return Boolean(
    frame && typeof frame === "object" && frame.type === "stream_recap_state" &&
    frame.visible === true && frame.window === RECAP_WINDOW_ALL
  );
}

/**
 * Whether a recap state frame should update the open dialog for this session.
 * @param {unknown} frame
 * @param {string} sessionID
 */
export function recapStateFrameApplies(frame, sessionID) {
  if (!frame || typeof frame !== "object" || frame.type !== "stream_recap_state") {
    return false;
  }
  if (frame.visible === false) {
    return true;
  }
  if (frame.window === RECAP_WINDOW_ALL) {
    return true;
  }
  return isCurrentRecapStateFrame(frame, sessionID);
}

/** @param {unknown} value */
export function recapAllTimePresentation(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  return {
    totals: recapTotals(value),
    ranking: Array.isArray(value.ranking) ? value.ranking.slice(0, 5) : [],
    achievement_groups: [],
  };
}

/**
 * @param {{ dialogWindow: string, snapshot: unknown, allTime: unknown }} input
 */
export function canDownloadRecapImage(input) {
  const window = input && input.dialogWindow === RECAP_WINDOW_ALL ? RECAP_WINDOW_ALL : RECAP_WINDOW_SESSION;
  if (window === RECAP_WINDOW_ALL) {
    return Boolean(recapAllTimePresentation(input && input.allTime));
  }
  return Boolean(input && input.snapshot);
}

/** @param {string} dialogWindow */
export function recapDownloadFilename(dialogWindow) {
  return dialogWindow === RECAP_WINDOW_ALL ? "comm-relay-recap-all.png" : "comm-relay-recap-session.png";
}

/**
 * @param {{ snapshot?: unknown, all_time?: unknown }} current
 * @param {string} dialogWindow
 */
export function recapDownloadPresentation(current, dialogWindow) {
  const window = dialogWindow === RECAP_WINDOW_ALL ? RECAP_WINDOW_ALL : RECAP_WINDOW_SESSION;
  if (window === RECAP_WINDOW_ALL) {
    return { window: RECAP_WINDOW_ALL, snapshot: recapAllTimePresentation(current && current.all_time) };
  }
  const snapshot = current && current.snapshot;
  if (!snapshot || typeof snapshot !== "object") {
    return { window: RECAP_WINDOW_SESSION, snapshot: null };
  }
  return { window: RECAP_WINDOW_SESSION, snapshot: snapshot };
}

/**
 * Hide and New stream use a null snapshot. The envelope has no session id, so
 * callers must clear visibility immediately and reconcile Current over HTTP.
 * @param {unknown} frame
 */
export function isHiddenRecapStateFrame(frame) {
  return Boolean(
    frame && typeof frame === "object" && frame.type === "stream_recap_state" &&
    frame.visible === false && frame.snapshot == null
  );
}

/** @param {unknown} value */
export function recapTotals(value) {
  const totals = value && typeof value === "object" && value.totals && typeof value.totals === "object"
    ? value.totals : {};
  return {
    viewer_count: typeof totals.viewer_count === "number" ? totals.viewer_count : 0,
    message_count: typeof totals.message_count === "number" ? totals.message_count : 0,
    xp: typeof totals.xp === "number" ? totals.xp : 0,
  };
}

/** @param {unknown} detail */
export function recapDisplayData(detail) {
  const source = detail && typeof detail === "object" ? detail : {};
  return {
    id: typeof source.id === "string" ? source.id : "",
    started_at: typeof source.started_at === "string" ? source.started_at : "",
    is_current: source.is_current === true,
    has_recap: source.has_recap === true,
    totals: recapTotals(source),
    ranking: Array.isArray(source.ranking) ? source.ranking : [],
    achievement_groups: Array.isArray(source.achievement_groups) ? source.achievement_groups : [],
    snapshot: source.snapshot && typeof source.snapshot === "object" ? source.snapshot : null,
  };
}
