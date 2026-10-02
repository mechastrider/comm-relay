import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "../../app/locale";
import { useWire } from "../../app/runtime";
import { request } from "../../services/api";
import { summarizeLiveStatistics } from "./statistics-model";
import type { Period, LeaderboardSnapshot } from "./Leaderboard";

type Viewer = {
  id: string;
  display_name: string;
  message_count: number;
  xp: number;
  session_message_count: number;
  session_xp: number;
  day_message_count: number;
  day_xp: number;
};
type Summary = ReturnType<typeof summarizeLiveStatistics>;
export function Statistics({
  period,
  refreshVersion,
}: {
  period: Period;
  refreshVersion: number;
}) {
  const { t } = useLocale();
  const [snapshot, setSnapshot] = useState<{
    period: Period;
    summary: Summary;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dirty = useRef(false);
  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    dirty.current = false;
    setLoading(true);
    setError("");
    try {
      const viewers = await request<{ viewers: Viewer[] }>("/api/viewers", {
        signal: controller.signal,
      });
      let leaderboard: LeaderboardSnapshot | null = null;
      try {
        leaderboard = await request<LeaderboardSnapshot>(
          "/api/leaderboard?period=" + period,
          { signal: controller.signal },
        );
      } catch {
        /* Viewer totals remain useful when ranking is unavailable. */
      }
      if (!controller.signal.aborted)
        setSnapshot({
          period,
          summary: summarizeLiveStatistics(viewers, leaderboard, {
            period,
            leaderboardFailed: !leaderboard,
          }),
        });
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (!controller.signal.aborted) {
        active.current = null;
        setLoading(false);
      }
    }
  }, [period]);
  useEffect(() => {
    void refresh();
    timer.current = setInterval(() => {
      if (dirty.current && !active.current) void refresh();
    }, 1000);
    return () => {
      active.current?.abort();
      clearInterval(timer.current);
    };
  }, [refresh, refreshVersion]);
  useWire((frame) => {
    if (["leaderboard", "viewer_progression", "message"].includes(frame.type))
      dirty.current = true;
    if (frame.type === "reconnected") void refresh();
  });
  const summary = snapshot?.period === period ? snapshot.summary : null;
  const rows = summary
    ? [
        ["live.statsPeriodLabel", t("live.statsPeriod." + period)],
        ["live.statsUniqueViewers", String(summary.uniqueViewers)],
        ["live.statsTotalMessages", String(summary.totalMessages)],
        ["live.statsTotalScore", String(summary.totalScore)],
        [
          "live.statsTopScoreLabel",
          summary.topScorer
            ? summary.tiedTopCount > 1
              ? t("live.statsTopScoreTied", {
                  score: String(summary.topScore),
                  count: String(summary.tiedTopCount),
                })
              : t("live.statsTopScore", {
                  name: summary.topScorer,
                  score: String(summary.topScore),
                })
            : t("live.statsNoTopScore"),
        ],
      ]
    : [];
  return (
    <div
      id="live-statistics-region"
      className="live-region"
      aria-busy={loading}
    >
      {summary?.hasViewers && summary.partialData && (
        <p
          id="live-statistics-partial"
          className="field-hint live-statistics-partial"
        >
          {t("live.statisticsPartial")}
        </p>
      )}
      <dl id="live-statistics-list" className="live-statistics-list">
        {summary?.hasViewers &&
          rows.map(([key, value]) => (
            <div className="live-statistics__row" key={key}>
              <dt>{t(key)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      {!summary && loading && (
        <p className="empty-state">{t("state.loading")}</p>
      )}
      {summary && !summary.hasViewers && !error && (
        <p id="live-statistics-empty" className="empty-state live-region-empty">
          {t("live.statisticsEmpty")}
        </p>
      )}
      {error && (
        <div
          id="live-statistics-error"
          className="notice notice--error live-region-error"
        >
          <p className="notice__body">{error}</p>
          <button
            className="state-retry btn-physical btn-small"
            onClick={() => void refresh()}
          >
            {t("state.retry")}
          </button>
        </div>
      )}
    </div>
  );
}
