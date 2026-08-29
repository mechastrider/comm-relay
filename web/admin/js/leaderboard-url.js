const LEADERBOARD_PERIODS = new Set(["session", "day", "all"]);
const LEADERBOARD_LAYOUTS = new Set(["panel", "chips"]);

export function normalizeLeaderboardPeriod(period) {
  const value = String(period || "").trim().toLowerCase();
  return LEADERBOARD_PERIODS.has(value) ? value : "session";
}

export function normalizeLeaderboardLayout(layout) {
  const value = String(layout || "").trim().toLowerCase();
  return LEADERBOARD_LAYOUTS.has(value) ? value : "panel";
}

/**
 * @param {string | Record<string, unknown> | null | undefined} options
 * @returns {string}
 */
export function buildLeaderboardURL(options) {
  const opts = typeof options === "string" || options == null ? { period: options } : options;
  const origin =
    opts.origin ||
    (typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin
      : "http://127.0.0.1");
  const url = new URL("/overlay/leaderboard", origin);
  url.searchParams.set("period", normalizeLeaderboardPeriod(opts.period));
  if (!opts.followActive && opts.preset) {
    url.searchParams.set("preset", String(opts.preset));
  }
  const layout = normalizeLeaderboardLayout(opts.layout);
  if (layout === "chips") {
    url.searchParams.set("layout", layout);
  }
  const fontSizePx = Number.parseInt(String(opts.fontSizePx), 10);
  if (Number.isFinite(fontSizePx) && fontSizePx >= 12 && fontSizePx <= 48) {
    url.searchParams.set("font_size_px", String(fontSizePx));
  }
  return url.href;
}
