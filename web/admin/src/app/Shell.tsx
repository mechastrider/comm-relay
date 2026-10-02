import { useSaveStatus } from "./save-status";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useLocale, readPreference, writePreference } from "./locale";
import { useRuntime } from "./runtime";
import { formatUptime, formatPipeline } from "../features/settings/Diagnostics";
const destinations = [
  "live",
  "audience",
  "studio",
  "settings",
  "about",
] as const;
const icons = {
  live: (
    <svg
      className="shell-nav__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="2"></circle>
      <path d="M16.24 7.76a6 6 0 0 1 0 8.48M7.76 16.24a6 6 0 0 1 0-8.48M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"></path>
    </svg>
  ),
  audience: (
    <svg
      className="shell-nav__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  studio: (
    <svg
      className="shell-nav__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
      <path d="M3 9h18M9 21V9"></path>
    </svg>
  ),
  settings: (
    <svg
      className="shell-nav__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.5 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.08A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.12.6.65 1.02 1.26 1.02H21a2 2 0 1 1 0 4h-.09c-.61 0-1.14.42-1.51.98Z"></path>
    </svg>
  ),
  about: (
    <svg
      className="shell-nav__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M12 11v5M12 8h.01"></path>
    </svg>
  ),
};
export function Shell() {
  const { t } = useLocale();
  const { config, diagnostics, diagnosticsStale, connection } = useRuntime();
  const saveStatus = useSaveStatus();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const workspace =
    destinations.find((item) => pathname.split("/")[1] === item) ?? "live";
  const [collapsed, setCollapsed] = useState(
    () => readPreference("commRelay.sidebarState", "expanded") === "collapsed",
  );
  useEffect(() => {
    document.documentElement.dataset.sidebarState = collapsed
      ? "collapsed"
      : "expanded";
    writePreference(
      "commRelay.sidebarState",
      collapsed ? "collapsed" : "expanded",
    );
  }, [collapsed]);
  useEffect(() => {
    document.title = t("nav." + workspace) + " — CommRelay";
    document
      .querySelector<HTMLElement>(
        "#workspace-" + workspace + " .workspace-heading",
      )
      ?.focus({ preventScroll: true });
  }, [workspace, t]);
  function connectorState(name: string) {
    return String(diagnostics?.connectors[name]?.state ?? "unknown");
  }
  function connectorLabel(name: string) {
    const state = connectorState(name);
    const key = "platform." + state.replace(/\s+/g, "_");
    const label = t(key);
    return label === key ? state.replaceAll("_", " ") : label;
  }
  const sidebarKey = collapsed
    ? "shell.expandSidebar"
    : "shell.collapseSidebar";
  function links(bottom = false) {
    return destinations.map((item) => (
      <li key={item}>
        <a
          className={bottom ? "shell-nav__link" : "shell-nav__link has-tooltip"}
          href={"#" + item}
          data-workspace-nav={item}
          aria-current={workspace === item ? "page" : undefined}
          onClick={(event) => {
            event.preventDefault();
            void navigate("/" + item);
          }}
        >
          {!bottom && icons[item]}
          <span className="shell-nav__label">{t("nav." + item)}</span>
          {!bottom && (
            <span className="ui-tooltip shell-nav__tooltip" role="tooltip">
              {t("nav." + item)}
            </span>
          )}
        </a>
      </li>
    ));
  }
  return (
    <>
      <a
        className="skip-link"
        href="#workspace-main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("workspace-main")?.focus();
        }}
      >
        {t("shell.skipToContent")}
      </a>
      <div id="app-shell" className="app-shell">
        <header
          className="shell-header"
          data-i18n-aria-label="shell.systemStatus"
          aria-label={t("shell.systemStatus")}
        >
          <div className="brand-stack">
            <span className="brand-kicker" data-i18n="shell.brandKicker">
              {t("shell.brandKicker")}
            </span>
            <p className="brand-title">{"CommRelay"}</p>
          </div>
          <div
            className="connector-rack"
            data-i18n-aria-label="shell.connectorStates"
            aria-label={t("shell.connectorStates")}
          >
            <div className="indicator">
              <span className="indicator__label">{"Twitch"}</span>
              <span
                id="twitch-status"
                className={
                  "status-pill status-pill--" + connectorState("twitch")
                }
              >
                {connectorLabel("twitch")}
              </span>
            </div>
            <div className="indicator">
              <span className="indicator__label">{"YouTube"}</span>
              <span
                id="youtube-status"
                className={
                  "status-pill status-pill--" + connectorState("youtube")
                }
              >
                {connectorLabel("youtube")}
              </span>
            </div>
            <div className="indicator">
              <span className="indicator__label">{"VK Live"}</span>
              <span
                id="vk-status"
                className={"status-pill status-pill--" + connectorState("vk")}
              >
                {connectorLabel("vk")}
              </span>
            </div>
          </div>
          <div className="shell-header__actions">
            <button
              id="shell-diagnostics-button"
              className="btn-physical btn-small has-tooltip"
              type="button"
              aria-controls="shell-status-bar"
              data-i18n="shell.diagnostics"
              data-i18n-aria-label="shell.diagnostics"
              onClick={() => {
                document
                  .getElementById("shell-status-bar")
                  ?.scrollIntoView({ block: "nearest" });
              }}
              aria-label={t("shell.diagnostics")}
            >
              {t("shell.diagnostics")}
              <span
                className="ui-tooltip"
                role="tooltip"
                data-i18n="shell.diagnosticsHint"
              >
                {t("shell.diagnosticsHint")}
              </span>
            </button>
          </div>
        </header>
        <div className="shell-body">
          <nav
            id="side-primary-navigation"
            className="shell-nav shell-nav--side"
            aria-label={t("shell.primaryNav")}
            data-sidebar-state={collapsed ? "collapsed" : "expanded"}
          >
            <ul className="shell-nav__list">{links()}</ul>
            <div className="shell-nav__footer">
              <button
                id="sidebar-toggle"
                className="shell-nav__toggle has-tooltip"
                type="button"
                aria-controls="side-primary-navigation"
                aria-expanded={!collapsed}
                aria-label={t(sidebarKey)}
                onClick={() => setCollapsed((value) => !value)}
              >
                <svg
                  className="shell-nav__icon shell-nav__toggle-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18M16 9l-3 3 3 3" />
                </svg>
                <span className="shell-nav__toggle-label">{t(sidebarKey)}</span>
                <span className="ui-tooltip shell-nav__tooltip" role="tooltip">
                  {t(sidebarKey)}
                </span>
              </button>
            </div>
          </nav>
          <main id="workspace-main" className="workspace-host" tabIndex={-1}>
            <div
              id="shell-announcements"
              className="visually-hidden"
              aria-live="polite"
              aria-atomic="true"
            >
              {t("nav." + workspace)}
            </div>
            <Outlet />
          </main>
        </div>
        <nav
          className="shell-nav shell-nav--bottom"
          aria-label={t("shell.primaryNav")}
        >
          <ul className="shell-nav__list">{links(true)}</ul>
        </nav>
        <footer
          id="shell-status-bar"
          className="status-bar"
          aria-label={t("shell.runtimeDiagnostics")}
        >
          <span className="tag">ADMIN</span>
          <span>
            {t("shell.uptime")}{" "}
            <strong id="diag-uptime">
              {formatUptime(diagnostics?.uptime_seconds)}
            </strong>
          </span>
          <span>
            {t("shell.ws")}{" "}
            <strong id="diag-ws-clients">
              {diagnostics?.websocket_clients ?? "-"}
            </strong>
          </span>
          <span>
            {t("shell.adminWs")}{" "}
            <strong
              id="diag-admin-ws"
              className={
                "status-pill status-pill--" +
                (connection === "connected"
                  ? "connected"
                  : connection === "reconnecting"
                    ? "reconnecting"
                    : "disconnected")
              }
            >
              {t(
                connection === "connected"
                  ? "shell.adminWsConnected"
                  : connection === "reconnecting"
                    ? "shell.adminWsReconnecting"
                    : "shell.adminWsDisconnected",
              )}
            </strong>
          </span>
          <span
            id="diag-stale-notice"
            className="status-bar__stale"
            hidden={!diagnosticsStale}
          >
            {t("shell.pollStale")}
          </span>
          <span>
            {t("shell.messages")}{" "}
            <strong id="diag-message-counts">
              {Object.entries(diagnostics?.message_counts ?? {})
                .sort()
                .map(([key, count]) => key + ": " + count)
                .join(", ") || t("status.noneYet")}
            </strong>
          </span>
          <span>
            {t("shell.pipeline")}{" "}
            <strong id="diag-pipeline">
              {formatPipeline(diagnostics?.pipeline, t)}
            </strong>
          </span>
          <span className="status-bar__spacer" />
          <span>
            {t("shell.state")}{" "}
            <strong
              id="footer-settings-state"
              className={
                saveStatus === "saved"
                  ? "settings-state--saved"
                  : saveStatus === "dirty"
                    ? "settings-state--dirty"
                    : undefined
              }
            >
              {t(
                !config
                  ? "shell.loadingSettings"
                  : saveStatus === "saving"
                    ? "shell.saving"
                    : saveStatus === "dirty"
                      ? "shell.unsavedChanges"
                      : "shell.settingsSaved",
              )}
            </strong>
          </span>
        </footer>
      </div>
    </>
  );
}
