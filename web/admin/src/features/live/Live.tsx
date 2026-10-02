import { Button, IconButton } from "../../components/Button";
import { useRef, useState } from "react";
import { useLocale } from "../../app/locale";
import { useRuntime } from "../../app/runtime";
import { Tabs } from "../../components/Tabs";
import { NewStream } from "../../components/NewStream";
import { post } from "../../services/api";
import type { PublicConfig } from "../../services/types";
import { Messages } from "./Messages";
import { useMessages } from "./MessagesProvider";
import { Leaderboard } from "./Leaderboard";
import { Statistics } from "./Statistics";
import { Contracts } from "./Contracts";
import { useNavigation } from "../../app/navigation";
import { Recap } from "./Recap";

type Tab = "messages" | "leaderboard" | "statistics" | "contracts";
const tabs: Tab[] = ["messages", "leaderboard", "statistics", "contracts"];
export function Live() {
  const { t } = useLocale();
  const { config, diagnostics, applyConfig } = useRuntime();
  const messages = useMessages();
  const {
    liveTab: tab,
    setLiveTab: setTab,
    period,
    setPeriod,
  } = useNavigation();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [recap, setRecap] = useState(false);
  const [error, setError] = useState("");
  const [activating, setActivating] = useState(false);
  const pending = useRef(false);
  const presets = Array.isArray(config?.overlay.presets)
    ? (config.overlay.presets as Array<{ id: string; name: string }>)
    : [];
  const active =
    typeof config?.overlay.active_preset_id === "string"
      ? config.overlay.active_preset_id
      : presets[0]?.id || "";
  const activate = async (id: string) => {
    if (pending.current || !id || id === active) return;
    pending.current = true;
    setActivating(true);
    setError("");
    try {
      applyConfig(
        await post<PublicConfig>("/api/overlay/activate", { preset_id: id }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("banner.cannotReach"),
      );
    } finally {
      pending.current = false;
      setActivating(false);
    }
  };
  const refresh = () => {
    if (tab === "messages") void messages.refresh();
    else setRefreshVersion((value) => value + 1);
  };
  return (
    <section
      id="workspace-live"
      className="workspace workspace--active"
      data-workspace="live"
      aria-labelledby="workspace-live-heading"
    >
      <h1
        id="workspace-live-heading"
        className="workspace-heading visually-hidden"
        tabIndex={-1}
      >
        {t("workspace.liveHeading")}
      </h1>
      <div className="live-cockpit cockpit-shell" id="live-cockpit">
        <div className="live-status-strip" aria-label={t("live.statusStrip")}>
          <p id="live-browser-clients" className="live-status-strip__clients">
            {t("live.browserClientsCount", {
              count: diagnostics?.websocket_clients ?? "—",
            })}
          </p>
          <div className="live-status-strip__preset">
            <label htmlFor="live-active-preset">{t("live.activePreset")}</label>
            <select
              id="live-active-preset"
              className="live-active-preset"
              value={active}
              disabled={activating || !presets.length}
              onChange={(event) => void activate(event.target.value)}
            >
              {presets.length ? (
                presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name || preset.id}
                  </option>
                ))
              ) : (
                <option value="">{t("live.activePresetNone")}</option>
              )}
            </select>
          </div>
        </div>
        <div className="main-area">
          {error && (
            <div id="banner" className="banner" role="alert">
              {error}
            </div>
          )}
          <section
            className="console-panel live-work-area"
            aria-labelledby="live-work-heading"
          >
            <h2 id="live-work-heading" className="visually-hidden">
              {t("live.workArea")}
            </h2>
            <div className="console-header">
              <div className="console-header__start">
                <Tabs
                  items={tabs.map((id) => ({
                    id,
                    label: t("live.tab" + id[0].toUpperCase() + id.slice(1)),
                  }))}
                  selected={tab}
                  onSelect={setTab}
                  label={t("live.tabList")}
                  idPrefix="live"
                  className="console-tabs"
                />
              </div>
              <div className="console-actions live-toolbar-actions">
                <span
                  id="settings-state"
                  className={
                    "settings-state" + (config ? " settings-state--saved" : "")
                  }
                  aria-live="polite"
                >
                  {t(config ? "shell.settingsSaved" : "shell.loadingSettings")}
                </span>
                <Button
                  id="live-recap-button"
                  className="btn-small has-tooltip"
                  type="button"
                  onClick={() => setRecap(true)}
                >
                  <span>{t("recap.open")}</span>
                  <span className="ui-tooltip" role="tooltip">
                    {t("recap.openHint")}
                  </span>
                </Button>
                <NewStream
                  onStarted={() => {
                    setRefreshVersion((value) => value + 1);
                    void messages.refresh();
                  }}
                />
                {tab !== "contracts" && (
                  <IconButton
                    id={`refresh-${tab}`}
                    type="button"
                    className="icon-btn--compact has-tooltip"
                    aria-label={t("shell.refresh")}
                    onClick={refresh}
                  >
                    <svg
                      className="icon-btn__icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M20 11a8 8 0 1 0 2 5.3" strokeLinecap="round" />
                      <path
                        d="M20 4v7h-7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="ui-tooltip" role="tooltip">
                      {t("shell.refresh")}
                    </span>
                  </IconButton>
                )}
              </div>
            </div>
            <div className="live-tab-panels">
              {tabs.map((id) => (
                <section
                  key={id}
                  id={`live-${id}-panel`}
                  className={`canvas-panel live-tab-panel${id === "leaderboard" || id === "statistics" ? " live-" + id + "-panel" : ""}`}
                  role="tabpanel"
                  aria-labelledby={`live-${id}-tab`}
                  hidden={tab !== id}
                >
                  {tab === id &&
                    (id === "messages" ? (
                      <Messages />
                    ) : id === "leaderboard" ? (
                      <Leaderboard
                        period={period}
                        onPeriod={setPeriod}
                        refreshVersion={refreshVersion}
                      />
                    ) : id === "statistics" ? (
                      <Statistics
                        period={period}
                        refreshVersion={refreshVersion}
                      />
                    ) : (
                      <Contracts />
                    ))}
                </section>
              ))}
            </div>
          </section>
        </div>
      </div>
      {recap && <Recap onClose={() => setRecap(false)} />}
    </section>
  );
}
