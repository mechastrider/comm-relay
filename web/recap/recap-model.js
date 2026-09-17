export const SAMPLE_RECAP = Object.freeze({
  version: 1,
  id: "sample-recap",
  session_id: "sample-session",
  started_at: "2026-01-01T19:00:00Z",
  captured_at: "2026-01-01T22:14:00Z",
  totals: { viewer_count: 48, message_count: 1267, xp: 934 },
  ranking: [
    { rank: 1, display_name: "Капитан Марина", xp: 248, message_count: 180, title: "Vanguard" },
    { rank: 2, display_name: "Long-range Scout", xp: 201, message_count: 154, title: "Veteran" },
    { rank: 3, display_name: "Сигнал", xp: 173, message_count: 132 },
    { rank: 4, display_name: "Nomad", xp: 159, message_count: 116 },
    { rank: 5, display_name: "MERC-7", xp: 121, message_count: 92 },
  ],
  achievement_groups: [
    { viewer_display_name: "Капитан Марина", achievement_id: "scout", revision: 1, name: "Наблюдатель", description: "Помогает отряду держать курс.", count: 2, unlocked_at: "2026-01-01T22:10:00Z" },
    { viewer_display_name: "Long-range Scout", achievement_id: "regular", revision: 1, name: "Steady hand", description: "Stayed with the crew until the final jump.", count: 1, unlocked_at: "2026-01-01T22:11:00Z" },
  ],
});

function text(value, fallback) {
  const valueText = typeof value === "string" ? value.trim() : "";
  return valueText || fallback;
}

function nonNegative(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function positive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function safePortrait(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return "";
  }
  try {
    const parsed = new URL(value, window.location.href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.href;
  } catch {
    return "";
  }
}

// The backend validates this payload. The browser still narrows untrusted wire
// data before it reaches the DOM so malformed frames cannot destabilize OBS.
export const RECAP_WINDOW_SESSION = "session";
export const RECAP_WINDOW_ALL = "all";

export function normalizeRecapSnapshot(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const totals = value.totals && typeof value.totals === "object" ? value.totals : {};
  const ranking = Array.isArray(value.ranking) ? value.ranking.slice(0, 5) : [];
  const groups = Array.isArray(value.achievement_groups) ? value.achievement_groups.slice(0, 6) : [];
  return {
    id: text(value.id, ""),
    session_id: text(value.session_id, ""),
    captured_at: text(value.captured_at, ""),
    totals: {
      viewer_count: nonNegative(totals.viewer_count),
      message_count: nonNegative(totals.message_count),
      xp: nonNegative(totals.xp),
    },
    ranking: ranking.map(function (entry, index) {
      const row = entry && typeof entry === "object" ? entry : {};
      return {
        rank: nonNegative(row.rank) || index + 1,
        display_name: text(row.display_name, ""),
        portrait_url: safePortrait(row.portrait_url),
        xp: nonNegative(row.xp),
        message_count: nonNegative(row.message_count),
        title: text(row.title, ""),
      };
    }),
    achievement_groups: groups.map(function (entry) {
      const group = entry && typeof entry === "object" ? entry : {};
      return {
        viewer_display_name: text(group.viewer_display_name, ""),
        viewer_portrait_url: safePortrait(group.viewer_portrait_url),
        name: text(group.name, ""),
        description: text(group.description, ""),
        count: positive(group.count),
        unlocked_at: text(group.unlocked_at, ""),
      };
    }),
  };
}

/** All-time presentation matches recap totals/ranking without achievements. */
export function normalizeAllTimePresentation(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const totals = value.totals && typeof value.totals === "object" ? value.totals : {};
  const ranking = Array.isArray(value.ranking) ? value.ranking.slice(0, 5) : [];
  return {
    id: "",
    session_id: "",
    captured_at: text(value.generated_at, ""),
    totals: {
      viewer_count: nonNegative(totals.viewer_count),
      message_count: nonNegative(totals.message_count),
      xp: nonNegative(totals.xp),
    },
    ranking: ranking.map(function (entry, index) {
      const row = entry && typeof entry === "object" ? entry : {};
      return {
        rank: nonNegative(row.rank) || index + 1,
        display_name: text(row.display_name, ""),
        portrait_url: safePortrait(row.portrait_url),
        xp: nonNegative(row.xp),
        message_count: nonNegative(row.message_count),
        title: text(row.title, ""),
      };
    }),
    achievement_groups: [],
  };
}

/**
 * @returns {undefined} ignore frame
 * @returns {null} hidden — clear overlay
 * @returns {{ window: string, snapshot: object }} visible presentation
 */
export function visibleRecapFromFrame(frame) {
  if (!frame || frame.type !== "stream_recap_state") {
    return undefined;
  }
  if (frame.visible !== true) {
    return null;
  }
  if (frame.window === RECAP_WINDOW_ALL) {
    const snapshot = normalizeAllTimePresentation(frame.all_time);
    return snapshot ? { window: RECAP_WINDOW_ALL, snapshot: snapshot } : null;
  }
  if (frame.window === RECAP_WINDOW_SESSION || frame.window == null) {
    if (!frame.snapshot) {
      return null;
    }
    const snapshot = normalizeRecapSnapshot(frame.snapshot);
    return snapshot ? { window: RECAP_WINDOW_SESSION, snapshot: snapshot } : null;
  }
  return undefined;
}

// The renderer uses this explicit composition contract so a single populated
// section gets the full available width instead of an empty sibling track.
export function recapContentLayout(snapshot, window) {
  const ranking = Boolean(snapshot && Array.isArray(snapshot.ranking) && snapshot.ranking.length);
  const achievements = window !== RECAP_WINDOW_ALL && Boolean(
    snapshot && Array.isArray(snapshot.achievement_groups) && snapshot.achievement_groups.length
  );
  if (!ranking && !achievements) return "empty";
  return ranking && achievements ? "split" : "single";
}
