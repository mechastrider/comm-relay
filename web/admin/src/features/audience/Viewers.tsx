import { Field } from "../../components/Field";
import { Button, IconButton } from "../../components/Button";
import { preferenceStorage } from "../../services/storage";
import { useReportSaveStatus } from "../../app/save-status";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate } from "react-router";
import { useLocale } from "../../app/locale";
import { useNavigation, type Period } from "../../app/navigation";
import { useRuntime } from "../../app/runtime";
import { useResource } from "../../services/resource";
import { NewStream } from "../../components/NewStream";
import { Dialog } from "../../components/Dialog";
import { PlatformIcons } from "../../components/PlatformIcons";
import { Portrait } from "./Portrait";
import { ViewerDetail } from "./ViewerDetail";
import type { Viewer } from "./viewer-types";
import {
  readAudienceSort,
  writeAudienceSort,
  nextAudienceSort,
  audienceSortAriaValue,
  sortAudienceViewers,
  viewerPeriodMetrics,
} from "./viewer-model";
const PAGE_SIZE = 50;
const EMPTY_VIEWERS: Viewer[] = [];

export function Viewers() {
  const { t } = useLocale(),
    { period, setPeriod, setLiveTab } = useNavigation(),
    { subscribe } = useRuntime();
  const navigate = useNavigate();
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState("");
  const [sort, setSort] = useState(() => readAudienceSort(preferenceStorage()));
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<null | string>(null);
  useReportSaveStatus(dirty, busy);
  const blocker = useBlocker(dirty || busy);
  const directory = useResource<{ viewers: Viewer[] }>(
    "/api/viewers" + (query ? "?q=" + encodeURIComponent(query) : ""),
  );
  const { refresh } = directory;
  useEffect(() => {
    if (
      !directory.data ||
      directory.loading ||
      !selected ||
      directory.data.viewers.some((viewer) => viewer.id === selected)
    )
      return;
    if (dirty || busy) setPending("");
    else setSelected("");
  }, [directory.data, directory.loading, selected, dirty, busy]);
  const opener = useRef<HTMLElement | null>(null);
  const [page, setPage] = useState(0);
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(
    () =>
      subscribe((frame) => {
        if (frame.type === "reconnected" || frame.type === "viewer_progression")
          void refresh();
      }),
    [subscribe, refresh],
  );
  const viewers = directory.data?.viewers ?? EMPTY_VIEWERS;
  const sorted = useMemo(
    () => sortAudienceViewers(viewers, sort, period) as Viewer[],
    [viewers, sort, period],
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(sorted.length / PAGE_SIZE) - 1),
  );
  const visible = sorted.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  const goToPage = (next: number) => {
    if (dirty || busy) {
      setPendingPage(next);
      return;
    }
    setSelected("");
    setPage(next);
  };
  const choose = (id: string) => {
    if (id === selected) return;
    if (dirty || busy) {
      setPending(id);
      return;
    }
    setSelected(id);
    if (!id)
      requestAnimationFrame(() => {
        if (opener.current?.isConnected) opener.current.focus();
        else document.getElementById("audience-table-heading")?.focus();
      });
  };
  const open = (viewer: Viewer, element: HTMLElement) => {
    opener.current = element;
    choose(viewer.id);
  };
  const cancel = () => {
    setPending(null);
    setPendingPage(null);
    if (blocker.state === "blocked") blocker.reset();
  };
  const sortHeader = (
    column: "viewer" | "xp" | "messages" | "streams",
    label: string,
  ) => (
    <th
      scope="col"
      className={
        (column === "viewer" ? "" : "data-table__numeric ") +
        "audience-viewers-table__sortable"
      }
      aria-sort={audienceSortAriaValue(sort, column)}
    >
      <button
        id={"audience-sort-" + column}
        className="audience-sort-button"
        aria-label={t("audience.sort" + label)}
        onClick={() => {
          const next = nextAudienceSort(sort, column);
          setSort(next);
          setPage(0);
          writeAudienceSort(preferenceStorage(), next);
        }}
      >
        {t("audience.col" + label)}
      </button>
    </th>
  );
  return (
    <>
      <header className="audience-toolbar">
        <div className="audience-toolbar__controls">
          <Field className="audience-toolbar__search">
            <label htmlFor="viewers-search">{t("viewers.searchLabel")}</label>
            <input
              id="viewers-search"
              type="search"
              autoComplete="off"
              placeholder={t("viewers.searchPlaceholder")}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
          </Field>
          <Field className="audience-toolbar__filters">
            <label htmlFor="audience-period">{t("audience.periodLabel")}</label>
            <select
              id="audience-period"
              aria-describedby="audience-period-hint"
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value as Period);
                setPage(0);
              }}
            >
              {(["session", "day", "all"] as const).map((value) => (
                <option key={value} value={value}>
                  {t(
                    "viewers.period" + value[0].toUpperCase() + value.slice(1),
                  )}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="audience-toolbar__actions">
          <Button
            id="audience-open-leaderboard"
            className="btn-small"
            onClick={() => {
              setLiveTab("leaderboard");
              void navigate("/live");
            }}
          >
            {t("audience.openLeaderboard")}
          </Button>
          <IconButton
            id="refresh-viewers"
            className="icon-btn--compact has-tooltip"
            aria-label={t("shell.refresh")}
            onClick={() => void refresh()}
          >
            <svg
              className="icon-btn__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M20 11a8 8 0 1 0 2 5.3" strokeLinecap="round" />
              <path
                d="M20 4v7h-7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="ui-tooltip" role="tooltip">
              {t("shell.refresh")}
            </span>
          </IconButton>
          <NewStream
            id="audience-new-stream-button"
            onStarted={() => void refresh()}
          />
        </div>
        <p
          id="audience-period-hint"
          className="field-hint audience-toolbar__hint"
        >
          {t("audience.periodHint")}
        </p>
      </header>
      <div id="audience-layout" className="audience-layout">
        <section
          id="audience-table-region"
          className="audience-table-region"
          aria-labelledby="audience-table-heading"
        >
          <h2
            id="audience-table-heading"
            className="visually-hidden"
            tabIndex={-1}
          >
            {t("audience.tableHeading")}
          </h2>
          <div className="audience-table-body">
            <table
              id="audience-viewers-table"
              className="data-table audience-viewers-table"
              aria-label={t("audience.tableCaption")}
            >
              <caption className="visually-hidden">
                {t("audience.tableCaption")}
              </caption>
              <colgroup>
                {["viewer", "platforms", "score", "messages", "streams"].map(
                  (column) => (
                    <col
                      key={column}
                      className={"audience-viewers-table__col-" + column}
                    />
                  ),
                )}
              </colgroup>
              <thead className="audience-viewers-table__head">
                <tr>
                  {sortHeader("viewer", "Viewer")}
                  <th scope="col">{t("audience.colPlatforms")}</th>
                  {sortHeader("xp", "XP")}
                  {sortHeader("messages", "Messages")}
                  {sortHeader("streams", "Streams")}
                </tr>
              </thead>
              <tbody id="audience-viewers-table-body">
                {visible.map((viewer, index) => {
                  const metrics = viewerPeriodMetrics(viewer, period);
                  return (
                    <tr
                      key={viewer.id}
                      data-viewer-id={viewer.id}
                      tabIndex={-1}
                      aria-selected={selected === viewer.id}
                      className={
                        selected === viewer.id
                          ? "audience-viewers-table__row--selected"
                          : undefined
                      }
                      onClick={(event) =>
                        open(
                          viewer,
                          event.currentTarget.querySelector("button")!,
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "ArrowDown" ||
                          event.key === "ArrowUp"
                        ) {
                          event.preventDefault();
                          const rows =
                            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                              ".audience-viewers-table__name-button",
                            );
                          rows?.[
                            Math.max(
                              0,
                              Math.min(
                                visible.length - 1,
                                index + (event.key === "ArrowDown" ? 1 : -1),
                              ),
                            )
                          ]?.focus();
                        } else if (
                          (event.key === "Enter" || event.key === " ") &&
                          event.target === event.currentTarget
                        ) {
                          event.preventDefault();
                          open(viewer, event.currentTarget);
                        }
                      }}
                    >
                      <th scope="row" className="audience-viewers-table__name">
                        <div className="audience-viewers-table__name-inner">
                          <Portrait
                            url={viewer.avatar_url}
                            name={viewer.display_name}
                            className="audience-viewers-table__portrait"
                          />
                          <span className="audience-viewers-table__name-stack">
                            <button
                              className="audience-viewers-table__name-button"
                              title={viewer.display_name}
                            >
                              {viewer.display_name || t("viewers.unnamed")}
                            </button>
                            {viewer.current_level?.title && (
                              <span className="audience-viewers-table__title">
                                {viewer.current_level.title}
                              </span>
                            )}
                          </span>
                          <span
                            className="audience-viewers-table__chevron"
                            aria-hidden="true"
                          >
                            ›
                          </span>
                        </div>
                      </th>
                      <td className="audience-viewers-table__platforms">
                        <PlatformIcons platforms={viewer.platforms ?? []} />
                      </td>
                      <td className="data-table__numeric">{metrics.xp}</td>
                      <td className="data-table__numeric">
                        {metrics.messages}
                      </td>
                      <td className="data-table__numeric">
                        {viewer.session_count || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sorted.length > 0 && (
              <nav
                className="audience-pagination"
                aria-label={t("audience.pagination")}
              >
                <p role="status">
                  {t("audience.pageRange", {
                    start: currentPage * PAGE_SIZE + 1,
                    end: Math.min((currentPage + 1) * PAGE_SIZE, sorted.length),
                    total: sorted.length,
                  })}
                </p>
                <Button
                  className="btn-small"
                  disabled={currentPage === 0 || directory.loading || busy}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  {t("audience.previousPage")}
                </Button>
                <Button
                  className="btn-small"
                  disabled={
                    (currentPage + 1) * PAGE_SIZE >= sorted.length ||
                    directory.loading ||
                    busy
                  }
                  onClick={() => goToPage(currentPage + 1)}
                >
                  {t("audience.nextPage")}
                </Button>
              </nav>
            )}
            {!sorted.length && !directory.error && (
              <div
                id="audience-table-empty"
                className="empty-state audience-region-empty"
              >
                <p
                  id="audience-table-empty-message"
                  className="audience-region-empty__message"
                >
                  {t(
                    directory.loading
                      ? "state.loading"
                      : query
                        ? "audience.noSearchMatches"
                        : "audience.noViewers",
                  )}
                </p>
                {query && (
                  <Button
                    id="audience-clear-search"
                    className="btn-small"
                    onClick={() => setSearch("")}
                  >
                    {t("audience.clearSearch")}
                  </Button>
                )}
              </div>
            )}
            {directory.error && (
              <div
                id="audience-table-error"
                className="notice notice--error audience-region-error"
                role="alert"
              >
                <p className="notice__body">{directory.error.message}</p>
                <Button
                  className="state-retry btn-small"
                  onClick={() => void refresh()}
                >
                  {t("state.retry")}
                </Button>
              </div>
            )}
          </div>
        </section>
        {selected && (
          <ViewerDetail
            key={selected}
            id={selected}
            viewers={viewers}
            onClose={() => choose("")}
            onChange={() => void refresh()}
            onMerged={(id) => {
              setDirty(false);
              setSelected(id);
              void refresh();
            }}
            onDirty={setDirty}
            onBusy={setBusy}
          />
        )}
      </div>
      <Dialog
        id="discard-changes-dialog"
        className="prompt-dialog"
        open={
          pending !== null ||
          pendingPage !== null ||
          blocker.state === "blocked"
        }
        onClose={cancel}
        title={t("dialog.discardUnsavedTitle")}
        actions={
          <>
            <Button
              id="discard-changes-cancel"
              onClick={cancel}
            >
              {t("dialog.keepEditing")}
            </Button>
            <Button variant="danger"
              id="discard-changes-confirm"
              disabled={busy}
              onClick={() => {
                setDirty(false);
                if (pendingPage !== null) {
                  setSelected("");
                  setPage(pendingPage);
                  setPendingPage(null);
                } else if (pending !== null) {
                  setSelected(pending);
                  setPending(null);
                } else if (blocker.state === "blocked") blocker.proceed();
              }}
            >
              {t("dialog.discardChanges")}
            </Button>
          </>
        }
      >
        <p>{t("settings.discardConfirm")}</p>
      </Dialog>
    </>
  );
}
