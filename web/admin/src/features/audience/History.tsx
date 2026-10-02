import { useRef, useState } from "react";
import { useLocale } from "../../app/locale";
import { usePages } from "../../services/pages";
import { useResource } from "../../services/resource";
import {
  buildViewerFilterOptions,
  resolveViewerFilter,
  rewardHistoryURL,
  formatRewardHistoryTime,
  formatSignedPoints,
} from "./history-model";
interface HistoryEntry {
  id: string;
  created_at: string;
  viewer_id: string;
  viewer_display_name: string;
  reward_name: string;
  reward_id: string;
  points: number;
}
export function HistoryTable({
  entries,
  compact = false,
  onViewer,
}: {
  entries: HistoryEntry[];
  compact?: boolean;
  onViewer?: (id: string, name: string) => void;
}) {
  const { t, locale } = useLocale();
  const label = t(
    compact ? "viewers.rewardHistoryTable" : "audience.historyTable",
  );
  return (
    <table
      className={
        compact
          ? "reward-history-table reward-history-table--compact"
          : "data-table reward-history-table"
      }
      aria-label={label}
    >
      <caption className="visually-hidden">{label}</caption>
      <thead>
        <tr>
          {[
            "history.colTime",
            ...(!compact ? ["history.colViewer"] : []),
            "history.colReward",
            "history.colXP",
          ].map((key) => (
            <th
              key={key}
              scope="col"
              className={
                key === "history.colXP" ? "data-table__numeric" : undefined
              }
            >
              {t(key)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => (
          <tr key={entry.id || index}>
            <td className="reward-history-table__time">
              {formatRewardHistoryTime(entry.created_at, locale)}
            </td>
            {!compact && (
              <th className="reward-history-table__viewer" scope="row">
                {entry.viewer_id && onViewer ? (
                  <button
                    type="button"
                    className="reward-history-table__viewer-button"
                    aria-label={t("history.filterByViewer", {
                      viewer: entry.viewer_display_name || t("viewers.unnamed"),
                    })}
                    onClick={() =>
                      onViewer(
                        entry.viewer_id,
                        entry.viewer_display_name || t("viewers.unnamed"),
                      )
                    }
                  >
                    {entry.viewer_display_name || t("viewers.unnamed")}
                  </button>
                ) : (
                  entry.viewer_display_name || t("viewers.unnamed")
                )}
              </th>
            )}
            <td className="reward-history-table__reward">
              {entry.reward_name || entry.reward_id || ""}
            </td>
            <td className="data-table__numeric reward-history-table__points">
              {formatSignedPoints(entry.points)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function HistoryContent({
  history,
  compact,
  onViewer,
}: {
  history: ReturnType<typeof usePages<HistoryEntry>>;
  compact?: boolean;
  onViewer?: (id: string, name: string) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="reward-history__content" aria-busy={history.loading}>
      <p className="reward-history__status visually-hidden" aria-live="polite">
        {history.loading
          ? t(
              history.entries.length
                ? "history.loadingMore"
                : "history.loading",
            )
          : history.entries.length
            ? t("history.loadedCount", { count: history.entries.length })
            : ""}
      </p>
      {history.loading && !history.entries.length ? (
        <p className="empty-state">{t("history.loading")}</p>
      ) : (
        <>
          {!!history.entries.length && (
            <div className="reward-history__table-scroll">
              <HistoryTable
                entries={history.entries}
                compact={compact}
                onViewer={onViewer}
              />
            </div>
          )}
          {history.error ? (
            <div className="notice notice--error reward-history__error">
              <p className="notice__body">{t("history.loadFailed")}</p>
              <button
                className="btn-physical btn-small"
                onClick={() => void history.retry()}
              >
                {t("state.retry")}
              </button>
            </div>
          ) : (
            history.loaded &&
            !history.entries.length && (
              <p className="empty-state">
                {t(
                  compact
                    ? "viewers.rewardHistoryEmpty"
                    : "audience.historyEmpty",
                )}
              </p>
            )
          )}
          {!!history.entries.length && history.next && (
            <div className="reward-history__footer">
              <button
                className="btn-physical btn-small"
                disabled={history.loading}
                aria-busy={history.loading}
                onClick={() => void history.more()}
              >
                {t("history.loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export function ViewerHistory({ viewerID }: { viewerID: string }) {
  const { t } = useLocale();
  const history = usePages<HistoryEntry>(rewardHistoryURL(viewerID, 5, null));
  return (
    <section
      className="audience-detail__reward-history reward-history"
      aria-labelledby="viewer-reward-history-heading"
    >
      <h4
        id="viewer-reward-history-heading"
        className="audience-detail__subheading"
      >
        {t("viewers.rewardHistoryHeading")}
      </h4>
      <HistoryContent history={history} compact />
    </section>
  );
}
export function History() {
  const { t } = useLocale();
  const viewers = useResource<{
    viewers: Array<{ id: string; display_name: string; platforms: string[] }>;
  }>("/api/viewers");
  const options = buildViewerFilterOptions(
    viewers.data?.viewers ?? [],
    (platform) => {
      const key = "platform." + platform;
      const label = t(key);
      return label === key ? platform : label;
    },
  );
  const [selection, setSelection] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [query, setQuery] = useState(""),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const history = usePages<HistoryEntry>(
    rewardHistoryURL(selection?.id ?? null, 50, null),
  );
  const choose = (id: string, name: string) => {
    setSelection({ id, name });
    setQuery(options.find((option) => option.id === id)?.label ?? name);
    setError("");
  };
  const clear = () => {
    setSelection(null);
    setQuery("");
    setError("");
  };
  const apply = () => {
    if (!query.trim()) {
      clear();
      return;
    }
    const option = resolveViewerFilter(options, query);
    if (!option) {
      setError(t("history.viewerFilterInvalid"));
      input.current?.focus();
      return;
    }
    choose(option.id, option.displayName);
  };
  const failure =
    error || (viewers.error ? t("history.viewerFilterLoadFailed") : "");
  return (
    <>
      <header className="audience-history__toolbar">
        <h2 className="audience-history__title">
          {t("audience.historyHeading")}
        </h2>
        <form
          id="reward-history-viewer-filter-form"
          className="audience-history__filter"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <div className="form__field audience-history__filter-field">
            <label htmlFor="reward-history-viewer-filter">
              {t("history.viewerFilterLabel")}
            </label>
            <input
              ref={input}
              id="reward-history-viewer-filter"
              type="search"
              list="reward-history-viewer-options"
              autoComplete="off"
              placeholder={t("history.viewerFilterPlaceholder")}
              value={query}
              disabled={viewers.loading}
              aria-invalid={!!failure}
              aria-describedby="reward-history-viewer-filter-status reward-history-viewer-filter-error"
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                setError("");
                const option = resolveViewerFilter(options, value);
                if (option) choose(option.id, option.displayName);
                else if (!value.trim()) clear();
              }}
            />
            <datalist id="reward-history-viewer-options">
              {options.map((option) => (
                <option key={option.id} value={option.label} />
              ))}
            </datalist>
            <p
              id="reward-history-viewer-filter-status"
              className="field-hint"
              role="status"
              aria-live="polite"
              hidden={!selection}
            >
              {selection &&
                t("history.viewerFilterActive", { viewer: selection.name })}
            </p>
            <p
              id="reward-history-viewer-filter-error"
              className="field-error"
              role="alert"
              hidden={!failure}
            >
              {failure}
            </p>
          </div>
          <button
            id="apply-reward-history-viewer-filter"
            type="submit"
            className="btn-physical btn-small"
            disabled={viewers.loading}
          >
            {t("history.viewerFilterApply")}
          </button>
          <button
            id="clear-reward-history-viewer-filter"
            type="button"
            className="btn-physical btn-small"
            disabled={!selection}
            onClick={() => {
              clear();
              input.current?.focus();
            }}
          >
            {t("history.viewerFilterClear")}
          </button>
        </form>
        <button
          id="refresh-reward-history"
          type="button"
          className="btn-physical btn-small"
          disabled={history.loading}
          aria-busy={history.loading}
          onClick={() => {
            void history.refresh();
            if (viewers.error) void viewers.refresh();
          }}
        >
          {t("shell.refresh")}
        </button>
      </header>
      <div id="audience-history-content">
        <HistoryContent history={history} onViewer={choose} />
      </div>
    </>
  );
}
