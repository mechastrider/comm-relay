import { Button } from "../../components/Button";
import { useReportSaveStatus } from "../../app/save-status";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router";
import { useLocale } from "../../app/locale";
import { Dialog } from "../../components/Dialog";
import { ApiError, post } from "../../services/api";
import { useResource } from "../../services/resource";
import { GreetingFields } from "./Fields";
import { toDraft } from "./Catalog";
import { useMedia } from "./useMedia";
import type { CatalogRecord, CatalogDraft } from "./types";
export function Greetings() {
  const { t } = useLocale();
  const resource = useResource<{ greetings: CatalogRecord[] }>(
    "/api/greetings",
  );
  const [selected, setSelected] = useState(""),
    [pending, setPending] = useState("");
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0),
    [status, setStatus] = useState("");
  const list = resource.data?.greetings ?? [];
  const item = list.find((item) => item.id === selected) ?? list[0];
  useReportSaveStatus(dirty, busy);
  const blocker = useBlocker(dirty || busy);
  const onState = useCallback((dirty: boolean, busy: boolean) => {
    setDirty(dirty);
    setBusy(busy);
  }, []);
  const choose = (id: string) => {
    if (busy || id === item?.id) return;
    if (dirty) {
      setPending(id);
      return;
    }
    setSelected(id);
    setStatus("");
    if (matchMedia("(max-width: 720px)").matches)
      requestAnimationFrame(() =>
        document.getElementById("greetings-editor-heading")?.focus(),
      );
  };
  const cancel = () => {
    setPending("");
    if (blocker.state === "blocked") blocker.reset();
  };
  return (
    <div className="audience-catalog-layout">
      <section
        className="audience-catalog-list"
        aria-labelledby="greetings-list-heading"
      >
        <header className="audience-catalog-list__header">
          <h2
            id="greetings-list-heading"
            className="audience-catalog-list__title"
          >
            {t("greetings.listHeading")}
          </h2>
        </header>
        <div className="audience-catalog-list__body">
          <ul
            id="greetings-list"
            className="audience-catalog-items"
            role="listbox"
            aria-labelledby="greetings-list-heading"
            aria-busy={busy || resource.loading}
          >
            {list.map((entry) => (
              <li
                key={entry.id}
                className={
                  "audience-catalog-items__item" +
                  (entry.id === item?.id
                    ? " audience-catalog-items__item--selected"
                    : "")
                }
                role="option"
                tabIndex={entry.id === item?.id ? 0 : -1}
                aria-selected={entry.id === item?.id}
                onClick={() => choose(entry.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    choose(entry.id);
                  }
                }}
              >
                <span className="audience-catalog-items__primary">
                  {t(
                    entry.id === "returning_viewer"
                      ? "greetings.returningViewer"
                      : "greetings.newViewer",
                  )}
                </span>
                <span className="audience-catalog-items__meta">
                  {t(
                    entry.id === "returning_viewer"
                      ? "greetings.returningViewerHint"
                      : "greetings.newViewerHint",
                  )}{" "}
                  ·{" "}
                  {t(
                    entry.enabled
                      ? "commands.enabledShort"
                      : "commands.disabledShort",
                  )}
                </span>
              </li>
            ))}
          </ul>
          {resource.error && (
            <div id="greetings-list-error" className="notice notice--error">
              <p className="notice__body">{resource.error.message}</p>
              <Button
                id="greetings-retry"
                className="btn-small"
                onClick={() => void resource.refresh()}
              >
                {t("state.retry")}
              </Button>
            </div>
          )}
        </div>
      </section>
      {item && (
        <GreetingEditor
          key={item.id + ":" + revision}
          item={item}
          status={status}
          onState={onState}
          onSaved={(saved) => {
            resource.receive({
              greetings: list.map((item) =>
                item.id === saved.id ? saved : item,
              ),
            });
            setRevision((value) => value + 1);
            setDirty(false);
            setBusy(false);
            setStatus(t("greetings.saved"));
          }}
        />
      )}
      <Dialog
        id="discard-changes-dialog"
        className="prompt-dialog"
        open={!!pending || blocker.state === "blocked"}
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
                setStatus("");
                if (pending) {
                  setSelected(pending);
                  setPending("");
                } else if (blocker.state === "blocked") blocker.proceed();
              }}
            >
              {t("dialog.discardChanges")}
            </Button>
          </>
        }
      >
        <p>{t("greetings.discardConfirm")}</p>
      </Dialog>
    </div>
  );
}
function GreetingEditor({
  item,
  status: savedStatus,
  onSaved,
  onState,
}: {
  item: CatalogRecord;
  status: string;
  onSaved: (record: CatalogRecord) => void;
  onState: (dirty: boolean, busy: boolean) => void;
}) {
  const { t } = useLocale();
  const [baseline] = useState(() => toDraft(item, "awards"));
  const [draft, setDraft] = useState(baseline);
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState(savedStatus);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const pending = useRef(false);
  const change = (key: keyof CatalogDraft, value: string | boolean) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
    setStatus("");
  };
  const media = useMedia(item, draft, change, (key, message) =>
    setErrors((previous) => ({ ...previous, [key]: message })),
  );
  const dirty = JSON.stringify(baseline) !== JSON.stringify(draft);
  useEffect(() => {
    onState(dirty, busy || media.uploading);
  }, [dirty, busy, media.uploading, onState]);
  const send = async (preview: boolean) => {
    if (pending.current || media.uploading) return;
    const form = document.getElementById(
      "greetings-form",
    ) as HTMLFormElement | null;
    if (!form?.reportValidity()) return;
    pending.current = true;
    setBusy(true);
    setErrors({});
    const body = {
      id: item.id,
      enabled: draft.enabled,
      splash_template: draft.splash_template,
      sound: draft.sound,
      duration_ms: Number(draft.duration_ms),
      image_asset: draft.image_asset,
      sound_file: draft.sound_file,
      sound_volume: Number(draft.sound_volume),
      layout: draft.layout,
      image_fit: draft.image_fit,
      image_size_pct: Number(draft.image_size_pct),
    };
    try {
      if (preview) {
        const result = await post<{ delivered_clients: number }>(
          "/api/greetings/preview",
          body,
        );
        setStatus(
          result.delivered_clients
            ? t("greetings.previewDelivered", {
                count: result.delivered_clients,
              })
            : t("greetings.previewNone"),
        );
      } else {
        const saved = await post<CatalogRecord>("/api/greetings/update", body);
        media.commit(saved);
        onSaved(saved);
      }
    } catch (cause) {
      setStatus(
        cause instanceof Error ? cause.message : t("catalog.saveFailed"),
      );
      if (cause instanceof ApiError) {
        setErrors(cause.fields);
        requestAnimationFrame(() =>
          form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        );
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <aside
      className="audience-catalog-editor"
      aria-labelledby="greetings-editor-heading"
    >
      <header className="audience-catalog-editor__header">
        <h2
          id="greetings-editor-heading"
          className="audience-catalog-editor__title"
          tabIndex={-1}
        >
          {t("greetings.editorHeading")}
        </h2>
        <div className="audience-catalog-editor__actions">
          <Button
            id="greetings-test"
            className="btn-small"
            disabled={busy || media.uploading}
            onClick={() => void send(true)}
          >
            {t("greetings.test")}
          </Button>
          <Button variant="primary"
            id="greetings-save"
            className="btn-small"
            type="submit"
            form="greetings-form"
            disabled={busy || media.uploading}
          >
            {t("catalog.save")}
          </Button>
        </div>
      </header>
      <GreetingFields
        draft={draft}
        errors={errors}
        busy={busy || media.uploading}
        identifier={item.id}
        status={status}
        awards={[]}
        change={change}
        media={media}
        onSubmit={() => void send(false)}
      />
    </aside>
  );
}
