/** Pure state helpers for the Live recap dialog. */

export const RECAP_HISTORY_LIMIT = 20;

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

/**
 * A visibility frame has authority only for the session already displayed by
 * Current stream. It must not replace a newer session after New stream.
 * @param {unknown} frame
 * @param {string} sessionID
 */
export function isCurrentRecapStateFrame(frame, sessionID) {
  return Boolean(
    frame && typeof frame === "object" && frame.type === "stream_recap_state" &&
    frame.snapshot && typeof frame.snapshot === "object" &&
    frame.snapshot.session_id === sessionID
  );
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
