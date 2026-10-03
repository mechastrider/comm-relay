import { Field } from "../../components/Field";
import { Button } from "../../components/Button";
import { useLocale } from "../../app/locale";
export type FieldValues = Record<string, string | boolean>;
export interface SettingsFieldsProps {
  values: FieldValues;
  errors: Record<string, string>;
  onChange: (id: string, value: string | boolean) => void;
  onAction: (action: string) => void;
  platform?: string;
}
export function PlatformsFields({
  values,
  errors,
  onChange,
  onAction,
  platform,
}: SettingsFieldsProps) {
  const { t } = useLocale();
  return (
    <>
      <section
        id="connections-twitch-panel"
        className="dialog-tab-panel connections-tab-panel"
        role="tabpanel"
        aria-labelledby="connections-twitch-tab"
        data-connections-panel="twitch"
        hidden={platform !== "twitch"}
      >
        <section
          className="panel platform-panel"
          aria-labelledby="twitch-heading"
        >
          <div className="panel__header">
            <h3 id="twitch-heading">{"Twitch"}</h3>
          </div>
          <div className="form">
            <Field>
              <label className="checkbox" htmlFor="twitch-enabled">
                <input
                  id="twitch-enabled"
                  name="twitch_enabled"
                  type="checkbox"
                  checked={Boolean(values["twitch-enabled"])}
                  onChange={(event) =>
                    onChange("twitch-enabled", event.currentTarget.checked)
                  }
                  aria-invalid={Boolean(errors["twitch_enabled"])}
                />
                <span data-i18n="conn.enableConnector">
                  {t("conn.enableConnector")}
                </span>
              </label>
            </Field>
            <Field>
              <label htmlFor="twitch-channel" data-i18n="conn.channel">
                {t("conn.channel")}
              </label>
              <input
                id="twitch-channel"
                name="twitch_channel"
                type="text"
                autoComplete="off"
                spellCheck="false"
                inputMode="text"
                value={String(values["twitch-channel"] ?? "")}
                onChange={(event) =>
                  onChange("twitch-channel", event.currentTarget.value)
                }
                aria-invalid={Boolean(errors["twitch_channel"])}
              />
              <p
                id="twitch-channel-error"
                className="field-error"
                role="alert"
                hidden={!errors["twitch_channel"]}
              >
                {errors["twitch_channel"]}
              </p>
            </Field>
            <Field>
              <label
                className="checkbox checkbox--disabled"
                htmlFor="twitch-use-proxy"
              >
                <input
                  id="twitch-use-proxy"
                  name="twitch_use_proxy"
                  type="checkbox"
                  disabled={true}
                  aria-disabled="true"
                />
                <span data-i18n="conn.useSocks5">{t("conn.useSocks5")}</span>
              </label>
              <p className="field-hint" data-i18n="conn.twitchProxyHint">
                {t("conn.twitchProxyHint")}
              </p>
            </Field>
          </div>
        </section>
      </section>
      <section
        id="connections-youtube-panel"
        className="dialog-tab-panel connections-tab-panel"
        role="tabpanel"
        aria-labelledby="connections-youtube-tab"
        data-connections-panel="youtube"
        hidden={platform !== "youtube"}
      >
        <section
          className="panel platform-panel"
          aria-labelledby="youtube-heading"
        >
          <div className="panel__header">
            <h3 id="youtube-heading">{"YouTube Live"}</h3>
            <Button
              id="youtube-connect"
              className="button-secondary"
              type="button"
              data-i18n="conn.connect"
              hidden={values["youtube-connection-mode"] !== "api"}
              onClick={() => onAction("oauth")}
            >
              {t("conn.connect")}
            </Button>
          </div>
          <div className="form">
            <Field>
              <label className="checkbox" htmlFor="youtube-enabled">
                <input
                  id="youtube-enabled"
                  name="youtube_enabled"
                  type="checkbox"
                  checked={Boolean(values["youtube-enabled"])}
                  onChange={(event) =>
                    onChange("youtube-enabled", event.currentTarget.checked)
                  }
                  aria-invalid={Boolean(errors["youtube_enabled"])}
                />
                <span data-i18n="conn.enableConnector">
                  {t("conn.enableConnector")}
                </span>
              </label>
            </Field>
            <Field>
              <label
                htmlFor="youtube-connection-mode"
                data-i18n="conn.connectionMode"
              >
                {t("conn.connectionMode")}
              </label>
              <select
                id="youtube-connection-mode"
                name="youtube_connection_mode"
                value={String(values["youtube-connection-mode"] ?? "")}
                onChange={(event) =>
                  onChange("youtube-connection-mode", event.currentTarget.value)
                }
                aria-invalid={Boolean(errors["youtube_connection_mode"])}
              >
                <option value="page" data-i18n="conn.youtubeSimple">
                  {t("conn.youtubeSimple")}
                </option>
                <option value="api" data-i18n="conn.youtubeApi">
                  {t("conn.youtubeApi")}
                </option>
              </select>
              <p className="field-hint" data-i18n="conn.youtubeSimpleHint">
                {t("conn.youtubeSimpleHint")}
              </p>
            </Field>
            <div
              id="youtube-page-fields"
              className="youtube-page-fields"
              hidden={values["youtube-connection-mode"] === "api"}
            >
              <Field>
                <label
                  htmlFor="youtube-channel-handle"
                  data-i18n="conn.channelHandle"
                >
                  {t("conn.channelHandle")}
                </label>
                <input
                  id="youtube-channel-handle"
                  name="youtube_channel_handle"
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  inputMode="text"
                  value={String(values["youtube-channel-handle"] ?? "")}
                  onChange={(event) =>
                    onChange(
                      "youtube-channel-handle",
                      event.currentTarget.value,
                    )
                  }
                  aria-invalid={Boolean(errors["youtube_channel_handle"])}
                />
                <p className="field-hint" data-i18n="conn.channelHandleHint">
                  {t("conn.channelHandleHint")}
                </p>
                <p
                  id="youtube-channel-handle-error"
                  className="field-error"
                  role="alert"
                  hidden={!errors["youtube_channel_handle"]}
                >
                  {errors["youtube_channel_handle"]}
                </p>
              </Field>
              <Field>
                <label htmlFor="youtube-video-input">
                  <span data-i18n="conn.liveVideoUrl">
                    {t("conn.liveVideoUrl")}
                  </span>
                  <span className="field-optional" data-i18n="conn.optional">
                    {t("conn.optional")}
                  </span>
                </label>
                <input
                  id="youtube-video-input"
                  name="youtube_video_input"
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  inputMode="url"
                  value={String(values["youtube-video-input"] ?? "")}
                  onChange={(event) =>
                    onChange("youtube-video-input", event.currentTarget.value)
                  }
                  aria-invalid={Boolean(errors["youtube_video_input"])}
                />
                <p className="field-hint" data-i18n="conn.liveVideoHint">
                  {t("conn.liveVideoHint")}
                </p>
                <p
                  id="youtube-video-input-error"
                  className="field-error"
                  role="alert"
                  hidden={!errors["youtube_video_input"]}
                >
                  {errors["youtube_video_input"]}
                </p>
              </Field>
            </div>
            <div
              id="youtube-api-fields"
              hidden={values["youtube-connection-mode"] !== "api"}
            >
              <Field>
                <label
                  htmlFor="youtube-chat-mode"
                  data-i18n="conn.chatTransport"
                >
                  {t("conn.chatTransport")}
                </label>
                <select
                  id="youtube-chat-mode"
                  name="youtube_chat_mode"
                  value={String(values["youtube-chat-mode"] ?? "")}
                  onChange={(event) =>
                    onChange("youtube-chat-mode", event.currentTarget.value)
                  }
                  aria-invalid={Boolean(errors["youtube_chat_mode"])}
                >
                  <option value="stream" data-i18n="conn.grpcStream">
                    {t("conn.grpcStream")}
                  </option>
                  <option value="auto" data-i18n="conn.autoTransport">
                    {t("conn.autoTransport")}
                  </option>
                  <option value="poll" data-i18n="conn.restPolling">
                    {t("conn.restPolling")}
                  </option>
                </select>
                <p className="field-hint" data-i18n="conn.chatTransportHint">
                  {t("conn.chatTransportHint")}
                </p>
              </Field>
              <Field>
                <label
                  htmlFor="youtube-client-id"
                  data-i18n="conn.oauthClientId"
                >
                  {t("conn.oauthClientId")}
                </label>
                <input
                  id="youtube-client-id"
                  name="youtube_client_id"
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  value={String(values["youtube-client-id"] ?? "")}
                  onChange={(event) =>
                    onChange("youtube-client-id", event.currentTarget.value)
                  }
                  aria-invalid={Boolean(errors["youtube_client_id"])}
                />
              </Field>
              <Field>
                <label
                  htmlFor="youtube-client-secret"
                  data-i18n="conn.oauthClientSecret"
                >
                  {t("conn.oauthClientSecret")}
                </label>
                <input
                  id="youtube-client-secret"
                  name="youtube_client_secret"
                  type="password"
                  autoComplete="off"
                  value={String(values["youtube-client-secret"] ?? "")}
                  onChange={(event) =>
                    onChange("youtube-client-secret", event.currentTarget.value)
                  }
                  aria-invalid={Boolean(errors["youtube_client_secret"])}
                />
                <p className="field-hint" data-i18n="conn.keepSecretHint">
                  {t("conn.keepSecretHint")}
                </p>
              </Field>
            </div>
            <Field>
              <label className="checkbox" htmlFor="youtube-use-proxy">
                <input
                  id="youtube-use-proxy"
                  name="youtube_use_proxy"
                  type="checkbox"
                  checked={Boolean(values["youtube-use-proxy"])}
                  onChange={(event) =>
                    onChange("youtube-use-proxy", event.currentTarget.checked)
                  }
                  aria-invalid={Boolean(errors["youtube_use_proxy"])}
                />
                <span data-i18n="conn.useSocks5">{t("conn.useSocks5")}</span>
              </label>
              <p className="field-hint" data-i18n="conn.proxyNetworkHint">
                {t("conn.proxyNetworkHint")}
              </p>
            </Field>
          </div>
        </section>
      </section>
      <section
        id="connections-vk-panel"
        className="dialog-tab-panel connections-tab-panel"
        role="tabpanel"
        aria-labelledby="connections-vk-tab"
        data-connections-panel="vk"
        hidden={platform !== "vk"}
      >
        <section className="panel platform-panel" aria-labelledby="vk-heading">
          <div className="panel__header">
            <h3 id="vk-heading">{"VK Live"}</h3>
          </div>
          <div className="form">
            <Field>
              <label className="checkbox" htmlFor="vk-enabled">
                <input
                  id="vk-enabled"
                  name="vk_enabled"
                  type="checkbox"
                  checked={Boolean(values["vk-enabled"])}
                  onChange={(event) =>
                    onChange("vk-enabled", event.currentTarget.checked)
                  }
                  aria-invalid={Boolean(errors["vk_enabled"])}
                />
                <span data-i18n="conn.enableConnector">
                  {t("conn.enableConnector")}
                </span>
              </label>
            </Field>
            <Field>
              <label htmlFor="vk-channel" data-i18n="conn.channelSlug">
                {t("conn.channelSlug")}
              </label>
              <input
                id="vk-channel"
                name="vk_channel"
                type="text"
                autoComplete="off"
                spellCheck="false"
                inputMode="text"
                value={String(values["vk-channel"] ?? "")}
                onChange={(event) =>
                  onChange("vk-channel", event.currentTarget.value)
                }
                aria-invalid={Boolean(errors["vk_channel"])}
              />
              <p className="field-hint" data-i18n="conn.vkSlugHint">
                {t("conn.vkSlugHint")}
              </p>
              <p
                id="vk-channel-error"
                className="field-error"
                role="alert"
                hidden={!errors["vk_channel"]}
              >
                {errors["vk_channel"]}
              </p>
            </Field>
            <Field>
              <label className="checkbox" htmlFor="vk-use-proxy">
                <input
                  id="vk-use-proxy"
                  name="vk_use_proxy"
                  type="checkbox"
                  checked={Boolean(values["vk-use-proxy"])}
                  onChange={(event) =>
                    onChange("vk-use-proxy", event.currentTarget.checked)
                  }
                  aria-invalid={Boolean(errors["vk_use_proxy"])}
                />
                <span data-i18n="conn.useSocks5">{t("conn.useSocks5")}</span>
              </label>
              <p className="field-hint" data-i18n="conn.proxyNetworkHint">
                {t("conn.proxyNetworkHint")}
              </p>
            </Field>
          </div>
        </section>
      </section>
    </>
  );
}
export function NetworkFields({
  values,
  errors,
  onChange,
}: SettingsFieldsProps) {
  const { t } = useLocale();
  return (
    <>
      <section
        id="connections-network-panel"
        className="dialog-tab-panel connections-tab-panel"
        role="tabpanel"
        aria-labelledby="connections-network-tab"
        data-connections-panel="network"
      >
        <section className="panel" aria-labelledby="network-server-heading">
          <div className="panel__header">
            <h3 id="network-server-heading" data-i18n="settings.serverHeading">
              {t("settings.serverHeading")}
            </h3>
          </div>
          <div className="form">
            <Field>
              <label htmlFor="server-port" data-i18n="settings.serverPort">
                {t("settings.serverPort")}
              </label>
              <input
                id="server-port"
                name="server_port"
                type="number"
                min="1"
                max="65535"
                step="1"
                inputMode="numeric"
                value={String(values["server-port"] ?? "")}
                onChange={(event) =>
                  onChange("server-port", event.currentTarget.value)
                }
                aria-invalid={Boolean(errors["server_port"])}
              />
              <p className="field-hint" data-i18n="settings.serverPortHint">
                {t("settings.serverPortHint")}
              </p>
              <p
                id="server-port-error"
                className="field-error"
                role="alert"
                hidden={!errors["server_port"]}
              >
                {errors["server_port"]}
              </p>
            </Field>
          </div>
        </section>
        <section className="panel" aria-labelledby="network-proxy-heading">
          <div className="panel__header">
            <h3 id="network-proxy-heading" data-i18n="conn.socks5Proxy">
              {t("conn.socks5Proxy")}
            </h3>
          </div>
          <div className="form">
            <p className="field-hint" data-i18n="conn.socks5Intro">
              {t("conn.socks5Intro")}
            </p>
            <Field>
              <label
                htmlFor="network-socks5-address"
                data-i18n="conn.proxyAddress"
              >
                {t("conn.proxyAddress")}
              </label>
              <input
                id="network-socks5-address"
                name="network_socks5_address"
                type="text"
                autoComplete="off"
                spellCheck="false"
                inputMode="text"
                placeholder="127.0.0.1:1080"
                value={String(values["network-socks5-address"] ?? "")}
                onChange={(event) =>
                  onChange("network-socks5-address", event.currentTarget.value)
                }
                aria-invalid={Boolean(errors["network_socks5_address"])}
              />
              <p
                id="network-socks5-address-error"
                className="field-error"
                role="alert"
                hidden={!errors["network_socks5_address"]}
              >
                {errors["network_socks5_address"]}
              </p>
            </Field>
            <Field>
              <label htmlFor="network-socks5-username">
                <span data-i18n="conn.username">{t("conn.username")}</span>
                <span className="field-optional" data-i18n="conn.optional">
                  {t("conn.optional")}
                </span>
              </label>
              <input
                id="network-socks5-username"
                name="network_socks5_username"
                type="text"
                autoComplete="off"
                spellCheck="false"
                value={String(values["network-socks5-username"] ?? "")}
                onChange={(event) =>
                  onChange("network-socks5-username", event.currentTarget.value)
                }
                aria-invalid={Boolean(errors["network_socks5_username"])}
              />
            </Field>
            <Field>
              <label htmlFor="network-socks5-password">
                <span data-i18n="conn.password">{t("conn.password")}</span>
                <span className="field-optional" data-i18n="conn.optional">
                  {t("conn.optional")}
                </span>
              </label>
              <input
                id="network-socks5-password"
                name="network_socks5_password"
                type="password"
                autoComplete="off"
                value={String(values["network-socks5-password"] ?? "")}
                onChange={(event) =>
                  onChange("network-socks5-password", event.currentTarget.value)
                }
                aria-invalid={Boolean(errors["network_socks5_password"])}
              />
              <p className="field-hint" data-i18n="conn.keepPasswordHint">
                {t("conn.keepPasswordHint")}
              </p>
            </Field>
          </div>
        </section>
      </section>
    </>
  );
}
export function DataFields({ values, errors, onChange }: SettingsFieldsProps) {
  const { t } = useLocale();
  return (
    <>
      <section
        id="viewer-stats-panel"
        className="panel"
        aria-labelledby="viewer-stats-heading"
      >
        <div className="panel__header">
          <h3 id="viewer-stats-heading" data-i18n="iface.viewerStats">
            {t("iface.viewerStats")}
          </h3>
        </div>
        <div className="form form--compact">
          <Field>
            <label
              htmlFor="activity-interval-seconds"
              data-i18n="iface.activityIntervalSeconds"
            >
              {t("iface.activityIntervalSeconds")}
            </label>
            <input
              id="activity-interval-seconds"
              name="activity_interval_seconds"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={String(values["activity-interval-seconds"] ?? "")}
              onChange={(event) =>
                onChange("activity-interval-seconds", event.currentTarget.value)
              }
              aria-invalid={Boolean(errors["activity_interval_seconds"])}
            />
            <p
              className="field-hint"
              data-i18n="iface.activityIntervalSecondsHint"
            >
              {t("iface.activityIntervalSecondsHint")}
            </p>
            <p
              id="activity-interval-seconds-error"
              className="field-error"
              role="alert"
              hidden={!errors["activity_interval_seconds"]}
            >
              {errors["activity_interval_seconds"]}
            </p>
          </Field>
          <Field>
            <label
              htmlFor="activity-session-limit"
              data-i18n="iface.activitySessionLimit"
            >
              {t("iface.activitySessionLimit")}
            </label>
            <input
              id="activity-session-limit"
              name="activity_session_limit"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={String(values["activity-session-limit"] ?? "")}
              onChange={(event) =>
                onChange("activity-session-limit", event.currentTarget.value)
              }
              aria-invalid={Boolean(errors["activity_session_limit"])}
            />
            <p
              className="field-hint"
              data-i18n="iface.activitySessionLimitHint"
            >
              {t("iface.activitySessionLimitHint")}
            </p>
            <p
              id="activity-session-limit-error"
              className="field-error"
              role="alert"
              hidden={!errors["activity_session_limit"]}
            >
              {errors["activity_session_limit"]}
            </p>
          </Field>
          <Field>
            <label htmlFor="activity-xp" data-i18n="iface.activityXP">
              {t("iface.activityXP")}
            </label>
            <input
              id="activity-xp"
              name="activity_xp"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={String(values["activity-xp"] ?? "")}
              onChange={(event) =>
                onChange("activity-xp", event.currentTarget.value)
              }
              aria-invalid={Boolean(errors["activity_xp"])}
            />
            <p className="field-hint" data-i18n="iface.activityXPHint">
              {t("iface.activityXPHint")}
            </p>
            <p
              id="activity-xp-error"
              className="field-error"
              role="alert"
              hidden={!errors["activity_xp"]}
            >
              {errors["activity_xp"]}
            </p>
          </Field>
          <Field>
            <label
              htmlFor="buffs-per-award-per-viewer"
              data-i18n="iface.buffsPerAwardPerViewer"
            >
              {t("iface.buffsPerAwardPerViewer")}
            </label>
            <input
              id="buffs-per-award-per-viewer"
              name="buffs_per_award_per_viewer"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              aria-describedby="buffs-per-award-per-viewer-hint buffs-per-award-per-viewer-error"
              value={String(values["buffs-per-award-per-viewer"] ?? "")}
              onChange={(event) =>
                onChange(
                  "buffs-per-award-per-viewer",
                  event.currentTarget.value,
                )
              }
              aria-invalid={Boolean(errors["buffs_per_award_per_viewer"])}
            />
            <p
              id="buffs-per-award-per-viewer-hint"
              className="field-hint"
              data-i18n="iface.buffsPerAwardPerViewerHint"
            >
              {t("iface.buffsPerAwardPerViewerHint")}
            </p>
            <p
              id="buffs-per-award-per-viewer-error"
              className="field-error"
              role="alert"
              hidden={!errors["buffs_per_award_per_viewer"]}
            >
              {errors["buffs_per_award_per_viewer"]}
            </p>
          </Field>
          <Field>
            <label
              htmlFor="buff-max-unique-viewers"
              data-i18n="iface.buffMaxUniqueViewers"
            >
              {t("iface.buffMaxUniqueViewers")}
            </label>
            <input
              id="buff-max-unique-viewers"
              name="buff_max_unique_viewers"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              aria-describedby="buff-max-unique-viewers-hint buff-max-unique-viewers-error"
              value={String(values["buff-max-unique-viewers"] ?? "")}
              onChange={(event) =>
                onChange("buff-max-unique-viewers", event.currentTarget.value)
              }
              aria-invalid={Boolean(errors["buff_max_unique_viewers"])}
            />
            <p
              id="buff-max-unique-viewers-hint"
              className="field-hint"
              data-i18n="iface.buffMaxUniqueViewersHint"
            >
              {t("iface.buffMaxUniqueViewersHint")}
            </p>
            <p
              id="buff-max-unique-viewers-error"
              className="field-error"
              role="alert"
              hidden={!errors["buff_max_unique_viewers"]}
            >
              {errors["buff_max_unique_viewers"]}
            </p>
          </Field>
          <Field>
            <label htmlFor="day-reset-hour" data-i18n="iface.dayResetHour">
              {t("iface.dayResetHour")}
            </label>
            <input
              id="day-reset-hour"
              name="day_reset_hour"
              type="number"
              min="0"
              max="23"
              step="1"
              inputMode="numeric"
              value={String(values["day-reset-hour"] ?? "")}
              onChange={(event) =>
                onChange("day-reset-hour", event.currentTarget.value)
              }
              aria-invalid={Boolean(errors["day_reset_hour"])}
            />
            <p className="field-hint" data-i18n="iface.dayResetHourHint">
              {t("iface.dayResetHourHint")}
            </p>
            <p
              id="day-reset-hour-error"
              className="field-error"
              role="alert"
              hidden={!errors["day_reset_hour"]}
            >
              {errors["day_reset_hour"]}
            </p>
          </Field>
          <Field>
            <label
              htmlFor="streamer-display-name"
              data-i18n="iface.streamerDisplayName"
            >
              {t("iface.streamerDisplayName")}
            </label>
            <input
              id="streamer-display-name"
              name="streamer_display_name"
              type="text"
              maxLength={64}
              autoComplete="name"
              value={String(values["streamer-display-name"] ?? "")}
              onChange={(event) =>
                onChange("streamer-display-name", event.currentTarget.value)
              }
              aria-invalid={Boolean(errors["streamer_display_name"])}
            />
            <p className="field-hint" data-i18n="iface.streamerDisplayNameHint">
              {t("iface.streamerDisplayNameHint")}
            </p>
            <p
              id="streamer-display-name-error"
              className="field-error"
              role="alert"
              hidden={!errors["streamer_display_name"]}
            >
              {errors["streamer_display_name"]}
            </p>
          </Field>
          <Field>
            <label className="checkbox" htmlFor="hide-command-messages">
              <input
                id="hide-command-messages"
                name="hide_command_messages"
                type="checkbox"
                checked={Boolean(values["hide-command-messages"])}
                onChange={(event) =>
                  onChange("hide-command-messages", event.currentTarget.checked)
                }
                aria-invalid={Boolean(errors["hide_command_messages"])}
              />
              <span data-i18n="iface.hideCommandMessages">
                {t("iface.hideCommandMessages")}
              </span>
            </label>
            <p className="field-hint" data-i18n="iface.hideCommandMessagesHint">
              {t("iface.hideCommandMessagesHint")}
            </p>
          </Field>
          <Field>
            <label className="checkbox" htmlFor="hide-command-cooldown-overlay">
              <input
                id="hide-command-cooldown-overlay"
                name="hide_command_cooldown_overlay"
                type="checkbox"
                checked={Boolean(values["hide-command-cooldown-overlay"])}
                onChange={(event) =>
                  onChange(
                    "hide-command-cooldown-overlay",
                    event.currentTarget.checked,
                  )
                }
                aria-invalid={Boolean(errors["hide_command_cooldown_overlay"])}
              />
              <span data-i18n="iface.hideCommandCooldownOverlay">
                {t("iface.hideCommandCooldownOverlay")}
              </span>
            </label>
            <p
              className="field-hint"
              data-i18n="iface.hideCommandCooldownOverlayHint"
            >
              {t("iface.hideCommandCooldownOverlayHint")}
            </p>
          </Field>
          <Field>
            <label className="checkbox" htmlFor="custom-avatars-enabled">
              <input
                id="custom-avatars-enabled"
                name="custom_avatars_enabled"
                type="checkbox"
                checked={Boolean(values["custom-avatars-enabled"])}
                onChange={(event) =>
                  onChange(
                    "custom-avatars-enabled",
                    event.currentTarget.checked,
                  )
                }
                aria-invalid={Boolean(errors["custom_avatars_enabled"])}
              />
              <span data-i18n="iface.customAvatarsEnabled">
                {t("iface.customAvatarsEnabled")}
              </span>
            </label>
            <p
              className="field-hint"
              data-i18n="iface.customAvatarsEnabledHint"
            >
              {t("iface.customAvatarsEnabledHint")}
            </p>
          </Field>
        </div>
      </section>
      <section
        id="leaderboard-visibility-panel"
        className="panel"
        aria-labelledby="leaderboard-visibility-heading"
      >
        <div className="panel__header">
          <h3
            id="leaderboard-visibility-heading"
            data-i18n="leaderboardVisibility.heading"
          >
            {t("leaderboardVisibility.heading")}
          </h3>
        </div>
        <div className="form form--compact">
          <Field>
            <label
              htmlFor="leaderboard-visibility-policy"
              data-i18n="leaderboardVisibility.policy"
            >
              {t("leaderboardVisibility.policy")}
            </label>
            <select
              id="leaderboard-visibility-policy"
              name="leaderboard_visibility_policy"
              value={String(values["leaderboard-visibility-policy"] ?? "")}
              onChange={(event) =>
                onChange(
                  "leaderboard-visibility-policy",
                  event.currentTarget.value,
                )
              }
              aria-invalid={Boolean(errors["leaderboard_visibility_policy"])}
            >
              <option
                value="always"
                data-i18n="leaderboardVisibility.policyAlways"
              >
                {t("leaderboardVisibility.policyAlways")}
              </option>
              <option
                value="automatic"
                data-i18n="leaderboardVisibility.policyAutomatic"
              >
                {t("leaderboardVisibility.policyAutomatic")}
              </option>
              <option
                value="on_request"
                data-i18n="leaderboardVisibility.policyOnRequest"
              >
                {t("leaderboardVisibility.policyOnRequest")}
              </option>
            </select>
            <p
              id="leaderboard-visibility-policy-hint"
              className="field-hint"
              data-i18n="leaderboardVisibility.globalHint"
            >
              {t(
                values["leaderboard-visibility-policy"] === "on_request"
                  ? "leaderboardVisibility.onRequestHint"
                  : values["leaderboard-visibility-policy"] === "always"
                    ? "leaderboardVisibility.alwaysHint"
                    : "leaderboardVisibility.automaticHint",
              )}
            </p>
            <p
              id="leaderboard-visibility-policy-error"
              className="field-error"
              role="alert"
              hidden={!errors["leaderboard_visibility_policy"]}
            >
              {errors["leaderboard_visibility_policy"]}
            </p>
          </Field>
          <Field>
            <label
              htmlFor="leaderboard-visibility-display-seconds"
              data-i18n="leaderboardVisibility.displaySeconds"
            >
              {t("leaderboardVisibility.displaySeconds")}
            </label>
            <input
              id="leaderboard-visibility-display-seconds"
              type="number"
              min="5"
              max="60"
              step="1"
              inputMode="numeric"
              value={String(
                values["leaderboard-visibility-display-seconds"] ?? "",
              )}
              onChange={(event) =>
                onChange(
                  "leaderboard-visibility-display-seconds",
                  event.currentTarget.value,
                )
              }
              aria-invalid={Boolean(
                errors["leaderboard_visibility_display_seconds"],
              )}
            />
            <p
              id="leaderboard-visibility-display-seconds-error"
              className="field-error"
              role="alert"
              hidden={!errors["leaderboard_visibility_display_seconds"]}
            >
              {errors["leaderboard_visibility_display_seconds"]}
            </p>
          </Field>
          <Field  data-leaderboard-automatic-control="">
            <label
              htmlFor="leaderboard-visibility-cooldown-seconds"
              data-i18n="leaderboardVisibility.cooldownSeconds"
            >
              {t("leaderboardVisibility.cooldownSeconds")}
            </label>
            <input
              id="leaderboard-visibility-cooldown-seconds"
              disabled={values["leaderboard-visibility-policy"] !== "automatic"}
              type="number"
              min="0"
              max="3600"
              step="1"
              inputMode="numeric"
              value={String(
                values["leaderboard-visibility-cooldown-seconds"] ?? "",
              )}
              onChange={(event) =>
                onChange(
                  "leaderboard-visibility-cooldown-seconds",
                  event.currentTarget.value,
                )
              }
              aria-invalid={Boolean(
                errors["leaderboard_visibility_cooldown_seconds"],
              )}
            />
            <p
              id="leaderboard-visibility-cooldown-seconds-error"
              className="field-error"
              role="alert"
              hidden={!errors["leaderboard_visibility_cooldown_seconds"]}
            >
              {errors["leaderboard_visibility_cooldown_seconds"]}
            </p>
          </Field>
          <Field  data-leaderboard-automatic-control="">
            <label
              htmlFor="leaderboard-visibility-dirty-interval-seconds"
              data-i18n="leaderboardVisibility.dirtyIntervalSeconds"
            >
              {t("leaderboardVisibility.dirtyIntervalSeconds")}
            </label>
            <input
              id="leaderboard-visibility-dirty-interval-seconds"
              disabled={values["leaderboard-visibility-policy"] !== "automatic"}
              type="number"
              min="0"
              max="3600"
              step="1"
              inputMode="numeric"
              value={String(
                values["leaderboard-visibility-dirty-interval-seconds"] ?? "",
              )}
              onChange={(event) =>
                onChange(
                  "leaderboard-visibility-dirty-interval-seconds",
                  event.currentTarget.value,
                )
              }
              aria-invalid={Boolean(
                errors["leaderboard_visibility_dirty_interval_seconds"],
              )}
            />
            <p
              className="field-hint"
              data-i18n="leaderboardVisibility.dirtyIntervalHint"
            >
              {t("leaderboardVisibility.dirtyIntervalHint")}
            </p>
            <p
              id="leaderboard-visibility-dirty-interval-seconds-error"
              className="field-error"
              role="alert"
              hidden={!errors["leaderboard_visibility_dirty_interval_seconds"]}
            >
              {errors["leaderboard_visibility_dirty_interval_seconds"]}
            </p>
          </Field>
          <Field  data-leaderboard-automatic-control="">
            <label
              className="checkbox"
              htmlFor="leaderboard-visibility-show-on-award"
            >
              <input
                id="leaderboard-visibility-show-on-award"
                disabled={
                  values["leaderboard-visibility-policy"] !== "automatic"
                }
                type="checkbox"
                checked={Boolean(
                  values["leaderboard-visibility-show-on-award"],
                )}
                onChange={(event) =>
                  onChange(
                    "leaderboard-visibility-show-on-award",
                    event.currentTarget.checked,
                  )
                }
                aria-invalid={Boolean(
                  errors["leaderboard_visibility_show_on_award"],
                )}
              />
              <span data-i18n="leaderboardVisibility.showOnAward">
                {t("leaderboardVisibility.showOnAward")}
              </span>
            </label>
          </Field>
          <Field  data-leaderboard-automatic-control="">
            <label
              className="checkbox"
              htmlFor="leaderboard-visibility-show-on-rank-change"
            >
              <input
                id="leaderboard-visibility-show-on-rank-change"
                disabled={
                  values["leaderboard-visibility-policy"] !== "automatic"
                }
                type="checkbox"
                checked={Boolean(
                  values["leaderboard-visibility-show-on-rank-change"],
                )}
                onChange={(event) =>
                  onChange(
                    "leaderboard-visibility-show-on-rank-change",
                    event.currentTarget.checked,
                  )
                }
                aria-invalid={Boolean(
                  errors["leaderboard_visibility_show_on_rank_change"],
                )}
              />
              <span data-i18n="leaderboardVisibility.showOnRankChange">
                {t("leaderboardVisibility.showOnRankChange")}
              </span>
            </label>
          </Field>
        </div>
      </section>
    </>
  );
}
export function ApplicationFields({
  values,
  errors,
  onChange,
  onAction,
}: SettingsFieldsProps) {
  const { t } = useLocale();
  return (
    <>
      <section
        id="interface-language-panel"
        className="panel"
        aria-labelledby="time-display-heading"
      >
        <div className="panel__header">
          <h3 id="time-display-heading" data-i18n="iface.language">
            {t("iface.language")}
          </h3>
        </div>
        <div className="form form--compact">
          <Field>
            <label htmlFor="time-locale" data-i18n="iface.language">
              {t("iface.language")}
            </label>
            <select
              id="time-locale"
              name="time_locale"
              value={String(values["time-locale"] ?? "")}
              onChange={(event) =>
                onChange("time-locale", event.currentTarget.value)
              }
              aria-invalid={Boolean(errors["time_locale"])}
            >
              <option value="ru-RU" data-i18n="iface.localeRu">
                {t("iface.localeRu")}
              </option>
              <option value="en-GB" data-i18n="iface.localeEn">
                {t("iface.localeEn")}
              </option>
            </select>
            <p className="field-hint" data-i18n="iface.languageHint">
              {t("iface.languageHint")}
            </p>
            <p
              id="time-locale-error"
              className="field-error"
              role="alert"
              hidden={!errors["time_locale"]}
            >
              {errors["time_locale"]}
            </p>
          </Field>
        </div>
      </section>
      <section
        id="message-sound-panel"
        className="panel"
        aria-labelledby="message-sound-panel-heading"
      >
        <div className="panel__header">
          <h3 id="message-sound-panel-heading" data-i18n="sound.alertTone">
            {t("sound.alertTone")}
          </h3>
          <Button
            id="test-message-sound"
            type="button"
            className="button-secondary"
            data-i18n="sound.test"
            onClick={() => onAction("sound")}
          >
            {t("sound.test")}
          </Button>
        </div>
        <div className="form form--compact">
          <Field>
            <label className="checkbox" htmlFor="command-sound-enabled">
              <input
                id="command-sound-enabled"
                name="command_sound_enabled"
                type="checkbox"
                checked={Boolean(values["command-sound-enabled"])}
                onChange={(event) => onChange("command-sound-enabled", event.currentTarget.checked)}
                aria-describedby="command-sound-hint"
              />
              <span>{t("sound.playCommands")}</span>
            </label>
            <p id="command-sound-hint" className="hint">{t("sound.commandHint")}</p>
          </Field>
          <Field>
            <label className="checkbox" htmlFor="message-sound-enabled">
              <input
                id="message-sound-enabled"
                name="message_sound_enabled"
                type="checkbox"
                checked={Boolean(values["message-sound-enabled"])}
                onChange={(event) =>
                  onChange("message-sound-enabled", event.currentTarget.checked)
                }
                aria-invalid={Boolean(errors["message_sound_enabled"])}
              />
              <span data-i18n="sound.playOnMessage">
                {t("sound.playOnMessage")}
              </span>
            </label>
          </Field>
          <Field>
            <label htmlFor="message-sound-volume" data-i18n="sound.volume">
              {t("sound.volume")}
            </label>
            <div className="volume-control">
              <input
                id="message-sound-volume"
                name="message_sound_volume"
                type="range"
                min="0"
                max="100"
                step="1"
                value={String(values["message-sound-volume"] ?? "")}
                onChange={(event) =>
                  onChange("message-sound-volume", event.currentTarget.value)
                }
                aria-invalid={Boolean(errors["message_sound_volume"])}
              />
              <output
                id="message-sound-volume-label"
                htmlFor="message-sound-volume"
              >
                {String(values["message-sound-volume"]) + "%"}
              </output>
            </div>
            <p
              id="message-sound-volume-error"
              className="field-error"
              role="alert"
              hidden={!errors["message_sound_volume"]}
            >
              {errors["message_sound_volume"]}
            </p>
          </Field>
          <Field>
            <label htmlFor="message-sound-type" data-i18n="sound.soundType">
              {t("sound.soundType")}
            </label>
            <select
              id="message-sound-type"
              name="message_sound_type"
              value={String(values["message-sound-type"] ?? "")}
              onChange={(event) =>
                onChange("message-sound-type", event.currentTarget.value)
              }
              aria-invalid={Boolean(errors["message_sound_type"])}
            >
              <option value="chime" data-i18n="sound.chime">
                {t("sound.chime")}
              </option>
              <option value="ping" data-i18n="sound.ping">
                {t("sound.ping")}
              </option>
              <option value="soft" data-i18n="sound.soft">
                {t("sound.soft")}
              </option>
              <option value="alert" data-i18n="sound.alert">
                {t("sound.alert")}
              </option>
            </select>
            <p
              id="message-sound-type-error"
              className="field-error"
              role="alert"
              hidden={!errors["message_sound_type"]}
            >
              {errors["message_sound_type"]}
            </p>
          </Field>
        </div>
      </section>
      <div id="rich-chat-settings-mount" className="rich-chat-settings-mount">
        <section className="panel" aria-labelledby="emote-providers-heading">
          <div className="panel__header">
            <h3 id="emote-providers-heading" data-i18n="rich.emoteProviders">
              {t("rich.emoteProviders")}
            </h3>
          </div>
          <div className="form form--compact">
            <Field>
              <label className="checkbox" htmlFor="emotes-twitch">
                <input
                  id="emotes-twitch"
                  name="emotes_twitch"
                  type="checkbox"
                  checked={Boolean(values["emotes-twitch"])}
                  onChange={(event) =>
                    onChange("emotes-twitch", event.currentTarget.checked)
                  }
                  aria-invalid={Boolean(errors["emotes_twitch"])}
                />
                <span data-i18n="rich.twitchEmotes">
                  {t("rich.twitchEmotes")}
                </span>
              </label>
            </Field>
            <Field>
              <label className="checkbox" htmlFor="emotes-youtube">
                <input
                  id="emotes-youtube"
                  name="emotes_youtube"
                  type="checkbox"
                  checked={Boolean(values["emotes-youtube"])}
                  onChange={(event) =>
                    onChange("emotes-youtube", event.currentTarget.checked)
                  }
                  aria-invalid={Boolean(errors["emotes_youtube"])}
                />
                <span data-i18n="rich.youtubeEmoji">
                  {t("rich.youtubeEmoji")}
                </span>
              </label>
            </Field>
            <Field>
              <label className="checkbox" htmlFor="emotes-vk">
                <input
                  id="emotes-vk"
                  name="emotes_vk"
                  type="checkbox"
                  checked={Boolean(values["emotes-vk"])}
                  onChange={(event) =>
                    onChange("emotes-vk", event.currentTarget.checked)
                  }
                  aria-invalid={Boolean(errors["emotes_vk"])}
                />
                <span data-i18n="rich.vkEmoji">{t("rich.vkEmoji")}</span>
              </label>
            </Field>
            <Field>
              <label className="checkbox" htmlFor="emotes-ffz">
                <input
                  id="emotes-ffz"
                  name="emotes_ffz"
                  type="checkbox"
                  checked={Boolean(values["emotes-ffz"])}
                  onChange={(event) =>
                    onChange("emotes-ffz", event.currentTarget.checked)
                  }
                  aria-invalid={Boolean(errors["emotes_ffz"])}
                />
                <span data-i18n="rich.ffz">{t("rich.ffz")}</span>
              </label>
            </Field>
            <Field>
              <label className="checkbox" htmlFor="emotes-bttv">
                <input
                  id="emotes-bttv"
                  name="emotes_bttv"
                  type="checkbox"
                  checked={Boolean(values["emotes-bttv"])}
                  onChange={(event) =>
                    onChange("emotes-bttv", event.currentTarget.checked)
                  }
                  aria-invalid={Boolean(errors["emotes_bttv"])}
                />
                <span data-i18n="rich.bttv">{t("rich.bttv")}</span>
              </label>
            </Field>
            <Field>
              <label className="checkbox" htmlFor="emotes-7tv">
                <input
                  id="emotes-7tv"
                  name="emotes_7tv"
                  type="checkbox"
                  checked={Boolean(values["emotes-7tv"])}
                  onChange={(event) =>
                    onChange("emotes-7tv", event.currentTarget.checked)
                  }
                  aria-invalid={Boolean(errors["emotes_7tv"])}
                />
                <span data-i18n="rich.sevenTv">{t("rich.sevenTv")}</span>
              </label>
            </Field>
          </div>
        </section>
        <section className="panel" aria-labelledby="image-previews-heading">
          <div className="panel__header">
            <h3 id="image-previews-heading" data-i18n="rich.imagePreviews">
              {t("rich.imagePreviews")}
            </h3>
          </div>
          <div className="form form--compact">
            <Field>
              <label className="checkbox" htmlFor="image-previews-enabled">
                <input
                  id="image-previews-enabled"
                  name="image_previews_enabled"
                  type="checkbox"
                  checked={Boolean(values["image-previews-enabled"])}
                  onChange={(event) =>
                    onChange(
                      "image-previews-enabled",
                      event.currentTarget.checked,
                    )
                  }
                  aria-invalid={Boolean(errors["image_previews_enabled"])}
                />
                <span data-i18n="rich.enablePreviews">
                  {t("rich.enablePreviews")}
                </span>
              </label>
              <p className="field-hint" data-i18n="rich.previewsHint">
                {t("rich.previewsHint")}
              </p>
            </Field>
            <Field>
              <label
                htmlFor="image-previews-allowed-hosts"
                data-i18n="rich.allowedHosts"
              >
                {t("rich.allowedHosts")}
              </label>
              <textarea
                id="image-previews-allowed-hosts"
                name="image_previews_allowed_hosts"
                rows={5}
                spellCheck="false"
                autoComplete="off"
                value={String(values["image-previews-allowed-hosts"] ?? "")}
                onChange={(event) =>
                  onChange(
                    "image-previews-allowed-hosts",
                    event.currentTarget.value,
                  )
                }
                aria-invalid={Boolean(errors["image_previews_allowed_hosts"])}
              ></textarea>
              <p className="field-hint" data-i18n="rich.hostsHint">
                {t("rich.hostsHint")}
              </p>
              <p
                id="image-previews-allowed-hosts-error"
                className="field-error"
                role="alert"
                hidden={!errors["image_previews_allowed_hosts"]}
              >
                {errors["image_previews_allowed_hosts"]}
              </p>
            </Field>
            <Field>
              <label
                htmlFor="image-previews-max-width"
                data-i18n="rich.maxWidth"
              >
                {t("rich.maxWidth")}
              </label>
              <input
                id="image-previews-max-width"
                name="image_previews_max_width_px"
                type="number"
                min="32"
                max="1920"
                step="1"
                value={String(values["image-previews-max-width"] ?? "")}
                onChange={(event) =>
                  onChange(
                    "image-previews-max-width",
                    event.currentTarget.value,
                  )
                }
                aria-invalid={Boolean(errors["image_previews_max_width_px"])}
              />
              <p
                id="image-previews-max-width-error"
                className="field-error"
                role="alert"
                hidden={!errors["image_previews_max_width_px"]}
              >
                {errors["image_previews_max_width_px"]}
              </p>
            </Field>
            <Field>
              <label
                htmlFor="image-previews-max-height"
                data-i18n="rich.maxHeight"
              >
                {t("rich.maxHeight")}
              </label>
              <input
                id="image-previews-max-height"
                name="image_previews_max_height_px"
                type="number"
                min="32"
                max="1080"
                step="1"
                value={String(values["image-previews-max-height"] ?? "")}
                onChange={(event) =>
                  onChange(
                    "image-previews-max-height",
                    event.currentTarget.value,
                  )
                }
                aria-invalid={Boolean(errors["image_previews_max_height_px"])}
              />
              <p
                id="image-previews-max-height-error"
                className="field-error"
                role="alert"
                hidden={!errors["image_previews_max_height_px"]}
              >
                {errors["image_previews_max_height_px"]}
              </p>
            </Field>
            <Field>
              <label
                htmlFor="image-previews-max-per-message"
                data-i18n="rich.maxPerMessage"
              >
                {t("rich.maxPerMessage")}
              </label>
              <input
                id="image-previews-max-per-message"
                name="image_previews_max_per_message"
                type="number"
                min="1"
                max="5"
                step="1"
                value={String(values["image-previews-max-per-message"] ?? "")}
                onChange={(event) =>
                  onChange(
                    "image-previews-max-per-message",
                    event.currentTarget.value,
                  )
                }
                aria-invalid={Boolean(errors["image_previews_max_per_message"])}
              />
              <p
                id="image-previews-max-per-message-error"
                className="field-error"
                role="alert"
                hidden={!errors["image_previews_max_per_message"]}
              >
                {errors["image_previews_max_per_message"]}
              </p>
            </Field>
          </div>
        </section>
      </div>
    </>
  );
}
