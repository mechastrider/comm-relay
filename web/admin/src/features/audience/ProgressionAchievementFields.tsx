import { useLocale } from "../../app/locale";
import type { ProgressionFieldProps } from "./progression-fields";
import { Button } from "../../components/Button";
export function ProgressionAchievementFields({
  values,
  errors,
  busy,
  change,
  condition,
  subjectOptions,
  subjectLoading,
  subjectError,
  retrySubjects,
}: ProgressionFieldProps & {
  condition: string;
  subjectOptions: { id: string; label: string }[];
  subjectLoading: boolean;
  subjectError: boolean;
  retrySubjects: () => void;
}) {
  const { t } = useLocale();
  const subject = String(values["progression-achievement-subject"] ?? "");
  const needsSubject = ["award_count", "command_count"].includes(
    String(values["progression-achievement-metric"]),
  );
  const missingSubject =
    !!subject && !subjectOptions.some((item) => item.id === subject);
  return (
    <>
      <fieldset className="progression-fieldset">
        <legend>{t("progression.identity")}</legend>
        <input
          id="progression-achievement-id"
          type="hidden"
          value={String(values["progression-achievement-id"] ?? "")}
          onChange={(event) =>
            change("progression-achievement-id", event.target.value)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-achievement-id"]}
        />
        <label
          htmlFor="progression-achievement-name"
          data-i18n="progression.name"
        >
          {t("progression.name")}
        </label>
        <input
          id="progression-achievement-name"
          type="text"
          maxLength={64}
          required={true}
          value={String(values["progression-achievement-name"] ?? "")}
          onChange={(event) =>
            change("progression-achievement-name", event.target.value)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-achievement-name"]}
          aria-describedby={"progression-achievement-name-error"}
        />
        <p
          id="progression-achievement-name-error"
          className="field-error"
          role="alert"
          hidden={!errors["progression-achievement-name"]}
        >
          {errors["progression-achievement-name"]}
        </p>
        <label
          htmlFor="progression-achievement-description"
          data-i18n="progression.description"
        >
          {t("progression.description")}
        </label>
        <input
          id="progression-achievement-description"
          type="text"
          maxLength={240}
          value={String(values["progression-achievement-description"] ?? "")}
          onChange={(event) =>
            change("progression-achievement-description", event.target.value)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-achievement-description"]}
          aria-describedby={"progression-achievement-description-error"}
        />
        <p
          id="progression-achievement-description-error"
          className="field-error"
          role="alert"
          hidden={!errors["progression-achievement-description"]}
        >
          {errors["progression-achievement-description"]}
        </p>
      </fieldset>
      <fieldset className="progression-fieldset">
        <legend>{t("progression.rule")}</legend>{" "}
        <label
          htmlFor="progression-achievement-metric"
          data-i18n="progression.metric"
        >
          {t("progression.metric")}
        </label>
        <select
          id="progression-achievement-metric"
          value={String(values["progression-achievement-metric"] ?? "")}
          onChange={(event) =>
            change("progression-achievement-metric", event.target.value)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-achievement-metric"]}
          aria-describedby={"progression-achievement-metric-error"}
        >
          <option value="message_count" data-i18n="progression.metricMessages">
            {t("progression.metricMessages")}
          </option>
          <option value="xp" data-i18n="progression.metricXP">
            {t("progression.metricXP")}
          </option>
          <option value="award_count" data-i18n="progression.metricAwards">
            {t("progression.metricAwards")}
          </option>
          <option value="command_count" data-i18n="progression.metricCommands">
            {t("progression.metricCommands")}
          </option>
          <option value="session_count" data-i18n="progression.metricSessions">
            {t("progression.metricSessions")}
          </option>
          <option
            value="contract_win_count"
            data-i18n="progression.metricContracts"
          >
            {t("progression.metricContracts")}
          </option>
        </select>
        <p
          id="progression-achievement-metric-error"
          className="field-error"
          role="alert"
          hidden={!errors["progression-achievement-metric"]}
        >
          {errors["progression-achievement-metric"]}
        </p>
        <div
          id="progression-subject-field"
          hidden={
            !["award_count", "command_count"].includes(
              String(values["progression-achievement-metric"]),
            )
          }
        >
          <label
            htmlFor="progression-achievement-subject"
            data-i18n="progression.subject"
          >
            {t("progression.subject")}
          </label>
          <select
            id="progression-achievement-subject"
            value={subject}
            onChange={(event) =>
              change("progression-achievement-subject", event.target.value)
            }
            disabled={busy || subjectLoading || !needsSubject}
            required={needsSubject}
            aria-invalid={!!errors["progression-achievement-subject"]}
            aria-describedby="progression-achievement-subject-error progression-subject-hint"
          >
            <option value="">
              {t(
                subjectLoading ? "state.loading" : "progression.subjectChoose",
              )}
            </option>
            {missingSubject && (
              <option value={subject}>
                {subjectLoading || subjectError
                  ? subject
                  : t("progression.subjectUnavailable", { id: subject })}
              </option>
            )}
            {subjectOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <p id="progression-subject-hint" className="field-hint">
            {t(
              missingSubject && !subjectLoading && !subjectError
                ? "progression.subjectMissingHint"
                : "progression.subjectHint",
            )}
          </p>
          {subjectError && (
            <div role="alert" className="notice notice--error">
              <p>{t("progression.subjectLoadFailed")}</p>
              <Button
                type="button"
                className="btn-small"
                onClick={retrySubjects}
              >
                {t("state.retry")}
              </Button>
            </div>
          )}
          <p
            id="progression-achievement-subject-error"
            className="field-error"
            role="alert"
            hidden={!errors["progression-achievement-subject"]}
          >
            {errors["progression-achievement-subject"]}
          </p>
        </div>
        <label
          htmlFor="progression-achievement-target"
          data-i18n="progression.target"
        >
          {t("progression.target")}
        </label>
        <input
          id="progression-achievement-target"
          type="number"
          min="1"
          required={true}
          value={String(values["progression-achievement-target"] ?? "")}
          onChange={(event) =>
            change("progression-achievement-target", event.target.value)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-achievement-target"]}
          aria-describedby={"progression-achievement-target-error"}
        />
        <p
          id="progression-achievement-target-error"
          className="field-error"
          role="alert"
          hidden={!errors["progression-achievement-target"]}
        >
          {errors["progression-achievement-target"]}
        </p>
        <p
          id="progression-achievement-condition"
          className="field-hint"
          aria-live="polite"
        >
          {condition}
        </p>
      </fieldset>
      <fieldset className="progression-fieldset">
        <legend>{t("progression.options")}</legend>{" "}
        <div className="progression-checks">
          <label className="checkbox">
            <input
              id="progression-achievement-enabled"
              type="checkbox"
              checked={Boolean(values["progression-achievement-enabled"])}
              onChange={(event) =>
                change("progression-achievement-enabled", event.target.checked)
              }
              disabled={busy}
              aria-invalid={!!errors["progression-achievement-enabled"]}
              aria-describedby={"progression-achievement-enabled-error"}
            />
            <p
              id="progression-achievement-enabled-error"
              className="field-error"
              role="alert"
              hidden={!errors["progression-achievement-enabled"]}
            >
              {errors["progression-achievement-enabled"]}
            </p>
            <span data-i18n="progression.enabled">
              {t("progression.enabled")}
            </span>
          </label>
          <label className="checkbox">
            <input
              id="progression-achievement-secret"
              type="checkbox"
              checked={Boolean(values["progression-achievement-secret"])}
              onChange={(event) =>
                change("progression-achievement-secret", event.target.checked)
              }
              disabled={busy}
              aria-invalid={!!errors["progression-achievement-secret"]}
              aria-describedby={"progression-achievement-secret-error"}
            />
            <p
              id="progression-achievement-secret-error"
              className="field-error"
              role="alert"
              hidden={!errors["progression-achievement-secret"]}
            >
              {errors["progression-achievement-secret"]}
            </p>
            <span data-i18n="progression.secret">
              {t("progression.secret")}
            </span>
          </label>
          <label className="checkbox">
            <input
              id="progression-achievement-repeatable"
              type="checkbox"
              checked={Boolean(values["progression-achievement-repeatable"])}
              onChange={(event) =>
                change(
                  "progression-achievement-repeatable",
                  event.target.checked,
                )
              }
              disabled={busy}
              aria-invalid={!!errors["progression-achievement-repeatable"]}
              aria-describedby={"progression-achievement-repeatable-error"}
            />
            <p
              id="progression-achievement-repeatable-error"
              className="field-error"
              role="alert"
              hidden={!errors["progression-achievement-repeatable"]}
            >
              {errors["progression-achievement-repeatable"]}
            </p>
            <span data-i18n="progression.repeatable">
              {t("progression.repeatable")}
            </span>
          </label>
          <label className="checkbox">
            <input
              id="progression-achievement-announce"
              type="checkbox"
              checked={Boolean(values["progression-achievement-announce"])}
              onChange={(event) =>
                change("progression-achievement-announce", event.target.checked)
              }
              disabled={busy}
              aria-invalid={!!errors["progression-achievement-announce"]}
              aria-describedby={"progression-achievement-announce-error"}
            />
            <p
              id="progression-achievement-announce-error"
              className="field-error"
              role="alert"
              hidden={!errors["progression-achievement-announce"]}
            >
              {errors["progression-achievement-announce"]}
            </p>
            <span data-i18n="progression.announce">
              {t("progression.announce")}
            </span>
          </label>
        </div>
        {!values["progression-achievement-alert-enabled"] && (
          <p className="notice">{t("progression.globalAlertsOff")}</p>
        )}
      </fieldset>
    </>
  );
}
