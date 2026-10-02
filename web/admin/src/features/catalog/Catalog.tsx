import { useReportSaveStatus } from "../../app/save-status";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router";
import { useLocale } from "../../app/locale";
import { Dialog } from "../../components/Dialog";
import { ApiError, post } from "../../services/api";
import { useResource } from "../../services/resource";
import {
  validateCommandTrigger,
  validateCommandAliasesText,
  validateCommandAliasesAgainstTrigger,
  parseCommandAliasesText,
  validateAwardPoints,
  formatCommandAliasesForEditor,
} from "../audience/viewer-model";
import { buildCommandPayload, normalizeCommandAction } from "./command-model";
import { readCatalogMediaFromRecord } from "./media-model";
import { CommandFields, AwardFields } from "./Fields";
import { useMedia } from "./useMedia";
import type { CatalogRecord, CatalogDraft } from "./types";
type Kind = "commands" | "awards";
const fresh = { id: "" };
export function toDraft(record: CatalogRecord, kind: Kind): CatalogDraft {
  const media = readCatalogMediaFromRecord(record);
  return {
    name: record.name || "",
    points: String(record.points ?? (kind === "commands" ? 25 : 10)),
    trigger: record.trigger || "",
    aliases: formatCommandAliasesForEditor(record.aliases),
    action: normalizeCommandAction(record.action),
    enabled: record.enabled ?? true,
    cooldown_seconds: String(record.cooldown_seconds ?? 30),
    award_id: record.award_id || "",
    splash_template: record.splash_template || "",
    sound: record.sound || "",
    duration_ms: String(record.duration_ms ?? 5000),
    image_asset: media.imageAsset,
    sound_file: media.soundFile,
    sound_volume: String(media.soundVolume),
    image_fit: media.imageFit,
    image_size_pct: String(media.imageSizePct),
    layout: media.layout,
  };
}
export function Catalog({ kind }: { kind: Kind }) {
  const { t } = useLocale();
  const resource = useResource<Record<Kind, CatalogRecord[]>>("/api/" + kind);
  const catalog = resource.data?.[kind] ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLLIElement>());
  const activeID = selected ?? catalog[0]?.id ?? "";
  const record =
    activeID === "__new__"
      ? fresh
      : catalog.find((item) => item.id === activeID);
  useReportSaveStatus(dirty, busy);
  const blocker = useBlocker(dirty || busy);
  const select = (id: string, focus = true) => {
    if (busy) return;
    if (id !== activeID && dirty) {
      setPendingSelection(id);
      return;
    }
    setSelected(id);
    requestAnimationFrame(() => {
      if (focus) refs.current.get(id)?.focus();
      if (matchMedia("(max-width: 1023px)").matches)
        document
          .getElementById(kind + "-editor")
          ?.scrollIntoView({ block: "start" });
      if (id === "__new__")
        document
          .getElementById(
            kind === "commands" ? "command-trigger-input" : "award-name-input",
          )
          ?.focus();
    });
  };
  const onState = useCallback((nextDirty: boolean, nextBusy: boolean) => {
    setDirty(nextDirty);
    setBusy(nextBusy);
  }, []);
  const saved = (value: CatalogRecord) => {
    const entries = catalog.some((item) => item.id === value.id)
      ? catalog.map((item) => (item.id === value.id ? value : item))
      : [...catalog, value];
    resource.receive({ ...resource.data, [kind]: entries } as Record<
      Kind,
      CatalogRecord[]
    >);
    setSelected(value.id);
    setRevision((value) => value + 1);
    setDirty(false);
    setBusy(false);
    void resource.refresh();
  };
  const deleted = (id: string) => {
    const index = catalog.findIndex((item) => item.id === id);
    const remaining = catalog.filter((item) => item.id !== id);
    const next = remaining[Math.min(index, remaining.length - 1)]?.id ?? null;
    resource.receive({ ...resource.data, [kind]: remaining } as Record<
      Kind,
      CatalogRecord[]
    >);
    setSelected(next);
    setRevision((value) => value + 1);
    setDirty(false);
    setBusy(false);
    requestAnimationFrame(() => {
      if (next) refs.current.get(next)?.focus();
      else document.getElementById(kind + "-create-button")?.focus();
    });
  };
  const discard = () => {
    setDirty(false);
    if (pendingSelection !== null) {
      const next = pendingSelection;
      setPendingSelection(null);
      setSelected(next);
    } else if (blocker.state === "blocked") blocker.proceed();
  };
  const cancel = () => {
    setPendingSelection(null);
    if (blocker.state === "blocked") blocker.reset();
  };
  return (
    <div className="audience-catalog-layout">
      <section
        id={`${kind}-list-region`}
        className="audience-catalog-list"
        aria-labelledby={`${kind}-list-heading`}
        aria-busy={resource.loading}
      >
        <header className="audience-catalog-list__header">
          <h2
            id={`${kind}-list-heading`}
            className="audience-catalog-list__title"
          >
            {t(kind + ".listHeading")}
          </h2>
          <button
            id={`${kind}-create-button`}
            className="btn-physical btn-small"
            disabled={busy}
            onClick={() => select("__new__", false)}
          >
            {t("catalog.create")}
          </button>
        </header>
        <div className="audience-catalog-list__body">
          <ul
            id={`${kind}-list`}
            className="audience-catalog-items"
            role="listbox"
            aria-labelledby={`${kind}-list-heading`}
            hidden={!catalog.length && !!resource.data}
          >
            {catalog.map((item, index) => (
              <li
                key={item.id}
                ref={(node) => {
                  if (node) refs.current.set(item.id, node);
                  else refs.current.delete(item.id);
                }}
                role="option"
                className={
                  "audience-catalog-items__item" +
                  (item.id === activeID
                    ? " audience-catalog-items__item--selected"
                    : "")
                }
                aria-selected={item.id === activeID}
                tabIndex={item.id === activeID ? 0 : -1}
                data-command-id={kind === "commands" ? item.id : undefined}
                data-award-id={kind === "awards" ? item.id : undefined}
                onClick={() => select(item.id)}
                onKeyDown={(event) => {
                  if (
                    ![
                      "ArrowUp",
                      "ArrowDown",
                      "Home",
                      "End",
                      "Enter",
                      " ",
                    ].includes(event.key)
                  )
                    return;
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? catalog.length - 1
                        : event.key === "ArrowDown"
                          ? Math.min(catalog.length - 1, index + 1)
                          : event.key === "ArrowUp"
                            ? Math.max(0, index - 1)
                            : index;
                  select(catalog[next].id);
                }}
              >
                {kind === "commands" ? (
                  <>
                    <div className="audience-catalog-items__label">
                      <span className="audience-catalog-items__primary">
                        !{item.trigger}
                      </span>
                      {!!item.aliases?.length && (
                        <span className="audience-catalog-items__aliases">
                          {item.aliases.map((alias) => "!" + alias).join(", ")}
                        </span>
                      )}
                    </div>
                    <span className="audience-catalog-items__meta">
                      {t(
                        "commands.action" +
                          ({
                            show_leaderboard: "Leaderboard",
                            like: "Like",
                            buff: "Buff",
                            alert: "Alert",
                          }[item.action || "alert"] ?? "Alert") +
                          "Short",
                      )}{" "}
                      ·{" "}
                      {t(
                        item.enabled
                          ? "commands.enabledShort"
                          : "commands.disabledShort",
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="audience-catalog-items__primary">
                      {item.name}
                    </span>
                    <span className="audience-catalog-items__meta">
                      {t("awards.pointsShort", { points: item.points || 0 })}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
          {!catalog.length && resource.data && !resource.error && (
            <div
              id={`${kind}-list-empty`}
              className="empty-state audience-region-empty"
            >
              <p className="audience-region-empty__message">
                {t(kind + ".empty")}
              </p>
              <button
                id={`${kind}-empty-create`}
                className="btn-physical btn-small"
                onClick={() => select("__new__", false)}
              >
                {t("catalog.create")}
              </button>
            </div>
          )}
          {resource.loading && !resource.data && (
            <p className="empty-state">{t("state.loading")}</p>
          )}
          {resource.error && (
            <div
              id={`${kind}-list-error`}
              className="notice notice--error audience-region-error"
            >
              <p className="notice__body">{resource.error.message}</p>
              <button
                className="state-retry btn-physical btn-small"
                onClick={() => void resource.refresh()}
              >
                {t("state.retry")}
              </button>
            </div>
          )}
        </div>
      </section>
      {record ? (
        <Editor
          key={`${activeID}:${revision}`}
          kind={kind}
          record={record}
          onSaved={saved}
          onDeleted={deleted}
          onState={onState}
        />
      ) : (
        <aside
          id={`${kind}-editor`}
          className="audience-catalog-editor"
          aria-labelledby={`${kind}-editor-heading`}
        >
          <header className="audience-catalog-editor__header">
            <h2
              id={`${kind}-editor-heading`}
              className="audience-catalog-editor__title"
            >
              {t(kind + ".editorHeading")}
            </h2>
            <div className="audience-catalog-editor__actions">
              <button className="btn-physical btn-small" disabled>
                {t("catalog.save")}
              </button>
              <button className="btn-physical btn-danger btn-small" disabled>
                {t("catalog.delete")}
              </button>
            </div>
          </header>
          <p
            id={`${kind}-editor-empty`}
            className="empty-state audience-catalog-editor__empty"
          >
            {t(kind + ".selectOrCreate")}
          </p>
        </aside>
      )}
      <Dialog
        id="discard-changes-dialog"
        className="prompt-dialog"
        open={pendingSelection !== null || blocker.state === "blocked"}
        title={t("dialog.discardUnsavedTitle")}
        onClose={cancel}
        actions={
          <>
            <button
              id="discard-changes-cancel"
              className="btn-physical"
              onClick={cancel}
            >
              {t("dialog.keepEditing")}
            </button>
            <button
              id="discard-changes-confirm"
              className="btn-physical btn-danger"
              disabled={busy}
              onClick={discard}
            >
              {t("dialog.discardChanges")}
            </button>
          </>
        }
      >
        <p>{t("settings.discardConfirm")}</p>
      </Dialog>
    </div>
  );
}
function Editor({
  kind,
  record,
  onSaved,
  onDeleted,
  onState,
}: {
  kind: Kind;
  record: CatalogRecord;
  onSaved: (record: CatalogRecord) => void;
  onDeleted: (id: string) => void;
  onState: (dirty: boolean, busy: boolean) => void;
}) {
  const { t } = useLocale();
  const [baseline] = useState(() => toDraft(record, kind));
  const [draft, setDraft] = useState(baseline);
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(false);
  const inFlight = useRef(false);
  const awards = useResource<{ awards: { id: string; name: string }[] }>(
    kind === "commands" ? "/api/awards" : null,
  );
  const change = (key: keyof CatalogDraft, value: string | boolean) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
    setError("");
  };
  const media = useMedia(record, draft, change, (key, message) =>
    setErrors((previous) => ({ ...previous, [key]: message })),
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => {
    onState(dirty, busy || media.uploading);
  }, [dirty, busy, media.uploading, onState]);
  const focusError = (fields: Record<string, string>) =>
    requestAnimationFrame(() => {
      const form = document.getElementById(kind + "-editor-form");
      const first = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
      if (Object.values(fields).some(Boolean)) first?.focus();
    });
  const save = async () => {
    if (inFlight.current || media.uploading) return;
    const fields: Record<string, string> = {};
    if (kind === "commands") {
      const trigger = validateCommandTrigger(draft.trigger);
      if (trigger) fields.trigger = t(trigger);
      const aliases =
        validateCommandAliasesText(draft.aliases) ||
        validateCommandAliasesAgainstTrigger(draft.aliases, draft.trigger);
      if (aliases) fields.aliases = t(aliases);
      if (draft.action === "like" && !draft.award_id)
        fields.award_id = t("commands.likeAwardRequired");
      if (
        draft.action === "buff" &&
        (!Number.isFinite(Number(draft.points)) ||
          Number(draft.points) < 1 ||
          Number(draft.points) > 1000)
      )
        fields.points = t("commands.buffPointsInvalid");
    } else {
      if (!draft.name.trim()) fields.name = t("awards.nameRequired");
      const points = validateAwardPoints(Number(draft.points));
      if (points) fields.points = t(points);
    }
    if (
      (kind === "awards" || draft.action === "alert") &&
      !draft.splash_template.trim()
    )
      fields.splash_template = t("catalog.splashRequired");
    setErrors(fields);
    setError("");
    if (Object.keys(fields).length) {
      focusError(fields);
      return;
    }
    const presentation = {
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
    const payload =
      kind === "commands"
        ? buildCommandPayload(
            {
              trigger: draft.trigger,
              aliases: parseCommandAliasesText(draft.aliases),
              enabled: draft.enabled,
              action: draft.action,
              cooldown_seconds: Number(draft.cooldown_seconds),
              award_id: draft.award_id,
              points: Number(draft.points),
            },
            presentation,
          )
        : { name: draft.name, points: Number(draft.points), ...presentation };
    inFlight.current = true;
    setBusy(true);
    try {
      const saved = await post<CatalogRecord>(
        "/api/" + kind + (record.id ? "/update" : "/create"),
        { ...payload, ...(record.id ? { id: record.id } : {}) },
      );
      media.commit(saved);
      onSaved(saved);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setErrors(cause.fields);
        focusError(cause.fields);
      }
      setError(
        cause instanceof Error ? cause.message : t("catalog.saveFailed"),
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const remove = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await post("/api/" + kind + "/delete", { id: record.id });
      media.release();
      onDeleted(record.id);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("catalog.deleteFailed"),
      );
      setDeleting(false);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const Fields = kind === "commands" ? CommandFields : AwardFields;
  return (
    <aside
      id={`${kind}-editor`}
      className="audience-catalog-editor"
      aria-labelledby={`${kind}-editor-heading`}
    >
      <header className="audience-catalog-editor__header">
        <h2
          id={`${kind}-editor-heading`}
          className="audience-catalog-editor__title"
        >
          {t(kind + ".editorHeading")}
        </h2>
        <div className="audience-catalog-editor__actions">
          <button
            id={`${kind}-save-button`}
            className="btn-physical btn-small"
            type="submit"
            form={`${kind}-editor-form`}
            disabled={busy || media.uploading}
          >
            {t("catalog.save")}
          </button>
          <button
            id={`${kind}-delete-button`}
            className="btn-physical btn-danger btn-small"
            disabled={busy || media.uploading || !record.id}
            onClick={() => setDeleting(true)}
          >
            {t("catalog.delete")}
          </button>
        </div>
      </header>
      <p
        id={`${kind}-editor-status`}
        className="catalog-editor-status notice notice--error"
        role="alert"
        aria-live="polite"
        hidden={!error}
      >
        {error}
      </p>
      <Fields
        draft={draft}
        errors={errors}
        busy={busy || media.uploading}
        identifier={
          kind === "commands"
            ? draft.trigger || record.id
            : record.id || draft.name
        }
        awards={awards.data?.awards ?? []}
        change={change}
        media={media}
        onSubmit={() => void save()}
      />
      <Dialog
        id="catalog-delete-prompt"
        className="prompt-dialog"
        open={deleting}
        onClose={() => {
          if (!busy) setDeleting(false);
        }}
        title={t("catalog.delete")}
        actions={
          <>
            <button
              id="catalog-delete-cancel"
              className="btn-physical"
              disabled={busy}
              onClick={() => setDeleting(false)}
            >
              {t("dialog.cancel")}
            </button>
            <button
              id="catalog-delete-confirm"
              className="btn-physical btn-danger"
              disabled={busy}
              onClick={() => void remove()}
            >
              {t("catalog.delete")}
            </button>
          </>
        }
      >
        <p id="catalog-delete-prompt-message">
          {t("catalog.deleteMessage", {
            name:
              kind === "commands"
                ? "!" + record.trigger
                : record.name || record.id,
          })}
        </p>
      </Dialog>
    </aside>
  );
}
