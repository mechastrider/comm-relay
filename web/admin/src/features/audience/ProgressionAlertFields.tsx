import { useLocale } from "../../app/locale";
import type { ProgressionFieldProps } from "./progression-fields";
export function ProgressionAlertFields({
  values,
  errors,
  busy,
  change,
}: ProgressionFieldProps) {
  const { t } = useLocale();
  return (
    <>
      <label className="checkbox">
        <input
          id="progression-level-alert-enabled"
          type="checkbox"
          checked={Boolean(values["progression-level-alert-enabled"])}
          onChange={(event) =>
            change("progression-level-alert-enabled", event.target.checked)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-level-alert-enabled"]}
          aria-describedby={"progression-level-alert-enabled-error"}
        />
        <p
          id="progression-level-alert-enabled-error"
          className="field-error"
          role="alert"
          hidden={!errors["progression-level-alert-enabled"]}
        >
          {errors["progression-level-alert-enabled"]}
        </p>
        <span data-i18n="progression.levelAlerts">
          {t("progression.levelAlerts")}
        </span>
      </label>
      <label className="checkbox">
        <input
          id="progression-achievement-alert-enabled"
          type="checkbox"
          checked={Boolean(values["progression-achievement-alert-enabled"])}
          onChange={(event) =>
            change(
              "progression-achievement-alert-enabled",
              event.target.checked,
            )
          }
          disabled={busy}
          aria-invalid={!!errors["progression-achievement-alert-enabled"]}
          aria-describedby={"progression-achievement-alert-enabled-error"}
        />
        <p
          id="progression-achievement-alert-enabled-error"
          className="field-error"
          role="alert"
          hidden={!errors["progression-achievement-alert-enabled"]}
        >
          {errors["progression-achievement-alert-enabled"]}
        </p>
        <span data-i18n="progression.achievementAlerts">
          {t("progression.achievementAlerts")}
        </span>
      </label>
      <label htmlFor="progression-alert-layout" data-i18n="catalog.layoutLabel">
        {t("catalog.layoutLabel")}
      </label>
      <select
        id="progression-alert-layout"
        value={String(values["progression-alert-layout"] ?? "")}
        onChange={(event) =>
          change("progression-alert-layout", event.target.value)
        }
        disabled={busy}
        aria-invalid={!!errors["progression-alert-layout"]}
        aria-describedby={"progression-alert-layout-error"}
      >
        <option value="card" data-i18n="catalog.layoutCard">
          {t("catalog.layoutCard")}
        </option>
        <option value="banner" data-i18n="catalog.layoutBanner">
          {t("catalog.layoutBanner")}
        </option>
        <option value="fullscreen" data-i18n="catalog.layoutFullscreen">
          {t("catalog.layoutFullscreen")}
        </option>
      </select>
      <p
        id="progression-alert-layout-error"
        className="field-error"
        role="alert"
        hidden={!errors["progression-alert-layout"]}
      >
        {errors["progression-alert-layout"]}
      </p>
      <label htmlFor="progression-alert-sound" data-i18n="catalog.soundLabel">
        {t("catalog.soundLabel")}
      </label>
      <input
        id="progression-alert-sound"
        type="text"
        maxLength={128}
        value={String(values["progression-alert-sound"] ?? "")}
        onChange={(event) =>
          change("progression-alert-sound", event.target.value)
        }
        disabled={busy}
        aria-invalid={!!errors["progression-alert-sound"]}
        aria-describedby={"progression-alert-sound-error"}
      />
      <p
        id="progression-alert-sound-error"
        className="field-error"
        role="alert"
        hidden={!errors["progression-alert-sound"]}
      >
        {errors["progression-alert-sound"]}
      </p>
      <label htmlFor="progression-alert-volume" data-i18n="catalog.volumeLabel">
        {t("catalog.volumeLabel")}
      </label>
      <input
        id="progression-alert-volume"
        type="range"
        min="0"
        max="100"
        step="1"
        value={String(values["progression-alert-volume"] ?? "")}
        onChange={(event) =>
          change("progression-alert-volume", event.target.value)
        }
        disabled={busy}
        aria-invalid={!!errors["progression-alert-volume"]}
        aria-describedby={"progression-alert-volume-error"}
      />
      <p
        id="progression-alert-volume-error"
        className="field-error"
        role="alert"
        hidden={!errors["progression-alert-volume"]}
      >
        {errors["progression-alert-volume"]}
      </p>
      <label
        htmlFor="progression-alert-duration"
        data-i18n="catalog.durationLabel"
      >
        {t("catalog.durationLabel")}
      </label>
      <input
        id="progression-alert-duration"
        type="number"
        min="1000"
        max="30000"
        value={String(values["progression-alert-duration"] ?? "")}
        onChange={(event) =>
          change("progression-alert-duration", event.target.value)
        }
        disabled={busy}
        aria-invalid={!!errors["progression-alert-duration"]}
        aria-describedby={"progression-alert-duration-error"}
      />
      <p
        id="progression-alert-duration-error"
        className="field-error"
        role="alert"
        hidden={!errors["progression-alert-duration"]}
      >
        {errors["progression-alert-duration"]}
      </p>
    </>
  );
}
