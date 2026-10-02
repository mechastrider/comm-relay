import { CopyButton } from "../../components/CopyButton";
import { useLocale } from "../../app/locale";
import { TranslatedText } from "../../components/TranslatedText";
export function OBSSetupView({
  source,
  choose,
  finish,
  copy,
  urls,
  period,
  setPeriod,
  presetName,
  title,
  summary,
  status,
}: {
  source: string;
  choose: (source: string) => void;
  finish: (outcome: string) => void;
  copy: (id: string) => void;
  urls: Record<string, string>;
  period: string;
  setPeriod: (period: string) => void;
  presetName: string;
  title: string;
  summary: string;
  status: string;
}) {
  const { t } = useLocale();
  return (
    <div className="dialog-frame">
      <div className="dialog-header">
        <div>
          <span className="dialog-kicker" data-i18n="studio.addToObsKicker">
            {t("studio.addToObsKicker")}
          </span>
          <h2 id="studio-add-to-obs-heading" data-i18n="studio.addToObs">
            {t("studio.addToObs")}
          </h2>
        </div>
        <button
          className="btn-physical btn-small"
          type="button"
          data-studio-add-to-obs-action="close"
          data-i18n="dialog.close"
          data-i18n-aria-label="studio.addToObsClose"
          id="obs-action-0"
          onClick={() => finish("seen")}
          aria-label={t("studio.addToObsClose")}
        >
          {t("dialog.close")}
        </button>
      </div>
      <div className="studio-add-to-obs-body">
        <nav
          className="studio-add-to-obs-nav"
          data-i18n-aria-label="studio.addToObsSources"
          aria-label={t("studio.addToObsSources")}
        >
          <button
            className="studio-add-to-obs-nav-item"
            type="button"
            data-studio-add-to-obs-source="chat"
            id="obs-action-1"
            onClick={() => choose("chat")}
            aria-pressed={source === "chat"}
            aria-current={source === "chat" ? "true" : undefined}
          >
            <span data-i18n="obs.surfaceChat">{t("obs.surfaceChat")}</span>
            <small>{"/overlay"}</small>
          </button>
          <button
            className="studio-add-to-obs-nav-item"
            type="button"
            data-studio-add-to-obs-source="leaderboard"
            id="obs-action-2"
            onClick={() => choose("leaderboard")}
            aria-pressed={source === "leaderboard"}
            aria-current={source === "leaderboard" ? "true" : undefined}
          >
            <span data-i18n="obs.surfaceLeaderboard">
              {t("obs.surfaceLeaderboard")}
            </span>
            <small>{"/overlay/leaderboard"}</small>
          </button>
          <button
            className="studio-add-to-obs-nav-item"
            type="button"
            data-studio-add-to-obs-source="alerts"
            id="obs-action-3"
            onClick={() => choose("alerts")}
            aria-pressed={source === "alerts"}
            aria-current={source === "alerts" ? "true" : undefined}
          >
            <span data-i18n="obs.surfaceAlerts">{t("obs.surfaceAlerts")}</span>
            <small>{"/overlay/alert"}</small>
          </button>
          <button
            className="studio-add-to-obs-nav-item"
            type="button"
            data-studio-add-to-obs-source="recap"
            id="obs-action-4"
            onClick={() => choose("recap")}
            aria-pressed={source === "recap"}
            aria-current={source === "recap" ? "true" : undefined}
          >
            <span data-i18n="obs.recap">{t("obs.recap")}</span>
            <small>{"/overlay/recap"}</small>
          </button>
          <button
            className="studio-add-to-obs-nav-item"
            type="button"
            data-studio-add-to-obs-source="dock"
            id="obs-action-5"
            onClick={() => choose("dock")}
            aria-pressed={source === "dock"}
            aria-current={source === "dock" ? "true" : undefined}
          >
            <span data-i18n="obs.messageDock">{t("obs.messageDock")}</span>
            <small>{"/dock/messages"}</small>
          </button>
        </nav>
        <div className="studio-add-to-obs-detail">
          <div className="obs-source-detail__header">
            <div>
              <span
                id="studio-add-to-obs-source-eyebrow"
                className="obs-integration-card__eyebrow"
                data-i18n="obs.browserSource"
              >
                {t(source === "dock" ? "obs.customDock" : "obs.browserSource")}
              </span>
              <h3
                id="studio-add-to-obs-source-title"
                data-i18n="obs.onStreamOverlay"
              >
                {t(title)}
              </h3>
            </div>
            <span
              id="studio-add-to-obs-source-badge"
              data-i18n="obs.visibleToViewers"
              className={
                "obs-audience-badge" +
                (source === "dock" ? "" : " obs-audience-badge--live")
              }
            >
              {t(
                source === "dock"
                  ? "obs.onlyVisibleToYou"
                  : "obs.visibleToViewers",
              )}
            </span>
          </div>
          <p
            id="studio-add-to-obs-source-summary"
            className="obs-integration-card__summary"
            data-i18n="obs.overlaySummary"
          >
            {t(summary)}
          </p>
          <p
            className="field-hint"
            data-studio-add-to-obs-pane="chat"
            data-i18n="obs.followActiveHint"
            id="obs-pane-0"
            hidden={source !== "chat"}
          >
            {t("obs.followActiveHint")}
          </p>
          <p
            className="field-hint"
            data-studio-add-to-obs-pane="alerts"
            data-i18n="obs.followActiveHint"
            id="obs-pane-1"
            hidden={source !== "alerts"}
          >
            {t("obs.followActiveHint")}
          </p>
          <p
            className="field-hint"
            data-studio-add-to-obs-pane="recap"
            data-i18n="obs.followActiveHint"
            id="obs-pane-2"
            hidden={source !== "recap"}
          >
            {t("obs.followActiveHint")}
          </p>
          <p
            className="field-hint"
            data-studio-add-to-obs-pane="recap"
            data-i18n="obs.recapCanvasHint"
            id="obs-pane-3"
            hidden={source !== "recap"}
          >
            {t("obs.recapCanvasHint")}
          </p>
          <div
            className="obs-url-field studio-url-primary"
            data-studio-add-to-obs-pane="chat"
            id="obs-pane-4"
            hidden={source !== "chat"}
          >
            <label
              htmlFor="studio-add-to-obs-follow-url"
              data-i18n="obs.followActivePreset"
            >
              {t("obs.followActivePreset")}
            </label>
            <div className="obs-url-row">
              <input
                id="studio-add-to-obs-follow-url"
                type="text"
                readOnly={true}
                value={urls["studio-add-to-obs-follow-url"] || ""}
              />
              <CopyButton
                id="obs-action-6"
                target="studio-add-to-obs-follow-url"
                onCopy={() => copy("studio-add-to-obs-follow-url")}
              />
            </div>
          </div>
          <details
            className="studio-url-pinned"
            data-studio-add-to-obs-pane="chat"
            id="obs-pane-5"
            hidden={source !== "chat"}
          >
            <summary data-i18n="obs.pinnedPresetAdvanced">
              {t("obs.pinnedPresetAdvanced")}
            </summary>
            <p id="studio-add-to-obs-pinned-label" className="field-hint">
              {t("obs.pinnedPresetNamed", { name: presetName })}
            </p>
            <div className="obs-url-row">
              <input
                id="studio-add-to-obs-pinned-url"
                type="text"
                readOnly={true}
                value={urls["studio-add-to-obs-pinned-url"] || ""}
              />
              <CopyButton
                id="obs-action-7"
                target="studio-add-to-obs-pinned-url"
                onCopy={() => copy("studio-add-to-obs-pinned-url")}
              />
            </div>
          </details>
          <div
            className="obs-url-field"
            data-studio-add-to-obs-pane="leaderboard"
            id="obs-pane-6"
            hidden={source !== "leaderboard"}
          >
            <label
              htmlFor="studio-add-to-obs-leaderboard-period"
              data-i18n="obs.leaderboardPeriod"
            >
              {t("obs.leaderboardPeriod")}
            </label>
            <select
              id="studio-add-to-obs-leaderboard-period"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="session" data-i18n="viewers.periodSession">
                {t("viewers.periodSession")}
              </option>
              <option value="day" data-i18n="viewers.periodDay">
                {t("viewers.periodDay")}
              </option>
              <option value="all" data-i18n="viewers.periodAll">
                {t("viewers.periodAll")}
              </option>
            </select>
          </div>
          <div
            className="obs-url-field studio-url-primary"
            data-studio-add-to-obs-pane="leaderboard"
            id="obs-pane-7"
            hidden={source !== "leaderboard"}
          >
            <label
              htmlFor="studio-add-to-obs-leaderboard-follow-url"
              data-i18n="obs.followActivePreset"
            >
              {t("obs.followActivePreset")}
            </label>
            <div className="obs-url-row">
              <input
                id="studio-add-to-obs-leaderboard-follow-url"
                type="text"
                readOnly={true}
                value={urls["studio-add-to-obs-leaderboard-follow-url"] || ""}
              />
              <CopyButton
                id="obs-action-8"
                target="studio-add-to-obs-leaderboard-follow-url"
                onCopy={() => copy("studio-add-to-obs-leaderboard-follow-url")}
              />
            </div>
          </div>
          <details
            className="studio-url-pinned"
            data-studio-add-to-obs-pane="leaderboard"
            id="obs-pane-8"
            hidden={source !== "leaderboard"}
          >
            <summary data-i18n="obs.pinnedPresetAdvanced">
              {t("obs.pinnedPresetAdvanced")}
            </summary>
            <p
              id="studio-add-to-obs-leaderboard-pinned-label"
              className="field-hint"
            >
              {t("obs.pinnedPresetNamed", { name: presetName })}
            </p>
            <div className="obs-url-row">
              <input
                id="studio-add-to-obs-leaderboard-pinned-url"
                type="text"
                readOnly={true}
                value={urls["studio-add-to-obs-leaderboard-pinned-url"] || ""}
              />
              <CopyButton
                id="obs-action-9"
                target="studio-add-to-obs-leaderboard-pinned-url"
                onCopy={() => copy("studio-add-to-obs-leaderboard-pinned-url")}
              />
            </div>
          </details>
          <div
            className="obs-url-field studio-url-primary"
            data-studio-add-to-obs-pane="alerts"
            id="obs-pane-9"
            hidden={source !== "alerts"}
          >
            <label
              htmlFor="studio-add-to-obs-alert-follow-url"
              data-i18n="obs.followActivePreset"
            >
              {t("obs.followActivePreset")}
            </label>
            <div className="obs-url-row">
              <input
                id="studio-add-to-obs-alert-follow-url"
                type="text"
                readOnly={true}
                value={urls["studio-add-to-obs-alert-follow-url"] || ""}
              />
              <CopyButton
                id="obs-action-10"
                target="studio-add-to-obs-alert-follow-url"
                onCopy={() => copy("studio-add-to-obs-alert-follow-url")}
              />
            </div>
          </div>
          <details
            className="studio-url-pinned"
            data-studio-add-to-obs-pane="alerts"
            id="obs-pane-10"
            hidden={source !== "alerts"}
          >
            <summary data-i18n="obs.pinnedPresetAdvanced">
              {t("obs.pinnedPresetAdvanced")}
            </summary>
            <p id="studio-add-to-obs-alert-pinned-label" className="field-hint">
              {t("obs.pinnedPresetNamed", { name: presetName })}
            </p>
            <div className="obs-url-row">
              <input
                id="studio-add-to-obs-alert-pinned-url"
                type="text"
                readOnly={true}
                value={urls["studio-add-to-obs-alert-pinned-url"] || ""}
              />
              <CopyButton
                id="obs-action-11"
                target="studio-add-to-obs-alert-pinned-url"
                onCopy={() => copy("studio-add-to-obs-alert-pinned-url")}
              />
            </div>
          </details>
          <div
            className="obs-url-field studio-url-primary"
            data-studio-add-to-obs-pane="recap"
            id="obs-pane-11"
            hidden={source !== "recap"}
          >
            <label
              htmlFor="studio-add-to-obs-recap-follow-url"
              data-i18n="obs.followActivePreset"
            >
              {t("obs.followActivePreset")}
            </label>
            <div className="obs-url-row">
              <input
                id="studio-add-to-obs-recap-follow-url"
                type="text"
                readOnly={true}
                value={urls["studio-add-to-obs-recap-follow-url"] || ""}
              />
              <CopyButton
                id="obs-action-12"
                target="studio-add-to-obs-recap-follow-url"
                onCopy={() => copy("studio-add-to-obs-recap-follow-url")}
              />
            </div>
          </div>
          <details
            className="studio-url-pinned"
            data-studio-add-to-obs-pane="recap"
            id="obs-pane-12"
            hidden={source !== "recap"}
          >
            <summary data-i18n="obs.pinnedPresetAdvanced">
              {t("obs.pinnedPresetAdvanced")}
            </summary>
            <p id="studio-add-to-obs-recap-pinned-label" className="field-hint">
              {t("obs.pinnedPresetNamed", { name: presetName })}
            </p>
            <div className="obs-url-row">
              <input
                id="studio-add-to-obs-recap-pinned-url"
                type="text"
                readOnly={true}
                value={urls["studio-add-to-obs-recap-pinned-url"] || ""}
              />
              <CopyButton
                id="obs-action-13"
                target="studio-add-to-obs-recap-pinned-url"
                onCopy={() => copy("studio-add-to-obs-recap-pinned-url")}
              />
            </div>
          </details>
          <div
            className="obs-url-field"
            data-studio-add-to-obs-pane="dock"
            id="obs-pane-13"
            hidden={source !== "dock"}
          >
            <label htmlFor="studio-add-to-obs-dock-url" data-i18n="obs.dockUrl">
              {t("obs.dockUrl")}
            </label>
            <div className="obs-url-row">
              <input
                id="studio-add-to-obs-dock-url"
                type="text"
                readOnly={true}
                value={urls["studio-add-to-obs-dock-url"] || ""}
              />
              <CopyButton
                id="obs-action-14"
                target="studio-add-to-obs-dock-url"
                onCopy={() => copy("studio-add-to-obs-dock-url")}
              />
            </div>
          </div>
          <details
            className="obs-howto"
            data-studio-add-to-obs-pane="browser"
            id="obs-pane-14"
            hidden={source === "dock"}
          >
            <summary data-i18n="obs.howToBrowser">
              {t("obs.howToBrowser")}
            </summary>
            <ol className="obs-setup-steps">
              <li data-i18n-html="obs.stepBrowser" id="obs-rich-0">
                <TranslatedText name="obs.stepBrowser" />
              </li>
              <li data-i18n="obs.stepPaste">{t("obs.stepPaste")}</li>
              <li data-i18n="obs.stepSize">{t("obs.stepSize")}</li>
              <li data-i18n="obs.stepRunning">{t("obs.stepRunning")}</li>
            </ol>
          </details>
          <details
            className="obs-howto"
            data-studio-add-to-obs-pane="dock"
            id="obs-pane-15"
            hidden={source !== "dock"}
          >
            <summary data-i18n="obs.howToDock">{t("obs.howToDock")}</summary>
            <ol className="obs-setup-steps">
              <li data-i18n-html="obs.stepDocks" id="obs-rich-1">
                <TranslatedText name="obs.stepDocks" />
              </li>
              <li data-i18n="obs.stepDockName">{t("obs.stepDockName")}</li>
              <li data-i18n="obs.stepDockPlace">{t("obs.stepDockPlace")}</li>
            </ol>
          </details>
          <div
            className="obs-integration-actions"
            data-studio-add-to-obs-pane="chat"
            id="obs-pane-16"
            hidden={source !== "chat"}
          >
            <a
              id="studio-add-to-obs-overlay-open"
              className="button-secondary button-secondary--small"
              target="_blank"
              rel="noopener"
              data-i18n="obs.openOverlay"
              href={urls["studio-add-to-obs-overlay-open"] || "/"}
            >
              {t("obs.openOverlay")}
            </a>
          </div>
          <div
            className="obs-integration-actions"
            data-studio-add-to-obs-pane="leaderboard"
            id="obs-pane-17"
            hidden={source !== "leaderboard"}
          >
            <a
              id="studio-add-to-obs-leaderboard-open"
              className="button-secondary button-secondary--small"
              target="_blank"
              rel="noopener"
              data-i18n="obs.openLeaderboard"
              href={urls["studio-add-to-obs-leaderboard-open"] || "/"}
            >
              {t("obs.openLeaderboard")}
            </a>
          </div>
          <div
            className="obs-integration-actions"
            data-studio-add-to-obs-pane="alerts"
            id="obs-pane-18"
            hidden={source !== "alerts"}
          >
            <a
              id="studio-add-to-obs-alert-open"
              className="button-secondary button-secondary--small"
              target="_blank"
              rel="noopener"
              data-i18n="obs.openAlerts"
              href={urls["studio-add-to-obs-alert-open"] || "/"}
            >
              {t("obs.openAlerts")}
            </a>
          </div>
          <div
            className="obs-integration-actions"
            data-studio-add-to-obs-pane="recap"
            id="obs-pane-19"
            hidden={source !== "recap"}
          >
            <a
              id="studio-add-to-obs-recap-open"
              className="button-secondary button-secondary--small"
              target="_blank"
              rel="noopener"
              data-i18n="obs.openRecap"
              href={urls["studio-add-to-obs-recap-open"] || "/"}
            >
              {t("obs.openRecap")}
            </a>
          </div>
          <div
            className="obs-integration-actions"
            data-studio-add-to-obs-pane="dock"
            id="obs-pane-20"
            hidden={source !== "dock"}
          >
            <a
              id="studio-add-to-obs-dock-open"
              className="button-secondary button-secondary--small"
              target="_blank"
              rel="noopener"
              data-i18n="obs.openMessageDock"
              href={urls["studio-add-to-obs-dock-open"] || "/"}
            >
              {t("obs.openMessageDock")}
            </a>
          </div>
          <p
            id="studio-add-to-obs-copy-status"
            className="obs-copy-status"
            role="status"
            aria-live="polite"
          >
            {status}
          </p>
        </div>
      </div>
      <div className="dialog-actions">
        <button
          className="btn-physical"
          type="button"
          data-studio-add-to-obs-action="later"
          data-i18n="studio.addToObsLater"
          id="obs-action-15"
          onClick={() => finish("skipped")}
        >
          {t("studio.addToObsLater")}
        </button>
        <button
          className="btn-physical btn-start"
          type="button"
          data-studio-add-to-obs-action="done"
          data-i18n="studio.addToObsDone"
          id="obs-action-16"
          onClick={() => finish("completed")}
        >
          {t("studio.addToObsDone")}
        </button>
      </div>
    </div>
  );
}
