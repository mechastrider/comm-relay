import { Button } from "./Button";
import { Field } from "./Field";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "../app/locale";
import { post, request } from "../services/api";
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
    [done, setDone] = useState(false),
    [title, setTitle] = useState("");
  const pending = useRef(false);
  const edited = useRef(false);
  useEffect(() => {
    if (!open) return;
    edited.current = false;
    setTitle("");
    const controller = new AbortController();
    void request<{ title?: string }>("/api/sessions/title-suggestion", {
      signal: controller.signal,
    })
      .then((body) => {
        if (!edited.current && body.title) setTitle(body.title);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [open]);
  const start = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await post("/api/sessions/start", { title });
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
      <Button
        id={id}
        className="btn-small has-tooltip"
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
      </Button>
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
            <Button
              id="new-stream-prompt-cancel"
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              {t("dialog.cancel")}
            </Button>
            <Button
              variant="primary"
              id="new-stream-prompt-confirm"
              type="submit"
              form="new-stream-form"
              disabled={busy}
            >
              {t("stream.newStreamConfirm")}
            </Button>
          </>
        }
      >
        <form
          id="new-stream-form"
          onSubmit={(event) => {
            event.preventDefault();
            void start();
          }}
        >
          <p>{t("stream.newStreamMessage")}</p>
          <Field>
            <label htmlFor="new-stream-title">{t("stream.newStreamName")}</label>
            <input
              id="new-stream-title"
              type="text"
              maxLength={140}
              autoFocus
              value={title}
              disabled={busy}
              aria-describedby="new-stream-title-hint"
              onChange={(event) => {
                edited.current = true;
                setTitle(event.target.value);
              }}
            />
            <p id="new-stream-title-hint" className="field-hint">
              {t("stream.newStreamNameHint")}
            </p>
          </Field>
          {error && <p role="alert">{error}</p>}
        </form>
      </Dialog>
    </>
  );
}
