import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router";
import { useLocale } from "../../app/locale";
import { useWire } from "../../app/runtime";
import { Modal } from "../../components/Dialog";
import { ApiError, post, request } from "../../services/api";
import { useResource } from "../../services/resource";
import { RecapDetail, RecapHistoryRow, useRecapTime } from "./RecapDetail";
import { encodeRecapSharePNG, triggerRecapDownload } from "./recap-image";
import type {
  RecapCurrent,
  RecapPresentation,
  SessionDetail,
  SessionSummary,
} from "./recap-types";

export function Recap({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const time = useRecapTime();
  const current = useResource<RecapCurrent>("/api/stream-recaps/current");
  const [view, setView] = useState<"current" | "history">("current");
  const [window, setWindow] = useState<"session" | "all">("session");
  const [confirmation, setConfirmation] = useState(false);
  const [action, setAction] = useState<
    "show" | "show-all" | "hide" | "download" | null
  >(null);
  const [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false),
    [historyLoading, setHistoryLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null),
    [historyError, setHistoryError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const detail = useResource<SessionDetail>(
    selected ? "/api/sessions/get?id=" + encodeURIComponent(selected) : null,
  );
  const alive = useRef(false),
    inFlight = useRef<string | null>(null);
  const historyController = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      historyController.current?.abort();
    };
  }, []);
  const showing = action === "show" || action === "show-all";
  const blocker = useBlocker(showing);
  useEffect(() => {
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);
  const close = () => {
    if (inFlight.current !== "show" && inFlight.current !== "show-all")
      onClose();
  };
  const loadHistory = async (next: string | null) => {
    historyController.current?.abort();
    const controller = new AbortController();
    historyController.current = controller;
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const payload = await request<{
        sessions: SessionSummary[];
        next_cursor?: string;
      }>(
        "/api/sessions?limit=20" +
          (next ? "&cursor=" + encodeURIComponent(next) : ""),
        { signal: controller.signal },
      );
      if (!controller.signal.aborted && alive.current) {
        setHistory((previous) =>
          next
            ? [
                ...previous,
                ...payload.sessions.filter(
                  (session) => !previous.some((item) => item.id === session.id),
                ),
              ]
            : payload.sessions,
        );
        setCursor(payload.next_cursor || null);
        setHistoryLoaded(true);
      }
    } catch (cause) {
      if (!controller.signal.aborted && alive.current) {
        setHistoryError(true);
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      if (!controller.signal.aborted && alive.current) setHistoryLoading(false);
    }
  };
  useWire((frame) => {
    if (frame.type === "reconnected") {
      void current.refresh();
      if (view === "history") {
        if (selected) void detail.refresh();
        else void loadHistory(null);
      }
    }
    if (frame.type === "stream_recap_state") {
      const state = current.data;
      if (state && frame.visible === false)
        current.receive({ ...state, visible: false, window: null });
      else if (state && frame.window === "all")
        current.receive({
          ...state,
          visible: frame.visible === true,
          window: "all",
          all_time: frame.all_time as RecapPresentation | null,
        });
      else if (
        state &&
        frame.snapshot &&
        (frame.snapshot as RecapPresentation).session_id === state.session_id
      ) {
        const snapshot = frame.snapshot as RecapPresentation;
        current.receive({
          ...state,
          visible: frame.visible === true,
          window: "session",
          snapshot,
          session: { ...state.session, snapshot },
        });
      }
      void current.refresh();
    }
  });
  const mutate = async (kind: "show" | "show-all" | "hide") => {
    if (inFlight.current || !current.data) return;
    inFlight.current = kind;
    setAction(kind);
    setError("");
    setStatus("");
    try {
      const payload = await post<Partial<RecapCurrent>>(
        "/api/stream-recaps/" + kind,
        kind === "show" ? { session_id: current.data.session_id } : {},
      );
      if (!alive.current) return;
      const next = { ...current.data, ...payload };
      if (payload.snapshot)
        next.session = { ...next.session, snapshot: payload.snapshot };
      current.receive(next);
      setConfirmation(false);
      setStatus(
        t(
          kind === "show"
            ? "recap.shown"
            : kind === "show-all"
              ? "recap.allTimeShown"
              : "recap.hidden",
        ),
      );
    } catch (cause) {
      if (!alive.current) return;
      if (
        kind === "show" &&
        cause instanceof ApiError &&
        cause.status === 409
      ) {
        setConfirmation(false);
        setError(t("recap.sessionChanged"));
        await current.refresh();
      } else
        setError(
          cause instanceof ApiError && cause.status !== 503
            ? cause.message
            : t("recap.offline"),
        );
    } finally {
      if (alive.current) {
        inFlight.current = null;
        setAction(null);
      }
    }
  };
  const download = async () => {
    if (inFlight.current || !current.data) return;
    const snapshot =
      window === "all"
        ? current.data.all_time
          ? {
              ...current.data.all_time,
              ranking: current.data.all_time.ranking.slice(0, 5),
              achievement_groups: [],
            }
          : null
        : current.data.snapshot;
    if (!snapshot) return;
    inFlight.current = "download";
    setAction("download");
    setStatus(t("recap.downloadProgress"));
    setError("");
    try {
      const blob = await encodeRecapSharePNG({ snapshot, window });
      if (!alive.current) return;
      const result = await triggerRecapDownload(
        blob,
        `comm-relay-recap-${window}.png`,
        t("recap.saveDialogTitle"),
      );
      if (alive.current)
        setStatus(
          t(
            result.cancelled ? "recap.downloadCancelled" : "recap.downloadDone",
          ),
        );
    } catch {
      if (alive.current) setError(t("recap.downloadFailed"));
    } finally {
      if (alive.current) {
        inFlight.current = null;
        setAction(null);
      }
    }
  };
  const busy = current.loading || historyLoading || detail.loading || !!action;
  const canDownload =
    window === "all" ? !!current.data?.all_time : !!current.data?.snapshot;
  const failure = error || current.error?.message || detail.error?.message;
  const session = current.data?.session;
  const switchView = (next: "current" | "history") => {
    if (busy || confirmation) return;
    setView(next);
    setSelected(null);
    setError("");
    if (next === "history" && !historyLoaded) void loadHistory(null);
  };
  return (
    <Modal
      open
      onClose={close}
      id="live-recap-dialog"
      className="live-recap-dialog"
      labelledBy="live-recap-heading"
      describedBy={
        confirmation ? "live-recap-confirm-description" : "live-recap-status"
      }
    >
      <header className="live-recap-dialog__header">
        <h2 id="live-recap-heading" tabIndex={-1}>
          {t("recap.title")}
        </h2>
        <button
          id="live-recap-close"
          className="icon-btn has-tooltip"
          disabled={showing}
          onClick={close}
          aria-label={t("dialog.close")}
        >
          <span aria-hidden="true">×</span>
          <span className="ui-tooltip" role="tooltip">
            {t("dialog.close")}
          </span>
        </button>
      </header>
      <div
        className="live-recap-dialog__tabs"
        role="tablist"
        aria-label={t("recap.viewSwitcher")}
      >
        {(["current", "history"] as const).map((tab) => (
          <button
            key={tab}
            id={`live-recap-${tab}-tab`}
            className="dialog-tab"
            type="button"
            role="tab"
            aria-controls="live-recap-body"
            aria-selected={view === tab}
            tabIndex={view === tab ? 0 : -1}
            disabled={busy || confirmation}
            onClick={() => switchView(tab)}
            onKeyDown={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "current"
                    : event.key === "End"
                      ? "history"
                      : tab === "current"
                        ? "history"
                        : "current";
                switchView(next);
                document.getElementById(`live-recap-${next}-tab`)?.focus();
              }
            }}
          >
            {t("recap." + tab)}
          </button>
        ))}
      </div>
      <p
        id="live-recap-status"
        className={`live-recap-dialog__status${failure ? " notice--error" : ""}`}
        role={failure ? "alert" : "status"}
        aria-live="polite"
        hidden={!failure && !status}
      >
        {failure || status}
      </p>
      <div
        id="live-recap-body"
        className="live-recap-dialog__body"
        aria-busy={busy}
      >
        {confirmation ? (
          <>
            <h3>{t("recap.confirmTitle")}</h3>
            <p className="field-hint">
              {t("recap.confirmSession", {
                id: session?.id || "",
                time: time(session?.started_at),
              })}
            </p>
            <p id="live-recap-confirm-description">
              {t("recap.confirmPermanent", { time: time(session?.started_at) })}
            </p>
            <p className="field-hint">{t("recap.confirmNoReset")}</p>
          </>
        ) : view === "history" ? (
          selected ? (
            detail.data && <RecapDetail detail={detail.data} historical />
          ) : (
            <>
              {historyLoaded && !history.length && (
                <p className="empty-state">{t("recap.historyEmpty")}</p>
              )}
              <div className="live-recap-history">
                {history.map((item) => (
                  <RecapHistoryRow
                    key={item.id}
                    session={item}
                    onSelect={(id) => {
                      setSelected(id);
                      setError("");
                    }}
                  />
                ))}
              </div>
              {cursor && (
                <button
                  className="btn-physical btn-small"
                  disabled={busy}
                  onClick={() => void loadHistory(cursor)}
                >
                  {t("recap.loadMore")}
                </button>
              )}
            </>
          )
        ) : session ? (
          <>
            <div
              className="live-recap-window-switch"
              role="radiogroup"
              aria-label={t("recap.windowSwitcher")}
            >
              {(["session", "all"] as const).map((value) => (
                <label key={value} className="live-recap-window-switch__option">
                  <input
                    type="radio"
                    name="live-recap-window"
                    value={value}
                    checked={window === value}
                    disabled={busy}
                    onChange={() => setWindow(value)}
                  />
                  {t(
                    value === "session"
                      ? "recap.windowSession"
                      : "recap.windowAllTime",
                  )}
                </label>
              ))}
            </div>
            <RecapDetail
              detail={session}
              allTime={current.data?.all_time}
              window={window}
            />
          </>
        ) : (
          <p className="empty-state">
            {t(current.loading ? "state.loading" : "recap.currentUnavailable")}
          </p>
        )}
      </div>
      <footer className="live-recap-dialog__footer">
        {selected && (
          <button
            id="live-recap-back"
            className="btn-physical btn-small"
            onClick={() => setSelected(null)}
          >
            {t("recap.back")}
          </button>
        )}
        <span className="live-recap-dialog__spacer" />
        {(current.error || detail.error || historyError) && (
          <button
            id="live-recap-retry"
            className="btn-physical btn-small"
            disabled={!!action}
            onClick={() => {
              setError("");
              if (selected) void detail.refresh();
              else if (view === "history")
                void loadHistory(historyLoaded ? cursor : null);
              else void current.refresh();
            }}
          >
            {t("state.retry")}
          </button>
        )}
        {confirmation ? (
          <>
            <button
              id="live-recap-cancel"
              className="btn-physical btn-small"
              disabled={showing}
              onClick={() => setConfirmation(false)}
            >
              {t("dialog.cancel")}
            </button>
            <button
              id="live-recap-confirm"
              className="btn-physical btn-start"
              disabled={busy || !session}
              onClick={() => void mutate("show")}
            >
              {t("recap.confirmShow")}
            </button>
          </>
        ) : (
          view === "current" && (
            <>
              {current.data?.visible && (
                <button
                  id="live-recap-hide"
                  className="btn-physical btn-small"
                  disabled={busy}
                  onClick={() => void mutate("hide")}
                >
                  {t("recap.hide")}
                </button>
              )}
              <button
                id="live-recap-download"
                className="btn-physical btn-small"
                disabled={busy || !canDownload}
                aria-disabled={busy || !canDownload}
                title={
                  !canDownload && window === "session"
                    ? t("recap.downloadNeedsCapture")
                    : undefined
                }
                onClick={() => void download()}
              >
                {t("recap.downloadImage")}
              </button>
              {window === "session" ? (
                <button
                  id="live-recap-show"
                  className="btn-physical"
                  disabled={busy || !session}
                  onClick={() => {
                    if (current.data?.snapshot) void mutate("show");
                    else setConfirmation(true);
                  }}
                >
                  {t(current.data?.snapshot ? "recap.showAgain" : "recap.show")}
                </button>
              ) : (
                <button
                  id="live-recap-show-all"
                  className="btn-physical"
                  disabled={busy || !session}
                  onClick={() => void mutate("show-all")}
                >
                  {t("recap.showAllTime")}
                </button>
              )}
            </>
          )
        )}
      </footer>
    </Modal>
  );
}
