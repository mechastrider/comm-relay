import { IconButton } from "../../components/Button";
import { ErrorDetail } from "../../components/ErrorDetail";
import { useState } from "react";
import { useRuntime } from "../../app/runtime";
import { useLocale, type Translate } from "../../app/locale";

export function formatUptime(seconds: number | undefined): string {
  if (seconds === undefined || seconds < 0) return "-";
  if (seconds < 60) return seconds + "s";
  if (seconds < 3600)
    return Math.floor(seconds / 60) + "m " + (seconds % 60) + "s";
  return (
    Math.floor(seconds / 3600) + "h " + Math.floor((seconds % 3600) / 60) + "m"
  );
}
export function formatPipeline(
  pipeline: Record<string, unknown> | undefined,
  t: Translate,
) {
  if (!pipeline) return t("status.pipelineClear");
  const sum = (value: unknown) =>
    value && typeof value === "object"
      ? Object.values(value).reduce<number>(
          (total, count) => total + (typeof count === "number" ? count : 0),
          0,
        )
      : 0;
  const values: [string, number][] = [
    ["status.pipelineBusDrops", sum(pipeline.bus_drops)],
    ["status.pipelineWsDrops", sum(pipeline.websocket_drops)],
    ["status.pipelineCommands", Number(pipeline.commands_fired) || 0],
    ["status.pipelineAwards", Number(pipeline.awards_granted) || 0],
    ["status.pipelineSuppressed", sum(pipeline.commands_suppressed)],
  ];
  return (
    values
      .filter(([, count]) => count > 0)
      .map(([key, count]) => t(key, { count }))
      .join(" · ") || t("status.pipelineClear")
  );
}
export function DiagnosticsView() {
  const { diagnostics: data, refreshDiagnostics } = useRuntime();
  const { t, locale } = useLocale();
  const [error, setError] = useState("");
  const cache = data?.emote_cache;
  const providers =
    cache?.providers && typeof cache.providers === "object"
      ? (cache.providers as Record<
          string,
          {
            emote_count?: number;
            last_refresh_at?: string;
            last_error?: string;
          }
        >)
      : {};
  const youtube = data?.connectors.youtube;
  const oauthLabel =
    youtube?.connection_mode === "page"
      ? youtube.channel
        ? t("status.simpleChannel", { channel: String(youtube.channel) })
        : youtube.video_id
          ? t("status.simpleVideo", { id: String(youtube.video_id) })
          : t("status.simpleFallback")
      : t(
          youtube?.oauth_connected
            ? "status.apiConnected"
            : "status.apiNotConnected",
        );
  return (
    <div id="settings-diagnostics-body" className="settings-diagnostics">
      <p className="field-hint">{t("settings.diagnosticsHint")}</p>
      <div className="panel-heading">
        <h3>{t("shell.runtime")}</h3>
        <IconButton
          type="button"
          className="icon-btn--compact has-tooltip"
          aria-label={t("shell.refresh")}
          onClick={() => {
            void refreshDiagnostics()
              .then(() => setError(""))
              .catch((cause) => setError(String(cause)));
          }}
        >
          ↻
          <span className="ui-tooltip" role="tooltip">
            {t("shell.refresh")}
          </span>
        </IconButton>
      </div>
      {error && <p role="alert">{error}</p>}
      <dl className="overview-list settings-diagnostics__summary">
        {[
          ["uptime", "shell.uptime", formatUptime(data?.uptime_seconds)],
          ["ws-clients", "shell.ws", String(data?.websocket_clients ?? "-")],
          [
            "message-counts",
            "shell.messages",
            Object.entries(data?.message_counts ?? {})
              .sort()
              .map(([key, count]) => `${key}: ${count}`)
              .join(", ") || t("status.noneYet"),
          ],
          ["pipeline", "shell.pipeline", formatPipeline(data?.pipeline, t)],
        ].map(([id, label, value]) => (
          <div className="overview-list__row" key={id}>
            <dt>{t(label)}</dt>
            <dd id={"settings-diag-" + id} className="overview-list__value">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="panel-heading panel-heading--spaced">
        <h3>{t("shell.youtubeOAuth")}</h3>
      </div>
      <p
        id="settings-youtube-oauth-label"
        className="settings-diagnostics__oauth"
      >
        {oauthLabel}
      </p>
      <div
        className="detail-stack"
        role="group"
        aria-label={t("shell.connectorDetails")}
      >
        {Object.entries(data?.connectors ?? {}).map(([name, status]) => (
          <div
            key={name}
            id={`settings-${name}-detail`}
            className="status-detail"
            hidden={!status.detail && !status.last_error}
          >
            <span className="status-detail__summary">
              {typeof status.detail === "string" ? status.detail : ""}
              {typeof status.message_count === "number" &&
              status.message_count > 0
                ? ` ${t("status.received")} · ${status.message_count} ${t("status.msgSuffix")}`
                : ""}
            </span>
            {status.last_error && (
              <ErrorDetail error={status.last_error} label={name} />
            )}
          </div>
        ))}
      </div>
      <div className="panel-heading panel-heading--spaced">
        <h3>{t("shell.richChat")}</h3>
      </div>
      <dl
        className="overview-list emote-diagnostics"
        aria-label={t("shell.emoteProviderCache")}
      >
        <div className="overview-list__row">
          <dt>{t("shell.cacheEntries")}</dt>
          <dd
            id="settings-emote-cache-entries"
            className="overview-list__value"
          >
            {cache
              ? t("status.emotesScopes", {
                  total: String(cache.total_entries ?? 0),
                  scopes: String(cache.total_scopes ?? 0),
                })
              : "-"}
          </dd>
        </div>
      </dl>
      <ul
        id="settings-emote-provider-list"
        className="provider-list"
        aria-label={t("shell.emoteProviderStatus")}
      >
        {Object.keys(providers).length === 0 && (
          <li className="provider-list__item provider-list__item--empty">
            {t("status.noProviderData")}
          </li>
        )}
        {Object.entries(providers)
          .sort()
          .map(([name, provider]) => (
            <li key={name} className="provider-list__item">
              <div className="provider-list__title">
                {(
                  { bttv: "BTTV", ffz: "FFZ", "7tv": "7TV" } as Record<
                    string,
                    string
                  >
                )[name] ?? name}
              </div>
              <div className="provider-list__stats">
                {t("status.emotesRefreshed", {
                  count: provider.emote_count ?? 0,
                  time: provider.last_refresh_at
                    ? new Date(provider.last_refresh_at).toLocaleString(locale)
                    : t("status.never"),
                })}
              </div>
              {provider.last_error && (
                <ErrorDetail error={provider.last_error} label={name} />
              )}
            </li>
          ))}
      </ul>
    </div>
  );
}
