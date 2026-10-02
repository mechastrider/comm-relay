import { Button } from "../../components/Button";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "../../app/locale";
import { usePages } from "../../services/pages";
import { useResource } from "../../services/resource";
import { RecapDetail, RecapHistoryRow } from "../live/RecapDetail";
import { encodeRecapSharePNG, triggerRecapDownload } from "../live/recap-image";
import type { SessionDetail, SessionSummary } from "../live/recap-types";
export function Archive() {
  const { t } = useLocale();
  const sessions = usePages<SessionSummary>(
    "/api/sessions?limit=20",
    "sessions",
  );
  const [selected, setSelected] = useState<string | null>(null);
  const detail = useResource<SessionDetail>(
    selected ? "/api/sessions/get?id=" + encodeURIComponent(selected) : null,
  );
  const [encoding, setEncoding] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const alive = useRef(false),
    pending = useRef(false);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (detail.data)
      content.current?.querySelector("h3")?.focus({ preventScroll: true });
  }, [detail.data]);
  const download = async () => {
    if (pending.current || !detail.data?.snapshot) return;
    pending.current = true;
    setEncoding(true);
    setStatus(t("recap.downloadProgress"));
    setError("");
    try {
      const blob = await encodeRecapSharePNG({
        snapshot: detail.data.snapshot,
        window: "session",
      });
      if (!alive.current) return;
      const result = await triggerRecapDownload(
        blob,
        "comm-relay-recap-session.png",
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
      pending.current = false;
      if (alive.current) setEncoding(false);
    }
  };
  const busy = sessions.loading || detail.loading || encoding;
  const failure = error || detail.error?.message || sessions.error?.message;
  return (
    <>
      <header className="audience-archive__toolbar">
        <h2 className="audience-archive__title">
          {t("audience.archiveHeading")}
        </h2>
        <div className="audience-archive__actions">
          {selected && (
            <Button
              id="audience-archive-back"
              className="btn-small"
              disabled={busy}
              onClick={() => {
                const id = selected;
                setSelected(null);
                setStatus("");
                setError("");
                requestAnimationFrame(() => {
                  Array.from(
                    content.current?.querySelectorAll<HTMLButtonElement>(
                      "button[data-session-id]",
                    ) ?? [],
                  )
                    .find((button) => button.dataset.sessionId === id)
                    ?.focus();
                });
              }}
            >
              {t("recap.back")}
            </Button>
          )}
          {detail.data?.snapshot && (
            <Button
              id="audience-archive-download"
              className="btn-small"
              disabled={busy}
              onClick={() => void download()}
            >
              {t("recap.downloadImage")}
            </Button>
          )}
          {(detail.error || sessions.error) && (
            <Button
              id="audience-archive-retry"
              className="btn-small"
              disabled={busy}
              onClick={() => {
                if (selected) void detail.refresh();
                else void sessions.retry();
              }}
            >
              {t("state.retry")}
            </Button>
          )}
        </div>
      </header>
      <p
        id="audience-archive-status"
        className={
          "audience-archive__status field-hint" +
          (failure ? " notice--error" : "")
        }
        hidden={!failure && !status}
        role={failure ? "alert" : "status"}
      >
        {failure || status}
      </p>
      <div
        ref={content}
        id="audience-archive-content"
        className="audience-archive__content"
        aria-busy={busy}
      >
        {selected ? (
          detail.data && <RecapDetail detail={detail.data} historical />
        ) : (
          <>
            {sessions.loaded && !sessions.entries.length && (
              <p className="empty-state">{t("recap.historyEmpty")}</p>
            )}
            <div className="live-recap-history">
              {sessions.entries.map((session) => (
                <RecapHistoryRow
                  key={session.id}
                  session={session}
                  onSelect={setSelected}
                />
              ))}
            </div>
            {sessions.next && (
              <Button
                className="btn-small"
                disabled={busy}
                onClick={() => void sessions.more()}
              >
                {t("recap.loadMore")}
              </Button>
            )}
          </>
        )}
      </div>
    </>
  );
}
