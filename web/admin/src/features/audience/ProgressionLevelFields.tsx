import { useLocale } from "../../app/locale";
import type { ProgressionFieldProps } from "./progression-fields";
import { LevelBadge } from "../../components/ViewerVisuals";
import { LEVEL_EMBLEMS } from "../../../../shared/viewer-visual-status.js";
export function ProgressionLevelFields({
  values,
  errors,
  busy,
  change,
  baseline,
}: ProgressionFieldProps & { baseline: boolean }) {
  const { t } = useLocale();
  return (
    <>
      <fieldset className="progression-fieldset">
        <legend>{t("progression.identity")}</legend>
        <input
          id="progression-level-id"
          type="hidden"
          value={String(values["progression-level-id"] ?? "")}
          onChange={(event) =>
            change("progression-level-id", event.target.value)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-level-id"]}
        />
        <label htmlFor="progression-level-title" data-i18n="progression.title">
          {t("progression.title")}
        </label>
        <input
          id="progression-level-title"
          type="text"
          maxLength={64}
          required={true}
          value={String(values["progression-level-title"] ?? "")}
          onChange={(event) =>
            change("progression-level-title", event.target.value)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-level-title"]}
          aria-describedby={"progression-level-title-error"}
        />
        <p
          id="progression-level-title-error"
          className="field-error"
          role="alert"
          hidden={!errors["progression-level-title"]}
        >
          {errors["progression-level-title"]}
        </p>
        <label htmlFor="progression-level-emblem">
          {t("viewerVisual.emblem")}
        </label>
        <select
          id="progression-level-emblem"
          disabled={busy}
          value={String(values["progression-level-emblem"] || "shield")}
          onChange={(event) =>
            change("progression-level-emblem", event.target.value)
          }
        >
          {LEVEL_EMBLEMS.map((emblem) => (
            <option key={emblem} value={emblem}>
              {t("viewerVisual." + emblem)}
            </option>
          ))}
        </select>
        <LevelBadge
          level={{
            title: String(
              values["progression-level-title"] || t("viewerVisual.emblem"),
            ),
            emblem: String(values["progression-level-emblem"] || "shield"),
          }}
        />
        <label htmlFor="progression-level-xp" data-i18n="progression.minXP">
          {t("progression.minXP")}
        </label>
        <input
          id="progression-level-xp"
          type="number"
          min="0"
          required={true}
          value={String(values["progression-level-xp"] ?? "")}
          onChange={(event) =>
            change("progression-level-xp", event.target.value)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-level-xp"]}
          readOnly={baseline}
          aria-describedby={
            "progression-level-baseline-hint progression-level-error"
          }
        />
        <p
          id="progression-level-baseline-hint"
          className="field-hint"
          data-i18n="progression.baselineProtected"
          hidden={!baseline}
        >
          {t("progression.baselineProtected")}
        </p>
        <p
          id="progression-level-error"
          className="field-hint notice--error"
          role="alert"
          hidden={!errors["progression-level-xp"]}
        >
          {errors["progression-level-xp"]}
        </p>
        <label className="checkbox">
          <input
            id="progression-level-announce"
            type="checkbox"
            checked={Boolean(values["progression-level-announce"])}
            onChange={(event) =>
              change("progression-level-announce", event.target.checked)
            }
            disabled={busy}
            aria-invalid={!!errors["progression-level-announce"]}
            aria-describedby={"progression-level-announce-error"}
          />
          <p
            id="progression-level-announce-error"
            className="field-error"
            role="alert"
            hidden={!errors["progression-level-announce"]}
          >
            {errors["progression-level-announce"]}
          </p>
          <span data-i18n="progression.announce">
            {t("progression.announce")}
          </span>
        </label>
        {!values["progression-level-alert-enabled"] && (
          <p className="notice">{t("progression.globalAlertsOff")}</p>
        )}
      </fieldset>
      <fieldset className="progression-fieldset">
        <legend>{t("progression.quotas")}</legend>
        <label
          htmlFor="progression-level-like-quota"
          data-i18n="progression.likeQuota"
        >
          {t("progression.likeQuota")}
        </label>
        <input
          id="progression-level-like-quota"
          type="number"
          min="0"
          max="100"
          step="1"
          value={String(values["progression-level-like-quota"] ?? "")}
          onChange={(event) =>
            change("progression-level-like-quota", event.target.value)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-level-like-quota"]}
          aria-describedby={
            "progression-level-quota-hint progression-level-like-quota-error"
          }
        />
        <p
          id="progression-level-like-quota-error"
          className="field-error"
          role="alert"
          hidden={!errors["progression-level-like-quota"]}
        >
          {errors["progression-level-like-quota"]}
        </p>
        <label
          htmlFor="progression-level-buff-quota"
          data-i18n="progression.buffQuota"
        >
          {t("progression.buffQuota")}
        </label>
        <input
          id="progression-level-buff-quota"
          type="number"
          min="0"
          max="100"
          step="1"
          value={String(values["progression-level-buff-quota"] ?? "")}
          onChange={(event) =>
            change("progression-level-buff-quota", event.target.value)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-level-buff-quota"]}
          aria-describedby={
            "progression-level-quota-hint progression-level-buff-quota-error"
          }
        />
        <p
          id="progression-level-buff-quota-error"
          className="field-error"
          role="alert"
          hidden={!errors["progression-level-buff-quota"]}
        >
          {errors["progression-level-buff-quota"]}
        </p>
        <p
          id="progression-level-quota-hint"
          className="field-hint"
          data-i18n="progression.quotaHint"
        >
          {t("progression.quotaHint")}
        </p>
      </fieldset>
    </>
  );
}
