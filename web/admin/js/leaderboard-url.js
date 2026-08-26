const LEADERBOARD_PERIODS = new Set(["session", "day", "all"]);

export function normalizeLeaderboardPeriod(period) {
  const value = String(period || "").trim().toLowerCase();
  return LEADERBOARD_PERIODS.has(value) ? value : "session";
}

export function buildLeaderboardURL(period) {
  const url = new URL("/overlay/leaderboard", window.location.origin);
  url.searchParams.set("period", normalizeLeaderboardPeriod(period));
  return url.href;
}
