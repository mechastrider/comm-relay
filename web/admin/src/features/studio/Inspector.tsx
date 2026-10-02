import { useRef, useEffect, useState, type ReactNode } from "react";
import { useLocale } from "../../app/locale";
import type { Surface, Values } from "./model";
export function Inspector({
  values,
  errors,
  busy,
  surface,
  change,
  reset,
  upload,
  themes,
}: {
  values: Values;
  errors: Record<string, string>;
  busy: boolean;
  surface: Surface;
  change: (id: string, value: string | boolean) => void;
  reset: (group: string) => void;
  upload: (file: File) => void;
  themes: ReactNode;
}) {
  const { t } = useLocale();
  const body = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const update = () => setScrollable(el.scrollHeight > el.clientHeight);
    const resize = new ResizeObserver(update);
    resize.observe(el);
    for (const child of el.children) resize.observe(child);
    el.addEventListener("toggle", update, true);
    update();
    return () => {
      resize.disconnect();
      el.removeEventListener("toggle", update, true);
    };
  }, []);
  return (
    <div className="overlay-settings-column studio-inspector">
      <section className="panel overlay-appearance-panel">
        <div
          ref={body}
          className={
            "panel__body studio-inspector__body" +
            (scrollable ? " studio-inspector__body--scrollable" : "")
          }
        >
          <p className="panel-intro" data-i18n="studio.sharedPresetIntro">
            {t("studio.sharedPresetIntro")}
          </p>
          <div className="studio-inspector-essential form form--compact">
            <h3
              className="overlay-section-title form__field--full"
              data-i18n="studio.sharedPresetLook"
            >
              {t("studio.sharedPresetLook")}
            </h3>
            <div className="form__field form__field--full studio-theme-field">
              <span
                id="overlay-theme-label"
                className="field-label"
                data-i18n="obs.theme"
              >
                {t("obs.theme")}
              </span>
              <select
                id="overlay-theme"
                name="overlay_theme"
                className="visually-hidden"
                tabIndex={-1}
                aria-hidden="true"
                value={String(values["overlay-theme"] ?? "")}
                disabled={busy}
                onChange={(event) =>
                  change("overlay-theme", event.target.value)
                }
                aria-invalid={!!errors["overlay-theme"]}
              >
                <option value="default" data-i18n="obs.themeDefault">
                  {t("obs.themeDefault")}
                </option>
                <option value="dashboard" data-i18n="obs.themeTextOnly">
                  {t("obs.themeTextOnly")}
                </option>
                <option value="cockpit_panel" data-i18n="obs.themeCockpitPanel">
                  {t("obs.themeCockpitPanel")}
                </option>
                <option
                  value="cockpit_popups"
                  data-i18n="obs.themeCockpitPopups"
                >
                  {t("obs.themeCockpitPopups")}
                </option>
                <option value="g_rebels_popups" data-i18n="obs.themeGRebels">
                  {t("obs.themeGRebels")}
                </option>
              </select>
              <div
                id="overlay-theme-picker"
                className="theme-picker"
                role="radiogroup"
                aria-labelledby="overlay-theme-label"
              >
                {themes}
              </div>
              <p className="field-hint" data-i18n="obs.themeHint">
                {t("obs.themeHint")}
              </p>
              <p
                id="overlay-theme-error"
                className="field-error"
                role="alert"
                hidden={!errors["overlay-theme"]}
              >
                {errors["overlay-theme"]}
              </p>
            </div>
            <div
              id="studio-essential-font-chat"
              className="form__field overlay-chat-only"
              hidden={surface !== "chat"}
            >
              <label htmlFor="overlay-font-size" data-i18n="obs.fontSize">
                {t("obs.fontSize")}
              </label>
              <input
                id="overlay-font-size"
                name="overlay_font_size_px"
                type="number"
                min="12"
                max="48"
                step="1"
                value={String(values["overlay-font-size"] ?? "")}
                disabled={busy}
                onChange={(event) =>
                  change("overlay-font-size", event.target.value)
                }
                aria-invalid={!!errors["overlay-font-size"]}
              />
              <p className="field-hint" data-i18n="obs.fontSizeHint">
                {t("obs.fontSizeHint")}
              </p>
              <p
                id="overlay-font-size-error"
                className="field-error"
                role="alert"
                hidden={!errors["overlay-font-size"]}
              >
                {errors["overlay-font-size"]}
              </p>
            </div>
            <div
              id="studio-essential-font-leaderboard"
              className="form__field"
              hidden={surface !== "leaderboard"}
            >
              <label
                htmlFor="overlay-leaderboard-sizing-mode"
                data-i18n="obs.leaderboardSizing"
              >
                {t("obs.leaderboardSizing")}
              </label>
              <select
                id="overlay-leaderboard-sizing-mode"
                name="overlay_leaderboard_sizing_mode"
                value={String(values["overlay-leaderboard-sizing-mode"] ?? "")}
                disabled={busy}
                onChange={(event) =>
                  change("overlay-leaderboard-sizing-mode", event.target.value)
                }
                aria-invalid={!!errors["overlay-leaderboard-sizing-mode"]}
              >
                <option value="auto" data-i18n="obs.leaderboardSizingAuto">
                  {t("obs.leaderboardSizingAuto")}
                </option>
                <option value="fixed" data-i18n="obs.leaderboardSizingFixed">
                  {t("obs.leaderboardSizingFixed")}
                </option>
              </select>
              <p className="field-hint" data-i18n="obs.leaderboardSizingHint">
                {t("obs.leaderboardSizingHint")}
              </p>
              <p
                id="overlay-leaderboard-sizing-mode-error"
                className="field-error"
                role="alert"
                hidden={!errors["overlay-leaderboard-sizing-mode"]}
              >
                {errors["overlay-leaderboard-sizing-mode"]}
              </p>
            </div>
            <div
              id="studio-essential-leaderboard-title"
              className="form__field"
              hidden={surface !== "leaderboard"}
            >
              <label
                htmlFor="overlay-leaderboard-title-mode"
                data-i18n="obs.leaderboardTitleMode"
              >
                {t("obs.leaderboardTitleMode")}
              </label>
              <select
                id="overlay-leaderboard-title-mode"
                name="overlay_leaderboard_title_mode"
                value={String(values["overlay-leaderboard-title-mode"] ?? "")}
                disabled={busy}
                onChange={(event) =>
                  change("overlay-leaderboard-title-mode", event.target.value)
                }
                aria-invalid={!!errors["overlay-leaderboard-title-mode"]}
              >
                <option value="theme" data-i18n="obs.leaderboardTitleTheme">
                  {t("obs.leaderboardTitleTheme")}
                </option>
                <option value="custom" data-i18n="obs.leaderboardTitleCustom">
                  {t("obs.leaderboardTitleCustom")}
                </option>
                <option value="hidden" data-i18n="obs.leaderboardTitleHidden">
                  {t("obs.leaderboardTitleHidden")}
                </option>
              </select>
              <p
                id="overlay-leaderboard-title-mode-error"
                className="field-error"
                role="alert"
                hidden={!errors["overlay-leaderboard-title-mode"]}
              >
                {errors["overlay-leaderboard-title-mode"]}
              </p>
              <div
                id="overlay-leaderboard-custom-title-field"
                className="conditional-field"
                hidden={values["overlay-leaderboard-title-mode"] !== "custom"}
              >
                <label
                  htmlFor="overlay-leaderboard-title"
                  data-i18n="obs.leaderboardCustomTitle"
                >
                  {t("obs.leaderboardCustomTitle")}
                </label>
                <input
                  id="overlay-leaderboard-title"
                  name="overlay_leaderboard_title"
                  type="text"
                  maxLength={64}
                  autoComplete="off"
                  aria-describedby="overlay-leaderboard-title-hint"
                  value={String(values["overlay-leaderboard-title"] ?? "")}
                  disabled={busy}
                  onChange={(event) =>
                    change("overlay-leaderboard-title", event.target.value)
                  }
                  aria-invalid={!!errors["overlay-leaderboard-title"]}
                />
                <p
                  id="overlay-leaderboard-title-hint"
                  className="field-hint"
                  data-i18n="obs.leaderboardTitleHint"
                >
                  {t("obs.leaderboardTitleHint")}
                </p>
                <p
                  id="overlay-leaderboard-title-error"
                  className="field-error"
                  role="alert"
                  hidden={!errors["overlay-leaderboard-title"]}
                >
                  {errors["overlay-leaderboard-title"]}
                </p>
              </div>
            </div>
            <div
              id="studio-essential-leaderboard-messages"
              className="form__field"
              hidden={surface !== "leaderboard"}
            >
              <label
                className="checkbox"
                htmlFor="overlay-leaderboard-show-message-count"
              >
                <input
                  id="overlay-leaderboard-show-message-count"
                  type="checkbox"
                  checked={Boolean(
                    values["overlay-leaderboard-show-message-count"],
                  )}
                  disabled={busy}
                  onChange={(event) =>
                    change(
                      "overlay-leaderboard-show-message-count",
                      event.target.checked,
                    )
                  }
                  aria-invalid={
                    !!errors["overlay-leaderboard-show-message-count"]
                  }
                />
                <span data-i18n="obs.leaderboardShowMessages">
                  {t("obs.leaderboardShowMessages")}
                </span>
              </label>
              <p
                className="field-hint"
                data-i18n="obs.leaderboardShowMessagesHint"
              >
                {t("obs.leaderboardShowMessagesHint")}
              </p>
            </div>
            <div
              id="studio-essential-leaderboard-titles"
              className="form__field"
              hidden={surface !== "leaderboard"}
            >
              <label
                className="checkbox"
                htmlFor="overlay-leaderboard-show-viewer-titles"
              >
                <input
                  id="overlay-leaderboard-show-viewer-titles"
                  type="checkbox"
                  checked={Boolean(
                    values["overlay-leaderboard-show-viewer-titles"],
                  )}
                  disabled={busy}
                  onChange={(event) =>
                    change(
                      "overlay-leaderboard-show-viewer-titles",
                      event.target.checked,
                    )
                  }
                  aria-invalid={
                    !!errors["overlay-leaderboard-show-viewer-titles"]
                  }
                />
                <span data-i18n="obs.leaderboardShowViewerTitles">
                  {t("obs.leaderboardShowViewerTitles")}
                </span>
              </label>
              <p
                className="field-hint"
                data-i18n="obs.leaderboardShowViewerTitlesHint"
              >
                {t("obs.leaderboardShowViewerTitlesHint")}
              </p>
            </div>
            <div
              id="studio-essential-duration"
              className="form__field form__field--full overlay-chat-only"
              hidden={surface !== "chat"}
            >
              <span
                id="overlay-duration-label"
                className="field-label"
                data-i18n="obs.messageDuration"
              >
                {t("obs.messageDuration")}
              </span>
              <div
                id="overlay-duration-chips"
                className="duration-chips"
                role="radiogroup"
                aria-labelledby="overlay-duration-label"
              >
                <button
                  className="duration-chip"
                  type="button"
                  role="radio"
                  data-ttl="8"
                  data-i18n="obs.duration8s"
                  id="studio-field-action-0"
                  disabled={busy}
                  onClick={() => change("overlay-message-ttl", "8")}
                  aria-checked={String(values["overlay-message-ttl"]) === "8"}
                >
                  {t("obs.duration8s")}
                </button>
                <button
                  className="duration-chip"
                  type="button"
                  role="radio"
                  data-ttl="20"
                  data-i18n="obs.duration20s"
                  id="studio-field-action-1"
                  disabled={busy}
                  onClick={() => change("overlay-message-ttl", "20")}
                  aria-checked={String(values["overlay-message-ttl"]) === "20"}
                >
                  {t("obs.duration20s")}
                </button>
                <button
                  className="duration-chip"
                  type="button"
                  role="radio"
                  data-ttl="0"
                  data-i18n="obs.durationUntilReplaced"
                  id="studio-field-action-2"
                  disabled={busy}
                  onClick={() => change("overlay-message-ttl", "0")}
                  aria-checked={String(values["overlay-message-ttl"]) === "0"}
                >
                  {t("obs.durationUntilReplaced")}
                </button>
              </div>
            </div>
            <div
              id="studio-essential-period"
              className="form__field"
              hidden={true}
            >
              <label
                htmlFor="overlay-leaderboard-period"
                data-i18n="obs.leaderboardPeriod"
              >
                {t("obs.leaderboardPeriod")}
              </label>
              <select
                id="overlay-leaderboard-period"
                value={String(values["overlay-leaderboard-period"] ?? "")}
                disabled={busy}
                onChange={(event) =>
                  change("overlay-leaderboard-period", event.target.value)
                }
                aria-invalid={!!errors["overlay-leaderboard-period"]}
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
              id="studio-essential-alerts-image-size"
              className="form__field form__field--full"
              hidden={surface !== "alerts"}
            >
              <label
                htmlFor="overlay-alerts-image-size"
                data-i18n="obs.alertsImageSizeLabel"
              >
                {t("obs.alertsImageSizeLabel")}
              </label>
              <div className="catalog-volume-row">
                <input
                  id="overlay-alerts-image-size"
                  type="range"
                  min="25"
                  max="300"
                  step="5"
                  value={String(values["overlay-alerts-image-size"] ?? "")}
                  disabled={busy}
                  onChange={(event) =>
                    change("overlay-alerts-image-size", event.target.value)
                  }
                  aria-invalid={!!errors["overlay-alerts-image-size"]}
                />
                <output
                  id="overlay-alerts-image-size-value"
                  htmlFor="overlay-alerts-image-size"
                >
                  {values["overlay-alerts-image-size"]}%
                </output>
              </div>
              <p className="field-hint" data-i18n="obs.alertsImageSizeHint">
                {t("obs.alertsImageSizeHint")}
              </p>
              <p
                id="overlay-alerts-image-size-error"
                className="field-error"
                role="alert"
                hidden={!errors["overlay-alerts-image-size"]}
              >
                {errors["overlay-alerts-image-size"]}
              </p>
            </div>
            <div
              id="studio-essential-font-alerts"
              className="form__field form__field--full"
              hidden={surface !== "alerts"}
            >
              <label
                htmlFor="overlay-alerts-sizing-mode"
                data-i18n="obs.alertsSizing"
              >
                {t("obs.alertsSizing")}
              </label>
              <select
                id="overlay-alerts-sizing-mode"
                name="overlay_alerts_sizing_mode"
                value={String(values["overlay-alerts-sizing-mode"] ?? "")}
                disabled={busy}
                onChange={(event) =>
                  change("overlay-alerts-sizing-mode", event.target.value)
                }
                aria-invalid={!!errors["overlay-alerts-sizing-mode"]}
              >
                <option value="auto" data-i18n="obs.alertsSizingAuto">
                  {t("obs.alertsSizingAuto")}
                </option>
                <option value="fixed" data-i18n="obs.alertsSizingFixed">
                  {t("obs.alertsSizingFixed")}
                </option>
              </select>
              <p className="field-hint" data-i18n="obs.alertsSizingHint">
                {t("obs.alertsSizingHint")}
              </p>
              <p
                id="overlay-alerts-sizing-mode-error"
                className="field-error"
                role="alert"
                hidden={!errors["overlay-alerts-sizing-mode"]}
              >
                {errors["overlay-alerts-sizing-mode"]}
              </p>
              <label
                htmlFor="overlay-alerts-font-size"
                data-i18n="obs.alertsFontSize"
              >
                {t("obs.alertsFontSize")}
              </label>
              <input
                id="overlay-alerts-font-size"
                name="overlay_alerts_font_size_px"
                type="number"
                min="12"
                max="48"
                step="1"
                value={String(values["overlay-alerts-font-size"] ?? "")}
                disabled={busy}
                onChange={(event) =>
                  change("overlay-alerts-font-size", event.target.value)
                }
                aria-invalid={!!errors["overlay-alerts-font-size"]}
              />
              <p
                id="overlay-alerts-font-auto-hint"
                className="field-hint"
                data-i18n="obs.alertsFontSizeAutoHint"
                hidden={values["overlay-alerts-sizing-mode"] === "fixed"}
              >
                {t("obs.alertsFontSizeAutoHint")}
              </p>
              <p
                id="overlay-alerts-font-fixed-hint"
                className="field-hint"
                data-i18n="obs.alertsFontSizeHint"
                hidden={values["overlay-alerts-sizing-mode"] !== "fixed"}
              >
                {t("obs.alertsFontSizeHint")}
              </p>
              <p
                id="overlay-alerts-font-size-error"
                className="field-error"
                role="alert"
                hidden={!errors["overlay-alerts-font-size"]}
              >
                {errors["overlay-alerts-font-size"]}
              </p>
            </div>
            <div
              id="studio-essential-alerts-note"
              className="studio-surface-note form__field form__field--full"
              hidden={surface !== "alerts"}
            >
              <strong data-i18n="studio.alertsSettingsTitle">
                {t("studio.alertsSettingsTitle")}
              </strong>
              <span data-i18n="studio.alertsSharedOnly">
                {t("studio.alertsSharedOnly")}
              </span>
            </div>
          </div>
          <details
            className="overlay-group studio-inspector-advanced"
            id="studio-inspector-advanced"
            data-studio-all-only=""
          >
            <summary data-i18n="studio.advanced">
              {t("studio.advanced")}
            </summary>
            <div className="form form--compact form--overlay-display">
              <div className="form__field">
                <label htmlFor="overlay-text-edge" data-i18n="obs.textEdge">
                  {t("obs.textEdge")}
                </label>
                <select
                  id="overlay-text-edge"
                  value={String(values["overlay-text-edge"] ?? "")}
                  disabled={busy}
                  onChange={(event) =>
                    change("overlay-text-edge", event.target.value)
                  }
                  aria-invalid={!!errors["overlay-text-edge"]}
                >
                  <option value="none" data-i18n="obs.textEdgeNone">
                    {t("obs.textEdgeNone")}
                  </option>
                  <option value="shadow" data-i18n="obs.textEdgeShadow">
                    {t("obs.textEdgeShadow")}
                  </option>
                  <option value="outline" data-i18n="obs.textEdgeOutline">
                    {t("obs.textEdgeOutline")}
                  </option>
                </select>
              </div>
              <div className="form__field">
                <label
                  htmlFor="overlay-text-edge-strength"
                  data-i18n="obs.textEdgeStrength"
                >
                  {t("obs.textEdgeStrength")}
                </label>
                <input
                  id="overlay-text-edge-strength"
                  type="number"
                  min="0"
                  max="8"
                  step="1"
                  inputMode="numeric"
                  value={String(values["overlay-text-edge-strength"] ?? "")}
                  disabled={busy}
                  onChange={(event) =>
                    change("overlay-text-edge-strength", event.target.value)
                  }
                  aria-invalid={!!errors["overlay-text-edge-strength"]}
                />
              </div>
              <h3
                id="studio-selected-surface-heading"
                className="overlay-section-title form__field--full"
                data-i18n="studio.surfaceChatSettings"
              >
                {t(
                  "studio.surface" +
                    surface[0].toUpperCase() +
                    surface.slice(1) +
                    "Settings",
                )}
              </h3>
              <div id="overlay-chat-fields" className="overlay-surface-fields">
                <div className="form__field">
                  <label htmlFor="overlay-display-mode" data-i18n="obs.spacing">
                    {t("obs.spacing")}
                  </label>
                  <select
                    id="overlay-display-mode"
                    name="overlay_display_mode"
                    value={String(values["overlay-display-mode"] ?? "")}
                    disabled={busy}
                    onChange={(event) =>
                      change("overlay-display-mode", event.target.value)
                    }
                    aria-invalid={!!errors["overlay-display-mode"]}
                  >
                    <option value="normal" data-i18n="obs.comfortable">
                      {t("obs.comfortable")}
                    </option>
                    <option value="compact" data-i18n="obs.compact">
                      {t("obs.compact")}
                    </option>
                  </select>
                  <p className="field-hint" data-i18n="obs.spacingHint">
                    {t("obs.spacingHint")}
                  </p>
                  <p
                    id="overlay-display-mode-error"
                    className="field-error"
                    role="alert"
                    hidden={!errors["overlay-display-mode"]}
                  >
                    {errors["overlay-display-mode"]}
                  </p>
                </div>
                <div className="form__field form__field--full">
                  <label
                    htmlFor="overlay-platform-marker"
                    data-i18n="obs.platformMarker"
                  >
                    {t("obs.platformMarker")}
                  </label>
                  <select
                    id="overlay-platform-marker"
                    value={String(values["overlay-platform-marker"] ?? "")}
                    disabled={busy}
                    onChange={(event) =>
                      change("overlay-platform-marker", event.target.value)
                    }
                    aria-invalid={!!errors["overlay-platform-marker"]}
                  >
                    <option value="stripe" data-i18n="obs.markerStripe">
                      {t("obs.markerStripe")}
                    </option>
                    <option value="icon" data-i18n="obs.markerIcon">
                      {t("obs.markerIcon")}
                    </option>
                    <option value="both" data-i18n="obs.markerBoth">
                      {t("obs.markerBoth")}
                    </option>
                    <option value="none" data-i18n="obs.markerNone">
                      {t("obs.markerNone")}
                    </option>
                  </select>
                  <button
                    className="button-secondary button-secondary--small"
                    type="button"
                    data-overlay-reset-group="basics"
                    data-i18n="obs.resetGroup"
                    id="studio-field-action-3"
                    disabled={busy}
                    onClick={() => reset("basics")}
                  >
                    {t("obs.resetGroup")}
                  </button>
                </div>
              </div>
              <div
                id="overlay-leaderboard-fields"
                className="overlay-surface-fields"
                hidden={surface !== "leaderboard"}
              >
                <div
                  id="overlay-leaderboard-fixed-field"
                  className="form__field"
                  hidden={values["overlay-leaderboard-sizing-mode"] !== "fixed"}
                >
                  <label
                    htmlFor="overlay-leaderboard-font-size"
                    data-i18n="obs.leaderboardFontSize"
                  >
                    {t("obs.leaderboardFontSize")}
                  </label>
                  <input
                    id="overlay-leaderboard-font-size"
                    name="overlay_leaderboard_font_size_px"
                    type="number"
                    min="12"
                    max="48"
                    step="1"
                    inputMode="numeric"
                    aria-describedby="overlay-leaderboard-font-size-hint"
                    value={String(
                      values["overlay-leaderboard-font-size"] ?? "",
                    )}
                    disabled={busy}
                    onChange={(event) =>
                      change(
                        "overlay-leaderboard-font-size",
                        event.target.value,
                      )
                    }
                    aria-invalid={!!errors["overlay-leaderboard-font-size"]}
                  />
                  <p
                    id="overlay-leaderboard-font-size-hint"
                    className="field-hint"
                    data-i18n="obs.leaderboardFontSizeHint"
                  >
                    {t("obs.leaderboardFontSizeHint")}
                  </p>
                  <p
                    id="overlay-leaderboard-font-size-error"
                    className="field-error"
                    role="alert"
                    hidden={!errors["overlay-leaderboard-font-size"]}
                  >
                    {errors["overlay-leaderboard-font-size"]}
                  </p>
                </div>
                <div className="form__field">
                  <label
                    htmlFor="overlay-leaderboard-max-entries-all"
                    data-i18n="obs.leaderboardMaxEntries"
                  >
                    {t("obs.leaderboardMaxEntries")}
                  </label>
                  <input
                    id="overlay-leaderboard-max-entries-all"
                    name="overlay_leaderboard_max_entries"
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    inputMode="numeric"
                    aria-describedby="overlay-leaderboard-max-entries-hint"
                    value={String(
                      values["overlay-leaderboard-max-entries-all"] ?? "",
                    )}
                    disabled={busy}
                    onChange={(event) =>
                      change(
                        "overlay-leaderboard-max-entries-all",
                        event.target.value,
                      )
                    }
                    aria-invalid={
                      !!errors["overlay-leaderboard-max-entries-all"]
                    }
                  />
                  <p
                    id="overlay-leaderboard-max-entries-hint"
                    className="field-hint"
                    data-i18n="obs.leaderboardMaxEntriesHint"
                  >
                    {t("obs.leaderboardMaxEntriesHint")}
                  </p>
                  <p
                    id="overlay-leaderboard-max-entries-error"
                    className="field-error"
                    role="alert"
                    hidden={!errors["overlay-leaderboard-max-entries"]}
                  >
                    {errors["overlay-leaderboard-max-entries"]}
                  </p>
                </div>
                <div className="form__field">
                  <label
                    htmlFor="overlay-leaderboard-layout"
                    data-i18n="obs.leaderboardLayout"
                  >
                    {t("obs.leaderboardLayout")}
                  </label>
                  <select
                    id="overlay-leaderboard-layout"
                    value={String(values["overlay-leaderboard-layout"] ?? "")}
                    disabled={busy}
                    onChange={(event) =>
                      change("overlay-leaderboard-layout", event.target.value)
                    }
                    aria-invalid={!!errors["overlay-leaderboard-layout"]}
                  >
                    <option
                      value="panel"
                      data-i18n="obs.leaderboardLayoutPanel"
                    >
                      {t("obs.leaderboardLayoutPanel")}
                    </option>
                    <option
                      value="chips"
                      data-i18n="obs.leaderboardLayoutChips"
                    >
                      {t("obs.leaderboardLayoutChips")}
                    </option>
                  </select>
                  <p
                    className="field-hint"
                    data-i18n="obs.leaderboardLayoutHint"
                  >
                    {t("obs.leaderboardLayoutHint")}
                  </p>
                </div>
                <div className="form__field form__field--full">
                  <button
                    id="overlay-leaderboard-reset"
                    className="button-secondary button-secondary--small"
                    type="button"
                    data-i18n="obs.leaderboardReset"
                    disabled={busy}
                    onClick={() => reset("leaderboard")}
                  >
                    {t("obs.leaderboardReset")}
                  </button>
                </div>
              </div>
              <details className="overlay-group">
                <summary data-i18n="obs.textGroup">
                  {t("obs.textGroup")}
                </summary>
                <div className="form form--compact">
                  <div className="form__field">
                    <label
                      htmlFor="overlay-font-family"
                      data-i18n="obs.fontFamily"
                    >
                      {t("obs.fontFamily")}
                    </label>
                    <select
                      id="overlay-font-family"
                      value={String(values["overlay-font-family"] ?? "")}
                      disabled={busy}
                      onChange={(event) =>
                        change("overlay-font-family", event.target.value)
                      }
                      aria-invalid={!!errors["overlay-font-family"]}
                    >
                      <option value="system" data-i18n="obs.fontSystem">
                        {t("obs.fontSystem")}
                      </option>
                      <option value="segoe" data-i18n="obs.fontSegoe">
                        {t("obs.fontSegoe")}
                      </option>
                      <option value="georgia" data-i18n="obs.fontGeorgia">
                        {t("obs.fontGeorgia")}
                      </option>
                      <option value="trebuchet" data-i18n="obs.fontTrebuchet">
                        {t("obs.fontTrebuchet")}
                      </option>
                      <option value="mono" data-i18n="obs.fontMono">
                        {t("obs.fontMono")}
                      </option>
                    </select>
                  </div>
                  <div className="form__field">
                    <label
                      htmlFor="overlay-line-height"
                      data-i18n="obs.lineHeight"
                    >
                      {t("obs.lineHeight")}
                    </label>
                    <input
                      id="overlay-line-height"
                      type="number"
                      min="1"
                      max="2"
                      step="0.05"
                      inputMode="decimal"
                      value={String(values["overlay-line-height"] ?? "")}
                      disabled={busy}
                      onChange={(event) =>
                        change("overlay-line-height", event.target.value)
                      }
                      aria-invalid={!!errors["overlay-line-height"]}
                    />
                  </div>
                  <div className="form__field form__field--full">
                    <button
                      className="button-secondary button-secondary--small"
                      type="button"
                      data-overlay-reset-group="text"
                      data-i18n="obs.resetGroup"
                      id="studio-field-action-5"
                      disabled={busy}
                      onClick={() => reset("text")}
                    >
                      {t("obs.resetGroup")}
                    </button>
                  </div>
                </div>
              </details>
              <details className="overlay-group">
                <summary data-i18n="obs.surfaceGroup">
                  {t("obs.surfaceGroup")}
                </summary>
                <p className="field-hint" data-i18n="obs.surfaceHint">
                  {t("obs.surfaceHint")}
                </p>
                <div className="form form--compact">
                  <div className="form__field">
                    <label
                      htmlFor="overlay-panel-color"
                      data-i18n="obs.panelColor"
                    >
                      {t("obs.panelColor")}
                    </label>
                    <input
                      id="overlay-panel-color"
                      type="color"
                      value={String(values["overlay-panel-color"] ?? "")}
                      disabled={busy}
                      onChange={(event) =>
                        change("overlay-panel-color", event.target.value)
                      }
                      aria-invalid={!!errors["overlay-panel-color"]}
                    />
                  </div>
                  <div className="form__field">
                    <label
                      id="overlay-panel-opacity-label"
                      htmlFor="overlay-panel-opacity"
                      data-i18n="obs.panelOpacity"
                    >
                      {t("obs.panelOpacity")}
                    </label>
                    <input
                      id="overlay-panel-opacity"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      inputMode="decimal"
                      aria-describedby="overlay-panel-opacity-hint"
                      data-field-hint-id="overlay-panel-opacity-hint"
                      value={String(values["overlay-panel-opacity"] ?? "")}
                      disabled={busy}
                      onChange={(event) =>
                        change("overlay-panel-opacity", event.target.value)
                      }
                      aria-invalid={!!errors["overlay-panel-opacity"]}
                    />
                    <p
                      id="overlay-panel-opacity-hint"
                      className="field-hint"
                      data-i18n="obs.panelOpacityHint"
                    >
                      {t("obs.panelOpacityHint")}
                    </p>
                    <p
                      id="overlay-panel-opacity-error"
                      className="field-error"
                      role="alert"
                      hidden={!errors["overlay-panel-opacity"]}
                    >
                      {errors["overlay-panel-opacity"]}
                    </p>
                  </div>
                  <div className="form__field form__field--full">
                    <label
                      htmlFor="overlay-panel-image-file"
                      data-i18n="obs.panelImage"
                    >
                      {t("obs.panelImage")}
                    </label>
                    <input
                      id="overlay-panel-image"
                      type="hidden"
                      value={String(values["overlay-panel-image"] ?? "")}
                      disabled={busy}
                      onChange={(event) =>
                        change("overlay-panel-image", event.target.value)
                      }
                      aria-invalid={!!errors["overlay-panel-image"]}
                    />
                    <div className="panel-image-controls">
                      <input
                        id="overlay-panel-image-file"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        disabled={busy}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) upload(file);
                        }}
                        aria-invalid={!!errors["overlay-panel-image-file"]}
                      />
                      <img
                        id="overlay-panel-image-preview"
                        className="panel-image-preview"
                        alt=""
                        width="72"
                        height="40"
                        hidden={!values["overlay-panel-image"]}
                        src={
                          values["overlay-panel-image"]
                            ? "/overlay/assets/" +
                              encodeURIComponent(
                                String(values["overlay-panel-image"]),
                              )
                            : undefined
                        }
                      />
                      <button
                        id="overlay-panel-image-clear"
                        className="button-secondary button-secondary--small"
                        type="button"
                        data-i18n="obs.clearImage"
                        disabled={busy}
                        onClick={() => change("overlay-panel-image", "")}
                      >
                        {t("obs.clearImage")}
                      </button>
                      <p
                        id="overlay-panel-image-error"
                        className="field-error"
                        role="alert"
                        hidden={!errors["overlay-panel-image"]}
                      >
                        {errors["overlay-panel-image"]}
                      </p>
                    </div>
                    <div
                      id="overlay-panel-image-options"
                      className="panel-image-options"
                      hidden={!values["overlay-panel-image"]}
                    >
                      <div className="form__field form__field--full">
                        <label
                          id="overlay-panel-image-fit-label"
                          data-i18n="obs.panelImageFit"
                        >
                          {t("obs.panelImageFit")}
                        </label>
                        <input
                          id="overlay-panel-image-fit"
                          type="hidden"
                          value={String(
                            values["overlay-panel-image-fit"] ?? "",
                          )}
                          disabled={busy}
                          onChange={(event) =>
                            change(
                              "overlay-panel-image-fit",
                              event.target.value,
                            )
                          }
                          aria-invalid={!!errors["overlay-panel-image-fit"]}
                        />
                        <div
                          className="icon-choice-group"
                          role="radiogroup"
                          aria-labelledby="overlay-panel-image-fit-label"
                        >
                          <button
                            className="icon-choice icon-choice--active has-tooltip"
                            type="button"
                            role="radio"
                            data-panel-image-fit="cover"
                            data-i18n-aria-label="obs.panelImageFitCover"
                            id="studio-field-action-7"
                            disabled={busy}
                            onClick={() =>
                              change("overlay-panel-image-fit", "cover")
                            }
                            aria-checked={
                              values["overlay-panel-image-fit"] === "cover"
                            }
                            aria-label={t("obs.panelImageFitCover")}
                          >
                            <svg
                              className="icon-choice__icon"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <rect
                                x="4"
                                y="6"
                                width="16"
                                height="12"
                                rx="1.5"
                              ></rect>
                              <path
                                d="M4 10h16M10 6v12"
                                stroke-opacity="0.45"
                              ></path>
                              <rect
                                x="2"
                                y="4"
                                width="20"
                                height="16"
                                rx="1"
                                stroke-dasharray="2 2"
                                stroke-opacity="0.55"
                              ></rect>
                            </svg>
                            <span
                              className="ui-tooltip"
                              role="tooltip"
                              data-i18n="obs.panelImageFitCover"
                            >
                              {t("obs.panelImageFitCover")}
                            </span>
                          </button>
                          <button
                            className="icon-choice has-tooltip"
                            type="button"
                            role="radio"
                            data-panel-image-fit="contain"
                            data-i18n-aria-label="obs.panelImageFitContain"
                            id="studio-field-action-8"
                            disabled={busy}
                            onClick={() =>
                              change("overlay-panel-image-fit", "contain")
                            }
                            aria-checked={
                              values["overlay-panel-image-fit"] === "contain"
                            }
                            aria-label={t("obs.panelImageFitContain")}
                          >
                            <svg
                              className="icon-choice__icon"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <rect
                                x="3"
                                y="5"
                                width="18"
                                height="14"
                                rx="1.5"
                              ></rect>
                              <rect
                                x="7.5"
                                y="8.5"
                                width="9"
                                height="7"
                                rx="1"
                                fill="currentColor"
                                fill-opacity="0.22"
                              ></rect>
                            </svg>
                            <span
                              className="ui-tooltip"
                              role="tooltip"
                              data-i18n="obs.panelImageFitContain"
                            >
                              {t("obs.panelImageFitContain")}
                            </span>
                          </button>
                          <button
                            className="icon-choice has-tooltip"
                            type="button"
                            role="radio"
                            data-panel-image-fit="fill"
                            data-i18n-aria-label="obs.panelImageFitFill"
                            id="studio-field-action-9"
                            disabled={busy}
                            onClick={() =>
                              change("overlay-panel-image-fit", "fill")
                            }
                            aria-checked={
                              values["overlay-panel-image-fit"] === "fill"
                            }
                            aria-label={t("obs.panelImageFitFill")}
                          >
                            <svg
                              className="icon-choice__icon"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <rect
                                x="4"
                                y="6"
                                width="16"
                                height="12"
                                rx="1.5"
                              ></rect>
                              <path
                                d="M8 9 6 7M16 9l2-2M8 15l-2 2M16 15l2 2"
                                strokeLinecap="round"
                              ></path>
                            </svg>
                            <span
                              className="ui-tooltip"
                              role="tooltip"
                              data-i18n="obs.panelImageFitFill"
                            >
                              {t("obs.panelImageFitFill")}
                            </span>
                          </button>
                          <button
                            className="icon-choice has-tooltip"
                            type="button"
                            role="radio"
                            data-panel-image-fit="tile"
                            data-i18n-aria-label="obs.panelImageFitTile"
                            id="studio-field-action-10"
                            disabled={busy}
                            onClick={() =>
                              change("overlay-panel-image-fit", "tile")
                            }
                            aria-checked={
                              values["overlay-panel-image-fit"] === "tile"
                            }
                            aria-label={t("obs.panelImageFitTile")}
                          >
                            <svg
                              className="icon-choice__icon"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <rect
                                x="3"
                                y="5"
                                width="18"
                                height="14"
                                rx="1.5"
                              ></rect>
                              <path d="M3 11h18M11 5v14"></path>
                            </svg>
                            <span
                              className="ui-tooltip"
                              role="tooltip"
                              data-i18n="obs.panelImageFitTile"
                            >
                              {t("obs.panelImageFitTile")}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div className="form__field">
                        <label
                          htmlFor="overlay-panel-image-scope"
                          data-i18n="obs.panelImageScope"
                        >
                          {t("obs.panelImageScope")}
                        </label>
                        <select
                          id="overlay-panel-image-scope"
                          value={String(
                            values["overlay-panel-image-scope"] ?? "",
                          )}
                          disabled={busy}
                          onChange={(event) =>
                            change(
                              "overlay-panel-image-scope",
                              event.target.value,
                            )
                          }
                          aria-invalid={!!errors["overlay-panel-image-scope"]}
                        >
                          <option
                            value="message"
                            data-i18n="obs.panelImageScopeMessage"
                          >
                            {t("obs.panelImageScopeMessage")}
                          </option>
                          <option
                            value="column"
                            data-i18n="obs.panelImageScopeColumn"
                          >
                            {t("obs.panelImageScopeColumn")}
                          </option>
                        </select>
                      </div>
                      <p
                        className="field-hint"
                        data-i18n="obs.panelImageOptionsHint"
                      >
                        {t("obs.panelImageOptionsHint")}
                      </p>
                    </div>
                  </div>
                  <div className="form__field">
                    <label
                      htmlFor="overlay-border-color"
                      data-i18n="obs.borderColor"
                    >
                      {t("obs.borderColor")}
                    </label>
                    <input
                      id="overlay-border-color"
                      type="color"
                      value={String(values["overlay-border-color"] ?? "")}
                      disabled={busy}
                      onChange={(event) =>
                        change("overlay-border-color", event.target.value)
                      }
                      aria-invalid={!!errors["overlay-border-color"]}
                    />
                  </div>
                  <div className="form__field">
                    <label
                      htmlFor="overlay-border-width"
                      data-i18n="obs.borderWidth"
                    >
                      {t("obs.borderWidth")}
                    </label>
                    <input
                      id="overlay-border-width"
                      type="number"
                      min="0"
                      max="8"
                      step="1"
                      inputMode="numeric"
                      value={String(values["overlay-border-width"] ?? "")}
                      disabled={busy}
                      onChange={(event) =>
                        change("overlay-border-width", event.target.value)
                      }
                      aria-invalid={!!errors["overlay-border-width"]}
                    />
                  </div>
                  <div className="form__field">
                    <label
                      htmlFor="overlay-border-radius"
                      data-i18n="obs.borderRadius"
                    >
                      {t("obs.borderRadius")}
                    </label>
                    <input
                      id="overlay-border-radius"
                      type="number"
                      min="0"
                      max="24"
                      step="1"
                      inputMode="numeric"
                      value={String(values["overlay-border-radius"] ?? "")}
                      disabled={busy}
                      onChange={(event) =>
                        change("overlay-border-radius", event.target.value)
                      }
                      aria-invalid={!!errors["overlay-border-radius"]}
                    />
                  </div>
                  <div className="form__field form__field--full">
                    <button
                      className="button-secondary button-secondary--small"
                      type="button"
                      data-overlay-reset-group="surface"
                      data-i18n="obs.resetGroup"
                      id="studio-field-action-11"
                      disabled={busy}
                      onClick={() => reset("surface")}
                    >
                      {t("obs.resetGroup")}
                    </button>
                  </div>
                </div>
              </details>
              <div
                className="overlay-queue-group overlay-chat-only"
                id="studio-chat-only-2"
                hidden={surface !== "chat"}
              >
                <h3
                  className="overlay-queue-group__title"
                  data-i18n="obs.queueGroup"
                >
                  {t("obs.queueGroup")}
                </h3>
                <div className="form form--compact">
                  <div className="form__field">
                    <label
                      htmlFor="overlay-max-messages"
                      data-i18n="obs.maxMessages"
                    >
                      {t("obs.maxMessages")}
                    </label>
                    <input
                      id="overlay-max-messages"
                      name="overlay_max_messages"
                      type="number"
                      min="1"
                      step="1"
                      value={String(values["overlay-max-messages"] ?? "")}
                      disabled={busy}
                      onChange={(event) =>
                        change("overlay-max-messages", event.target.value)
                      }
                      aria-invalid={!!errors["overlay-max-messages"]}
                    />
                    <p
                      id="overlay-max-messages-error"
                      className="field-error"
                      role="alert"
                      hidden={!errors["overlay-max-messages"]}
                    >
                      {errors["overlay-max-messages"]}
                    </p>
                  </div>
                  <div className="form__field">
                    <label
                      htmlFor="overlay-message-ttl"
                      data-i18n="obs.messageTtl"
                    >
                      {t("obs.messageTtl")}
                    </label>
                    <input
                      id="overlay-message-ttl"
                      name="overlay_message_ttl_seconds"
                      type="number"
                      min="0"
                      step="1"
                      value={String(values["overlay-message-ttl"] ?? "")}
                      disabled={busy}
                      onChange={(event) =>
                        change("overlay-message-ttl", event.target.value)
                      }
                      aria-invalid={!!errors["overlay-message-ttl"]}
                    />
                    <p className="field-hint" data-i18n="obs.ttlHint">
                      {t("obs.ttlHint")}
                    </p>
                    <p
                      id="overlay-message-ttl-error"
                      className="field-error"
                      role="alert"
                      hidden={!errors["overlay-message-ttl"]}
                    >
                      {errors["overlay-message-ttl"]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
