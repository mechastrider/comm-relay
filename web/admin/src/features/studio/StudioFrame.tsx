import type { ReactNode, KeyboardEvent } from "react";
import { useLocale } from "../../app/locale";
import type { Surface } from "./model";
export function StudioFrame({
  mode,
  collapsed,
  surface,
  busy,
  dirty,
  canActivate,
  action,
  preview,
  inspector,
  surfaceKey,
  setupCompleted,
}: {
  setupCompleted: boolean;
  mode: string;
  collapsed: boolean;
  surface: Surface;
  busy: boolean;
  dirty: boolean;
  canActivate: boolean;
  action: (id: string) => void;
  preview: ReactNode;
  inspector: ReactNode;
  surfaceKey: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const { t } = useLocale();
  return (
    <section
      id="workspace-studio"
      data-workspace="studio"
      aria-labelledby="workspace-studio-heading"
      data-studio-mode={mode}
      className={
        "workspace studio-workspace workspace--active" +
        (collapsed ? " studio-surface-rail--collapsed" : "")
      }
    >
      <header className="studio-toolbar">
        <div className="studio-toolbar__identity">
          <h1
            id="workspace-studio-heading"
            className="studio-toolbar__title workspace-heading"
            tabIndex={-1}
            data-i18n="workspace.studioHeading"
          >
            {t("workspace.studioHeading")}
          </h1>
          <div
            className="studio-mode-switch"
            role="group"
            data-i18n-aria-label="studio.modeLabel"
            aria-label={t("studio.modeLabel")}
          >
            <button
              id="studio-mode-essentials"
              className="studio-mode-switch__button"
              type="button"
              data-studio-mode="essentials"
              data-i18n="studio.modeEssentials"
              aria-pressed={mode === "essentials"}
              onClick={() => action("studio-mode-essentials")}
            >
              {t("studio.modeEssentials")}
            </button>
            <button
              id="studio-mode-all"
              className="studio-mode-switch__button"
              type="button"
              data-studio-mode="all"
              data-i18n="studio.modeAll"
              aria-pressed={mode === "all"}
              onClick={() => action("studio-mode-all")}
            >
              {t("studio.modeAll")}
            </button>
          </div>
        </div>
        <div className="studio-toolbar__actions">
          <span
            id="studio-dirty-status"
            role="status"
            aria-live="polite"
            className={
              "studio-dirty-status" +
              (dirty ? " studio-dirty-status--dirty" : "")
            }
          >
            {t(dirty ? "studio.dirty" : "studio.published")}
          </span>
          <span
            id="studio-use-on-stream-hint"
            className="studio-activation-hint"
            data-i18n="studio.publishBeforeUse"
            hidden={!canActivate || !dirty}
          >
            {t("studio.publishBeforeUse")}
          </span>
          <button
            id="studio-use-on-stream"
            className="btn-physical btn-secondary studio-use-on-stream"
            type="button"
            aria-describedby="studio-use-on-stream-hint"
            data-i18n="studio.useOnStream"
            hidden={!canActivate}
            disabled={busy || dirty}
            onClick={() => action("activate")}
          >
            {t("studio.useOnStream")}
          </button>
          <button
            id="studio-publish"
            className="btn-physical btn-start"
            type="button"
            data-i18n="studio.publish"
            disabled={busy || !dirty}
            onClick={() => action("publish")}
            aria-busy={busy}
          >
            {t("studio.publish")}
          </button>
        </div>
      </header>
      <div className="studio-layout">
        <div
          id="studio-sources-mount"
          className="studio-column studio-sources-mount"
          data-studio-overlay=""
        >
          <div className="studio-surface-list__header">
            <p
              className="studio-surface-list__label obs-source-group-label"
              data-i18n="obs.sourcesOnStream"
            >
              {t("obs.sourcesOnStream")}
            </p>
            <button
              id="studio-surface-collapse"
              className="icon-btn has-tooltip studio-surface-collapse"
              type="button"
              aria-controls="studio-surface-list"
              data-i18n-aria-label="studio.collapseSurfaces"
              aria-expanded={!collapsed}
              onClick={() => action("collapse")}
              aria-label={t("studio.collapseSurfaces")}
            >
              <svg
                className="icon-btn__icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="m14 7-5 5 5 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
              <span
                className="ui-tooltip"
                role="tooltip"
                data-i18n="studio.collapseSurfaces"
              >
                {t("studio.collapseSurfaces")}
              </span>
            </button>
          </div>
          <nav
            id="studio-surface-list"
            className="studio-surface-list"
            data-i18n-aria-label="obs.previewSurface"
            aria-label={t("obs.previewSurface")}
          >
            <button
              id="studio-surface-chat"
              className="studio-surface-item obs-source-item has-tooltip"
              type="button"
              data-obs-preview-surface="chat"
              data-i18n-aria-label="obs.surfaceChat"
              aria-pressed={surface === "chat"}
              tabIndex={surface === "chat" ? 0 : -1}
              onClick={() => action("studio-surface-chat")}
              onKeyDown={(event) => surfaceKey(event)}
              aria-label={t("obs.surfaceChat")}
            >
              <svg
                className="studio-surface-item__icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M5 5h14v10H9l-4 4V5Z" strokeLinejoin="round"></path>
                <path d="M8 9h8M8 12h5" strokeLinecap="round"></path>
              </svg>
              <span className="studio-surface-item__copy">
                <span data-i18n="obs.surfaceChat">{t("obs.surfaceChat")}</span>
                <small>{"/overlay"}</small>
              </span>
              <span
                className="ui-tooltip"
                role="tooltip"
                data-i18n="obs.surfaceChat"
              >
                {t("obs.surfaceChat")}
              </span>
            </button>
            <button
              id="studio-surface-leaderboard"
              className="studio-surface-item obs-source-item has-tooltip"
              type="button"
              data-obs-preview-surface="leaderboard"
              data-i18n-aria-label="obs.surfaceLeaderboard"
              aria-pressed={surface === "leaderboard"}
              tabIndex={surface === "leaderboard" ? 0 : -1}
              onClick={() => action("studio-surface-leaderboard")}
              onKeyDown={(event) => surfaceKey(event)}
              aria-label={t("obs.surfaceLeaderboard")}
            >
              <svg
                className="studio-surface-item__icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path
                  d="M5 19V9h4v10M10 19V5h4v14M15 19v-7h4v7"
                  strokeLinejoin="round"
                ></path>
                <path d="M3 19h18" strokeLinecap="round"></path>
              </svg>
              <span className="studio-surface-item__copy">
                <span data-i18n="obs.surfaceLeaderboard">
                  {t("obs.surfaceLeaderboard")}
                </span>
                <small>{"/overlay/leaderboard"}</small>
              </span>
              <span
                className="ui-tooltip"
                role="tooltip"
                data-i18n="obs.surfaceLeaderboard"
              >
                {t("obs.surfaceLeaderboard")}
              </span>
            </button>
            <button
              id="studio-surface-alerts"
              className="studio-surface-item obs-source-item has-tooltip"
              type="button"
              data-obs-preview-surface="alerts"
              data-i18n-aria-label="obs.surfaceAlerts"
              aria-pressed={surface === "alerts"}
              tabIndex={surface === "alerts" ? 0 : -1}
              onClick={() => action("studio-surface-alerts")}
              onKeyDown={(event) => surfaceKey(event)}
              aria-label={t("obs.surfaceAlerts")}
            >
              <svg
                className="studio-surface-item__icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path
                  d="M12 4a5 5 0 0 0-5 5v3l-2 3h14l-2-3V9a5 5 0 0 0-5-5Z"
                  strokeLinejoin="round"
                ></path>
                <path d="M10 18h4" strokeLinecap="round"></path>
              </svg>
              <span className="studio-surface-item__copy">
                <span data-i18n="obs.surfaceAlerts">
                  {t("obs.surfaceAlerts")}
                </span>
                <small>{"/overlay/alert"}</small>
              </span>
              <span
                className="ui-tooltip"
                role="tooltip"
                data-i18n="obs.surfaceAlerts"
              >
                {t("obs.surfaceAlerts")}
              </span>
            </button>
            <button
              id="studio-surface-recap"
              className="studio-surface-item obs-source-item has-tooltip"
              type="button"
              data-obs-preview-surface="recap"
              data-i18n-aria-label="obs.surfaceRecap"
              aria-pressed={surface === "recap"}
              tabIndex={surface === "recap" ? 0 : -1}
              onClick={() => action("studio-surface-recap")}
              onKeyDown={(event) => surfaceKey(event)}
              aria-label={t("obs.surfaceRecap")}
            >
              <svg
                className="studio-surface-item__icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M6 4h12v16H6z" strokeLinejoin="round"></path>
                <path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round"></path>
              </svg>
              <span className="studio-surface-item__copy">
                <span data-i18n="obs.surfaceRecap">
                  {t("obs.surfaceRecap")}
                </span>
                <small>{"/overlay/recap"}</small>
              </span>
              <span
                className="ui-tooltip"
                role="tooltip"
                data-i18n="obs.surfaceRecap"
              >
                {t("obs.surfaceRecap")}
              </span>
            </button>
          </nav>
          <aside
            id="studio-setup-reminder"
            hidden={setupCompleted}
            className="studio-setup-reminder"
            data-studio-essential-only=""
          >
            <h3 data-i18n="studio.setupReminderTitle">
              {t("studio.setupReminderTitle")}
            </h3>
            <ol>
              <li data-i18n="studio.setupStepSource">
                {t("studio.setupStepSource")}
              </li>
              <li data-i18n="studio.setupStepLook">
                {t("studio.setupStepLook")}
              </li>
              <li data-i18n="studio.setupStepPublish">
                {t("studio.setupStepPublish")}
              </li>
            </ol>
          </aside>
          <button
            id="studio-add-to-obs-open"
            className="btn-physical btn-secondary studio-add-to-obs-open has-tooltip"
            type="button"
            data-i18n-aria-label="studio.obsSetup"
            onClick={() => action("setup")}
            aria-label={t("studio.obsSetup")}
          >
            <svg
              className="studio-add-to-obs-open__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <rect x="3" y="4" width="18" height="13" rx="2"></rect>
              <path d="M8 21h8M12 17v4" strokeLinecap="round"></path>
            </svg>
            <span
              className="studio-add-to-obs-open__label"
              data-i18n="studio.obsSetup"
            >
              {t("studio.obsSetup")}
            </span>
            <span
              className="ui-tooltip"
              role="tooltip"
              data-i18n="studio.obsSetup"
            >
              {t("studio.obsSetup")}
            </span>
          </button>
        </div>
        <div
          id="studio-preview-mount"
          className="studio-column studio-column--preview studio-preview-mount"
          data-preview-only=""
        >
          {preview}
        </div>
        <div
          id="studio-inspector-mount"
          className="studio-column studio-column--inspector studio-inspector-mount"
          data-studio-overlay=""
        >
          {inspector}
        </div>
      </div>
      <div
        className="studio-compact-actions"
        data-i18n-aria-label="studio.publicationActions"
        aria-label={t("studio.publicationActions")}
      >
        <span
          id="studio-compact-dirty-status"
          role="status"
          aria-live="polite"
          className={
            "studio-dirty-status" + (dirty ? " studio-dirty-status--dirty" : "")
          }
        >
          {t(dirty ? "studio.dirty" : "studio.published")}
        </span>
        <span
          id="studio-compact-use-on-stream-hint"
          className="studio-activation-hint"
          data-i18n="studio.publishBeforeUse"
          hidden={!canActivate || !dirty}
        >
          {t("studio.publishBeforeUse")}
        </span>
        <button
          id="studio-compact-use-on-stream"
          className="btn-physical btn-secondary studio-use-on-stream"
          type="button"
          aria-describedby="studio-compact-use-on-stream-hint"
          data-i18n="studio.useOnStream"
          hidden={!canActivate}
          disabled={busy || dirty}
          onClick={() => action("activate")}
        >
          {t("studio.useOnStream")}
        </button>
        <button
          id="studio-compact-publish"
          className="btn-physical btn-start"
          type="button"
          data-i18n="studio.publish"
          disabled={busy || !dirty}
          onClick={() => action("publish")}
          aria-busy={busy}
        >
          {t("studio.publish")}
        </button>
      </div>
    </section>
  );
}
