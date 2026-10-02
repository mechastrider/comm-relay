import { useRef, useState } from "react";
import { useLocale } from "../app/locale";
import { post } from "../services/api";
import { Dialog } from "./Dialog";
export function NewStream({
  id = "new-stream-button",
  onStarted,
}: {
  id?: string;
  onStarted: () => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const pending = useRef(false);
  const start = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await post("/api/sessions/start", {});
      setOpen(false);
      setDone(true);
      onStarted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <button
        id={id}
        className="btn-physical btn-small has-tooltip"
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <span>{t("stream.newStream")}</span>
        <span className="ui-tooltip" role="tooltip">
          {t("stream.newStreamHint")}
        </span>
      </button>
      {done && (
        <span className="visually-hidden" role="status">
          {t("stream.newStreamDone")}
        </span>
      )}
      <Dialog
        id="new-stream-prompt"
        className="prompt-dialog"
        open={open}
        onClose={() => {
          if (!pending.current) setOpen(false);
        }}
        title={t("stream.newStreamTitle")}
        actions={
          <>
            <button
              id="new-stream-prompt-cancel"
              className="btn-physical"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              {t("dialog.cancel")}
            </button>
            <button
              id="new-stream-prompt-confirm"
              className="btn-physical btn-start"
              disabled={busy}
              onClick={() => void start()}
            >
              {t("stream.newStreamConfirm")}
            </button>
          </>
        }
      >
        <p>{t("stream.newStreamMessage")}</p>
        {error && <p role="alert">{error}</p>}
      </Dialog>
    </>
  );
}
