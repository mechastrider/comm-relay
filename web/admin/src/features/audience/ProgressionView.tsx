import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { useLocale } from "../../app/locale";
import { ProgressionLevelFields } from "./ProgressionLevelFields";
import { ProgressionAchievementFields } from "./ProgressionAchievementFields";
import { ProgressionAlertFields } from "./ProgressionAlertFields";
import type { ProgressionFieldProps } from "./progression-fields";
import type { Group } from "./progression-model";

export function ProgressionView(
  props: ProgressionFieldProps & {
    baseline: boolean;
    action: (id: string) => void;
    catalog: "level" | "achievement";
    editorOpen: boolean;
    settingsOpen: boolean;
    switchCatalog: (catalog: "level" | "achievement") => void;
    back: () => void;
    openSettings: () => void;
    closeSettings: () => void;
    levelList: ReactNode;
    achievementList: ReactNode;
    achievementsEmpty: boolean;
    condition: string;
    status: string;
    statusGroup: Group | "maintenance";
    statusError: boolean;
    resourceStatus: string;
    failed: boolean;
    subjectOptions: { id: string; label: string }[];
    subjectLoading: boolean;
    subjectError: boolean;
    retrySubjects: () => void;
  },
) {
  const { t } = useLocale();
  const toolbar = useRef<HTMLDivElement>(null);
  const editorHeader = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = toolbar.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      node.parentElement?.style.setProperty(
        "--progression-toolbar-height",
        `${node.getBoundingClientRect().height}px`,
      );
      node.parentElement?.style.setProperty(
        "--progression-editor-header-height",
        `${editorHeader.current?.getBoundingClientRect().height ?? 0}px`,
      );
    });
    observer.observe(node);
    if (editorHeader.current) observer.observe(editorHeader.current);
    return () => observer.disconnect();
  }, []);
  const { values, errors, busy, change, action, catalog } = props;
  const isLevel = catalog === "level";
  const heading = t(
    isLevel ? "progression.levels" : "progression.achievements",
  );
  const feedback = (group: Group | "maintenance") =>
    props.statusGroup === group && props.status ? (
      <p
        id={
          group === "settings"
            ? "progression-settings-status"
            : group === "maintenance"
              ? "progression-maintenance-status"
              : "progression-status"
        }
        className={
          "progression-feedback notice" +
          (props.statusError ? " notice--error" : "")
        }
        role={props.statusError ? "alert" : "status"}
      >
        {props.status}
      </p>
    ) : null;
  return (
    <div
      className={
        "progression-workspace" +
        (props.editorOpen ? " progression-workspace--editing" : "")
      }
    >
      <div ref={toolbar} className="progression-toolbar">
        <div
          className="progression-switch"
          role="group"
          aria-label={t("progression.catalogs")}
        >
          {(["level", "achievement"] as const).map((kind) => (
            <Button
              key={kind}
              id={`progression-${kind}-tab`}
              aria-pressed={catalog === kind}
              disabled={busy}
              onClick={() => props.switchCatalog(kind)}
            >
              {t(
                kind === "level"
                  ? "progression.levels"
                  : "progression.achievements",
              )}
            </Button>
          ))}
        </div>
        <Button
          id="progression-alerts-open"
          disabled={busy}
          onClick={props.openSettings}
        >
          {t("progression.alertsButton")}
        </Button>
      </div>
      {props.resourceStatus && (
        <div
          className="progression-load-status"
          role={props.failed ? "alert" : "status"}
        >
          <span>{props.resourceStatus}</span>
          {props.failed && (
            <Button
              id="progression-retry"
              disabled={busy}
              onClick={() => action("progression-retry")}
            >
              {t("state.retry")}
            </Button>
          )}
        </div>
      )}
      <div className="audience-catalog-layout progression-catalog-layout">
        <section
          className="audience-catalog-list"
          aria-labelledby={`progression-${catalog}s-heading`}
        >
          <header className="audience-catalog-list__header">
            <h2
              id={`progression-${catalog}s-heading`}
              className="audience-catalog-list__title"
            >
              {heading}
            </h2>
            <Button
              id={`progression-${catalog}-new`}
              disabled={busy}
              onClick={() => action(`progression-${catalog}-new`)}
            >
              {t("catalog.create")}
            </Button>
          </header>
          <div className="audience-catalog-list__body">
            {!isLevel && (
              <div className="progression-filters">
                <label htmlFor="progression-achievement-search">
                  {t("progression.search")}
                </label>
                <input
                  id="progression-achievement-search"
                  type="search"
                  maxLength={128}
                  value={String(values["progression-achievement-search"] ?? "")}
                  disabled={busy}
                  placeholder={t("progression.searchPlaceholder")}
                  onChange={(event) =>
                    change("progression-achievement-search", event.target.value)
                  }
                />
                <label htmlFor="progression-achievement-filter">
                  {t("progression.filter")}
                </label>
                <select
                  id="progression-achievement-filter"
                  disabled={busy}
                  value={String(
                    values["progression-achievement-filter"] ?? "all",
                  )}
                  onChange={(event) =>
                    change("progression-achievement-filter", event.target.value)
                  }
                >
                  {[
                    ["all", "filterAll"],
                    ["enabled", "filterEnabled"],
                    ["disabled", "filterDisabled"],
                    ["secret", "filterSecret"],
                    ["repeatable", "filterRepeatable"],
                  ].map(([value, key]) => (
                    <option key={value} value={value}>
                      {t("progression." + key)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <ul
              id={`progression-${catalog}-list`}
              className="audience-catalog-items"
              role="listbox"
              aria-labelledby={`progression-${catalog}s-heading`}
              aria-busy={busy}
            >
              {isLevel ? props.levelList : props.achievementList}
            </ul>
            {!isLevel && props.achievementsEmpty && (
              <p id="progression-achievement-empty" className="field-hint">
                {t("progression.emptyAchievements")}
              </p>
            )}
          </div>
        </section>
        <aside
          className="audience-catalog-editor"
          aria-labelledby="progression-editor-heading"
        >
          <header
            ref={editorHeader}
            className="audience-catalog-editor__header"
          >
            <div className="progression-editor-title">
              <Button
                id="progression-back"
                className="progression-back"
                disabled={busy}
                onClick={props.back}
              >
                {t("progression.backToList")}
              </Button>
              <h2
                id="progression-editor-heading"
                tabIndex={-1}
                className="audience-catalog-editor__title"
              >
                {t(
                  isLevel
                    ? "progression.levelEditor"
                    : "progression.achievementEditor",
                )}
              </h2>
            </div>
            <div className="audience-catalog-editor__actions">
              <Button
                variant="primary"
                id={isLevel ? "progression-submit-1" : "progression-submit-5"}
                type="submit"
                form={`progression-${catalog}-form`}
                disabled={busy}
              >
                {t("catalog.save")}
              </Button>
              <Button
                id={`progression-${catalog}-test`}
                disabled={busy}
                onClick={() => action(`progression-${catalog}-test`)}
              >
                {t("catalog.test")}
              </Button>
              <Button
                variant="danger"
                id={`progression-${catalog}-delete`}
                disabled={
                  busy ||
                  (isLevel && props.baseline) ||
                  !values[`progression-${catalog}-id`]
                }
                onClick={() => action(`progression-${catalog}-delete`)}
              >
                {t("catalog.delete")}
              </Button>
            </div>
          </header>
          {feedback(catalog)}
          <form
            id={`progression-${catalog}-form`}
            className="audience-catalog-editor__body progression-form"
            onSubmit={(event) => {
              event.preventDefault();
              action(`progression-${catalog}-form`);
            }}
          >
            {isLevel ? (
              <ProgressionLevelFields {...props} />
            ) : (
              <ProgressionAchievementFields {...props} />
            )}
          </form>
        </aside>
      </div>
      <details className="progression-maintenance">
        <summary>{t("progression.maintenance")}</summary>
        <p className="field-hint">{t("progression.reconcileHint")}</p>
        <Button
          id="progression-reconcile"
          disabled={busy}
          onClick={() => action("progression-reconcile")}
        >
          {t("progression.reconcile")}
        </Button>
        {feedback("maintenance")}
      </details>
      <Dialog
        id="progression-alerts-dialog"
        className="settings-dialog progression-alerts-dialog"
        open={props.settingsOpen}
        onClose={props.closeSettings}
        title={t("progression.alerts")}
        actions={
          <>
            <Button
              id="progression-alerts-close"
              disabled={busy}
              onClick={props.closeSettings}
            >
              {t("progression.close")}
            </Button>
            <Button
              variant="primary"
              id="progression-submit-8"
              type="submit"
              form="progression-settings-form"
              disabled={busy}
            >
              {t("catalog.save")}
            </Button>
          </>
        }
      >
        {feedback("settings")}
        <form
          id="progression-settings-form"
          className="progression-form"
          onSubmit={(event) => {
            event.preventDefault();
            action("progression-settings-form");
          }}
        >
          <ProgressionAlertFields
            values={values}
            errors={errors}
            busy={busy}
            change={change}
          />
        </form>
      </Dialog>
    </div>
  );
}
