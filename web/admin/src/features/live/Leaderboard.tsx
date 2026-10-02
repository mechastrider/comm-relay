import { useEffect } from "react";
import { useLocale } from "../../app/locale";
import { useLeaderboard } from "./leaderboard-store";

export type Period = "session" | "day" | "all";
export interface LeaderboardEntry {
  viewer_id?: string;
  rank: number;
  display_name: string;
  xp: number;
  message_count: number;
}
export interface LeaderboardSnapshot {
  period: Period;
  entries: LeaderboardEntry[];
}
export function PeriodSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: Period;
  onChange: (period: Period) => void;
}) {
  const { t } = useLocale();
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as Period)}
    >
      {(["session", "day", "all"] as const).map((period) => (
        <option key={period} value={period}>
          {t(
            "viewers.period" +
              { session: "Session", day: "Day", all: "All" }[period],
          )}
        </option>
      ))}
    </select>
  );
}
export function Leaderboard({
  period,
  onPeriod,
  refreshVersion,
}: {
  period: Period;
  onPeriod: (period: Period) => void;
  refreshVersion: number;
}) {
  const { t } = useLocale();
  const { data, error, loading, refresh } = useLeaderboard(period);
  useEffect(() => {
    void refresh();
  }, [refreshVersion, refresh]);
  return (
    <div
      id="live-leaderboard-region"
      className="live-region"
      aria-busy={loading}
    >
      <div className="live-leaderboard-toolbar">
        <label htmlFor="live-leaderboard-period">
          {t("live.leaderboardPeriod")}
        </label>
        <PeriodSelect
          id="live-leaderboard-period"
          value={period}
          onChange={onPeriod}
        />
      </div>
      <div className="live-leaderboard-body">
        <table
          id="live-leaderboard-table"
          className="data-table"
          aria-label={t("live.leaderboardTable")}
        >
          <caption className="visually-hidden">
            {t("live.leaderboardTable")}
          </caption>
          <thead>
            <tr>
              {["Rank", "Name", "Score", "Messages"].map((column) => (
                <th key={column} scope="col">
                  {t("live.leaderboard" + column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody id="live-leaderboard-table-body">
            {data?.entries.map((entry) => (
              <tr key={entry.viewer_id || entry.rank}>
                <td className="data-table__rank">{entry.rank || ""}</td>
                <td>{entry.display_name || t("viewers.unnamed")}</td>
                <td className="data-table__numeric">{entry.xp ?? 0}</td>
                <td className="data-table__numeric">
                  {entry.message_count ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data && loading && (
          <p className="empty-state">{t("state.loading")}</p>
        )}
        {data?.entries.length === 0 && !error && (
          <p
            id="live-leaderboard-empty"
            className="empty-state live-region-empty"
          >
            {t("live.leaderboardEmpty")}
          </p>
        )}
        {error && (
          <div
            id="live-leaderboard-error"
            className="notice notice--error live-region-error"
          >
            <p className="notice__body">{error.message}</p>
            <button
              className="state-retry btn-physical btn-small"
              onClick={() => void refresh()}
            >
              {t("state.retry")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
