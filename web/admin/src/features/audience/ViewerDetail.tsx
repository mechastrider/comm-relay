import { Field } from "../../components/Field";
import { LevelBadge, ViewerAmmo } from "../../components/ViewerVisuals";
import { Button, IconButton } from "../../components/Button";
import { Fragment, useEffect, useRef, useState } from "react";
import { useLocale } from "../../app/locale";
import { useRuntime } from "../../app/runtime";
import { useResource } from "../../services/resource";
import { useMediaQuery } from "../../services/useMediaQuery";
import { post, upload } from "../../services/api";
import { Dialog, Modal } from "../../components/Dialog";
import { Portrait } from "./Portrait";
import { ViewerHistory } from "./History";
import { validateDisplayName } from "./viewer-model";
import type { Viewer } from "./viewer-types";
export function ViewerDetail({
  id,
  viewers,
  onClose,
  onChange,
  onMerged,
  onDirty,
  onBusy,
}: {
  id: string;
  viewers: Viewer[];
  onClose: () => void;
  onChange: () => void;
  onMerged: (id: string) => void;
  onDirty: (dirty: boolean) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { t } = useLocale(),
    { subscribe } = useRuntime();
  const wide = useMediaQuery("(min-width: 1024px)");
  const detail = useResource<Viewer>(
    "/api/viewers/get?id=" + encodeURIComponent(id),
  );
  const { refresh } = detail;
  const [nameDraft, setNameDraft] = useState<string | null>(null),
    [nameError, setNameError] = useState(""),
    [error, setError] = useState(""),
    [portraitError, setPortraitError] = useState(""),
    [status, setStatus] = useState("");
  const [target, setTarget] = useState(""),
    [mergeOpen, setMergeOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const pending = useRef(false),
    alive = useRef(true),
    body = useRef<HTMLDivElement>(null);
  const viewer = detail.data;
  const name = nameDraft ?? viewer?.display_name ?? "";
  useEffect(() => {
    onDirty(nameDraft !== null && nameDraft !== viewer?.display_name);
  }, [nameDraft, viewer?.display_name, onDirty]);
  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      onDirty(false);
      onBusy(false);
    };
  }, [onDirty, onBusy]);
  useEffect(
    () =>
      subscribe((frame) => {
        if (frame.type === "reconnected" || frame.type === "viewer_progression")
          void refresh();
      }),
    [subscribe, refresh],
  );
  const loaded = !!viewer;
  useEffect(() => {
    const timer = window.setInterval(() => { void refresh(); }, 4000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (loaded) body.current?.focus();
  }, [wide, id, loaded]);
  const mutate = async (
    operation: () => Promise<unknown>,
    success: string,
    after?: () => void,
  ) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await operation();
      if (!alive.current) return;
      after?.();
      onChange();
      await refresh();
      if (alive.current) setStatus(t(success));
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const portrait = async (file?: File) => {
    setPortraitError("");
    await mutate(async () => {
      try {
        if (file) {
          const form = new FormData();
          form.set("id", id);
          form.set("file", file);
          await upload("/api/viewers/avatar/upload", form);
        } else await post("/api/viewers/avatar/clear", { id });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "";
        const key = message.includes("file type is not allowed")
          ? "portraitTypeNotAllowed"
          : message.includes("too large")
            ? "portraitTooLarge"
            : message.includes("viewer not found")
              ? "portraitViewerMissing"
              : file
                ? "portraitUploadFailed"
                : "portraitClearFailed";
        if (alive.current) setPortraitError(t("viewers." + key));
        throw cause;
      }
    }, "settings.saved");
  };
  const current = viewer?.progression?.current_level ?? viewer?.current_level,
    next = viewer?.progression?.next_level;
  const prefix = wide ? "audience-inspector" : "audience-sheet";
  const shell = wide ? "audience-inspector" : "audience-detail-sheet";
  const content = (
    <>
      <header className={shell + "__header"}>
        <h2 id={prefix + "-heading"} className={shell + "__title"}>
          {t("audience.detailHeading")}
        </h2>
        <IconButton
          id={prefix + "-close"}
          className={"icon-btn has-tooltip " + shell + "__close"}
          aria-label={t("audience.closeDetail")}
          disabled={busy}
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
          <span className="ui-tooltip" role="tooltip">
            {t("audience.closeDetail")}
          </span>
        </IconButton>
      </header>
      <div
        ref={body}
        id={prefix + "-body"}
        className={shell + "__body"}
        tabIndex={-1}
      >
        {detail.loading && !viewer && (
          <p id={prefix + "-loading"} className={shell + "__loading"}>
            {t("state.loading")}
          </p>
        )}
        {detail.error && (
          <div
            id={prefix + "-error"}
            className={"notice notice--error " + shell + "__error"}
            role="alert"
          >
            <p>{detail.error.message}</p>
            <Button
              className="btn-small"
              onClick={() => void refresh()}
            >
              {t("state.retry")}
            </Button>
          </div>
        )}
        {viewer && (
          <>
            <div className="audience-detail__portrait-section">
              <Portrait
                url={viewer.avatar_url}
                name={viewer.display_name}
                className="audience-detail__portrait"
              />
              <Field className="audience-detail__portrait-field">
                <label htmlFor="viewer-portrait-file">
                  {t("viewers.portraitUpload")}
                </label>
                <input
                  id="viewer-portrait-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="audience-detail__portrait-input"
                  disabled={busy}
                  aria-describedby={
                    portraitError ? "viewer-portrait-error" : undefined
                  }
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void portrait(file);
                  }}
                />
                {portraitError && (
                  <p
                    id="viewer-portrait-error"
                    className="field-error"
                    role="alert"
                  >
                    {portraitError}
                  </p>
                )}
                <div className="audience-detail__portrait-actions">
                  {viewer.custom_avatar && (
                    <Button
                      className="btn-small"
                      disabled={busy}
                      onClick={() => void portrait()}
                    >
                      {t("viewers.portraitClear")}
                    </Button>
                  )}
                </div>
              </Field>
            </div>
            <h3 className="audience-detail__title">
              {viewer.display_name || t("viewers.unnamed")}
            </h3>
            <dl className="audience-detail__stats">
              {(["Session", "Day", "All"] as const).map((label, index) => (
                <Fragment key={label}>
                  <dt>{t("viewers.period" + label)}</dt>
                  <dd>
                    {t("viewers.statLine", {
                      score:
                        [viewer.session_xp, viewer.day_xp, viewer.xp][index] ||
                        0,
                      messages:
                        [
                          viewer.session_message_count,
                          viewer.day_message_count,
                          viewer.message_count,
                        ][index] || 0,
                    })}
                  </dd>
                </Fragment>
              ))}
              <dt>{t("viewers.statStreams")}</dt>
              <dd>{viewer.session_count || 0}</dd>
            </dl>
            <section className="audience-detail__progression">
              <LevelBadge level={current} />
              <h4 className="audience-detail__subheading">
                {t("viewers.progressionHeading")}
              </h4>
              <p className="field-hint">
                {current && next
                  ? t("viewers.progressionNext", {
                      current: current.title,
                      next: next.title,
                      remaining: Math.max(0, Number(next.min_xp) - viewer.xp),
                    })
                  : current
                    ? t("viewers.progressionMax", { current: current.title })
                    : t("viewers.progressionNone")}
              </p>
              {!!viewer.progression?.achievements?.length && (
                <ul className="audience-detail__identities">
                  {viewer.progression.achievements.map((item) => (
                    <li key={item.achievement.id}>
                      {item.achievement.name +
                        " · " +
                        (item.value || 0) +
                        "/" +
                        (item.achievement.revision?.target || 0) +
                        (item.occurrences > 1 ? " ×" + item.occurrences : "")}
                    </li>
                  ))}
                </ul>
              )}
              {viewer.visual_status && !detail.error && <div>
                <p className="field-hint">{t("viewerVisual.session")}</p>
                <ViewerAmmo status={viewer.visual_status} />
              </div>}
            </section>
            <ViewerHistory viewerID={id} />
            <form
              className="form__field audience-detail__name-field"
              onSubmit={(event) => {
                event.preventDefault();
                const key = validateDisplayName(name);
                if (key) {
                  setNameError(t(key));
                  document.getElementById("viewer-display-name")?.focus();
                  return;
                }
                void mutate(
                  () =>
                    post("/api/viewers/update", {
                      id,
                      display_name: name.trim(),
                    }),
                  "viewers.nameSaved",
                  () => setNameDraft(null),
                );
              }}
            >
              <label htmlFor="viewer-display-name">
                {t("viewers.displayName")}
              </label>
              <input
                id="viewer-display-name"
                type="text"
                maxLength={128}
                value={name}
                disabled={busy}
                aria-invalid={!!nameError}
                aria-describedby={
                  nameError ? "viewer-display-name-error" : undefined
                }
                onChange={(event) => {
                  setNameDraft(event.target.value);
                  setNameError("");
                }}
              />
              {nameError && (
                <p
                  id="viewer-display-name-error"
                  className="field-error"
                  role="alert"
                >
                  {nameError}
                </p>
              )}
              <Button className="btn-small" disabled={busy}>
                {t("viewers.saveName")}
              </Button>
            </form>
            {(
              [
                {
                  key: "leaderboard_hidden",
                  dom: "leaderboard-hidden",
                  label: "viewers.leaderboardHide",
                  saved: "viewers.leaderboardHideSaved",
                },
                {
                  key: "greetings_disabled",
                  dom: "greetings-disabled",
                  label: "greetings.exclude",
                  saved: "greetings.excludeSaved",
                  hint: "greetings.excludeHint",
                },
                {
                  key: "progression_alerts_disabled",
                  dom: "progression-alerts-disabled",
                  label: "viewers.progressionAlertsExclude",
                  saved: "viewers.progressionAlertsSaved",
                },
              ] as const
            ).map((field) => (
              <Field
                key={field.key}
                className="audience-detail__hide-field"
              >
                <label htmlFor={"viewer-" + field.dom}>
                  <input
                    id={"viewer-" + field.dom}
                    type="checkbox"
                    checked={!!viewer[field.key]}
                    disabled={busy}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      detail.receive({ ...viewer, [field.key]: checked });
                      void mutate(async () => {
                        try {
                          await post("/api/viewers/update", {
                            id,
                            [field.key]: checked,
                          });
                        } catch (cause) {
                          if (alive.current) detail.receive(viewer);
                          throw cause;
                        }
                      }, field.saved);
                    }}
                  />
                  {t(field.label)}
                </label>
                {"hint" in field && (
                  <p className="field-hint">{t(field.hint)}</p>
                )}
              </Field>
            ))}
            <h4 className="audience-detail__subheading">
              {t("viewers.identities")}
            </h4>
            <ul className="audience-detail__identities">
              {viewer.identities?.length ? (
                viewer.identities.map((identity) => (
                  <li
                    key={identity.platform + ":" + identity.user_id}
                    title={identity.display_name || identity.username}
                  >
                    {t("viewers.identityLine", {
                      platform: t("platform." + identity.platform),
                      name:
                        identity.display_name ||
                        identity.username ||
                        identity.user_id,
                    })}
                  </li>
                ))
              ) : (
                <li>{t("viewers.noIdentities")}</li>
              )}
            </ul>
            <Field className="audience-detail__merge">
              <label htmlFor="viewer-merge-target">
                {t("viewers.mergeInto")}
              </label>
              <select
                id="viewer-merge-target"
                value={target}
                disabled={busy}
                onChange={(event) => setTarget(event.target.value)}
              >
                <option value="">{t("viewers.mergeSelect")}</option>
                {viewers
                  .filter((row) => row.id !== id)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.display_name}
                    </option>
                  ))}
              </select>
              <Button
                className="btn-small"
                disabled={busy}
                onClick={() => {
                  if (!target) {
                    setError(t("viewers.mergePickTarget"));
                    document.getElementById("viewer-merge-target")?.focus();
                  } else setMergeOpen(true);
                }}
              >
                {t("viewers.mergeConfirm")}
              </Button>
            </Field>
            {error && (
              <p className="notice notice--error" role="alert">
                {error}
              </p>
            )}
            {status && <p role="status">{status}</p>}
          </>
        )}
      </div>
    </>
  );
  return (
    <>
      {wide ? (
        <aside
          id="audience-inspector"
          className="audience-inspector"
          aria-labelledby="audience-inspector-heading"
        >
          {content}
        </aside>
      ) : (
        <Modal
          id="audience-detail-sheet"
          className="audience-detail-sheet"
          labelledBy="audience-sheet-heading"
          open
          onClose={() => {
            if (!pending.current) onClose();
          }}
        >
          <div className="audience-detail-sheet__frame">{content}</div>
        </Modal>
      )}
      <Dialog
        id="viewer-merge-prompt"
        className="prompt-dialog"
        open={mergeOpen}
        onClose={() => {
          if (!pending.current) setMergeOpen(false);
        }}
        title={t("audience.mergeTitle")}
        actions={
          <>
            <Button
              id="viewer-merge-prompt-cancel"
              disabled={busy}
              onClick={() => setMergeOpen(false)}
            >
              {t("dialog.cancel")}
            </Button>
            <Button variant="danger"
              id="viewer-merge-prompt-confirm"
              disabled={busy}
              onClick={() =>
                void mutate(
                  () =>
                    post("/api/viewers/merge", {
                      from_id: id,
                      into_id: target,
                    }),
                  "viewers.mergeDone",
                  () => {
                    setMergeOpen(false);
                    onMerged(target);
                  },
                )
              }
            >
              {t("viewers.mergeConfirm")}
            </Button>
          </>
        }
      >
        <p>
          {t("audience.mergeMessage", {
            from: viewer?.display_name ?? "",
            into: viewers.find((row) => row.id === target)?.display_name ?? "",
          })}
        </p>
        {error && <p role="alert">{error}</p>}
      </Dialog>
    </>
  );
}
