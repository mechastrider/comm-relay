import type { ReactNode } from "react";
import { useLocale } from "../../app/locale";
export function ProgressionView({
  values,
  errors,
  busy,
  baseline,
  change,
  action,
  levelList,
  achievementList,
  achievementsEmpty,
  condition,
  status,
  failed,
}: {
  values: Record<string, string | boolean>;
  errors: Record<string, string>;
  busy: boolean;
  baseline: boolean;
  change: (id: string, value: string | boolean) => void;
  action: (id: string) => void;
  levelList: ReactNode;
  achievementList: ReactNode;
  achievementsEmpty: boolean;
  condition: string;
  status: string;
  failed: boolean;
}) {
  const { t } = useLocale();
  return (
    <div className="progression-grid">
      <section
        className="progression-card"
        aria-labelledby="progression-levels-heading"
      >
        <header className="progression-card__header">
          <h2 id="progression-levels-heading" data-i18n="progression.levels">
            {t("progression.levels")}
          </h2>
          <button
            id="progression-level-new"
            className="btn-physical btn-small"
            type="button"
            data-i18n="catalog.create"
            disabled={busy}
            onClick={() => action("progression-level-new")}
          >
            {t("catalog.create")}
          </button>
        </header>
        <ul
          id="progression-level-list"
          className="audience-catalog-items"
          role="listbox"
        >
          {levelList}
        </ul>
        <form
          id="progression-level-form"
          className="progression-form"
          onSubmit={(event) => {
            event.preventDefault();
            action("progression-level-form");
          }}
        >
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
          <label
            htmlFor="progression-level-title"
            data-i18n="progression.title"
          >
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
          <div className="progression-form__actions">
            <button
              className="btn-physical btn-small"
              type="submit"
              data-i18n="catalog.save"
              id="progression-submit-1"
              disabled={busy}
            >
              {t("catalog.save")}
            </button>
            <button
              id="progression-level-test"
              className="btn-physical btn-small"
              type="button"
              data-i18n="catalog.test"
              disabled={busy}
              onClick={() => action("progression-level-test")}
            >
              {t("catalog.test")}
            </button>
            <button
              id="progression-level-delete"
              className="btn-physical btn-danger btn-small"
              type="button"
              data-i18n="catalog.delete"
              disabled={busy || baseline || !values["progression-level-id"]}
              onClick={() => action("progression-level-delete")}
            >
              {t("catalog.delete")}
            </button>
          </div>
        </form>
      </section>
      <section
        className="progression-card"
        aria-labelledby="progression-achievements-heading"
      >
        <header className="progression-card__header">
          <h2
            id="progression-achievements-heading"
            data-i18n="progression.achievements"
          >
            {t("progression.achievements")}
          </h2>
          <button
            id="progression-achievement-new"
            className="btn-physical btn-small"
            type="button"
            data-i18n="catalog.create"
            disabled={busy}
            onClick={() => action("progression-achievement-new")}
          >
            {t("catalog.create")}
          </button>
        </header>
        <label
          htmlFor="progression-achievement-search"
          data-i18n="progression.search"
        >
          {t("progression.search")}
        </label>
        <input
          id="progression-achievement-search"
          type="search"
          maxLength={128}
          data-i18n-placeholder="progression.searchPlaceholder"
          value={String(values["progression-achievement-search"] ?? "")}
          onChange={(event) =>
            change("progression-achievement-search", event.target.value)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-achievement-search"]}
          aria-describedby={"progression-achievement-search-error"}
          placeholder={t("progression.searchPlaceholder")}
        />
        <p
          id="progression-achievement-search-error"
          className="field-error"
          role="alert"
          hidden={!errors["progression-achievement-search"]}
        >
          {errors["progression-achievement-search"]}
        </p>
        <label
          htmlFor="progression-achievement-filter"
          data-i18n="progression.filter"
        >
          {t("progression.filter")}
        </label>
        <select
          id="progression-achievement-filter"
          value={String(values["progression-achievement-filter"] ?? "")}
          onChange={(event) =>
            change("progression-achievement-filter", event.target.value)
          }
          disabled={busy}
          aria-invalid={!!errors["progression-achievement-filter"]}
          aria-describedby={"progression-achievement-filter-error"}
        >
          <option value="all" data-i18n="progression.filterAll">
            {t("progression.filterAll")}
          </option>
          <option value="enabled" data-i18n="progression.filterEnabled">
            {t("progression.filterEnabled")}
          </option>
          <option value="disabled" data-i18n="progression.filterDisabled">
            {t("progression.filterDisabled")}
          </option>
          <option value="secret" data-i18n="progression.filterSecret">
            {t("progression.filterSecret")}
          </option>
          <option value="repeatable" data-i18n="progression.filterRepeatable">
            {t("progression.filterRepeatable")}
          </option>
        </select>
        <p
          id="progression-achievement-filter-error"
          className="field-error"
          role="alert"
          hidden={!errors["progression-achievement-filter"]}
        >
          {errors["progression-achievement-filter"]}
        </p>
        <ul
          id="progression-achievement-list"
          className="audience-catalog-items"
          role="listbox"
        >
          {achievementList}
        </ul>
        <p
          id="progression-achievement-empty"
          className="field-hint"
          data-i18n="progression.emptyAchievements"
          hidden={!achievementsEmpty}
        >
          {t("progression.emptyAchievements")}
        </p>
        <form
          id="progression-achievement-form"
          className="progression-form"
          onSubmit={(event) => {
            event.preventDefault();
            action("progression-achievement-form");
          }}
        >
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
            <option
              value="message_count"
              data-i18n="progression.metricMessages"
            >
              {t("progression.metricMessages")}
            </option>
            <option value="xp" data-i18n="progression.metricXP">
              {t("progression.metricXP")}
            </option>
            <option value="award_count" data-i18n="progression.metricAwards">
              {t("progression.metricAwards")}
            </option>
            <option
              value="command_count"
              data-i18n="progression.metricCommands"
            >
              {t("progression.metricCommands")}
            </option>
            <option
              value="session_count"
              data-i18n="progression.metricSessions"
            >
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
            <input
              id="progression-achievement-subject"
              type="text"
              maxLength={128}
              value={String(values["progression-achievement-subject"] ?? "")}
              onChange={(event) =>
                change("progression-achievement-subject", event.target.value)
              }
              disabled={busy}
              aria-invalid={!!errors["progression-achievement-subject"]}
              aria-describedby={"progression-achievement-subject-error"}
            />
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
          <div className="progression-checks">
            <label className="checkbox">
              <input
                id="progression-achievement-enabled"
                type="checkbox"
                checked={Boolean(values["progression-achievement-enabled"])}
                onChange={(event) =>
                  change(
                    "progression-achievement-enabled",
                    event.target.checked,
                  )
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
                  change(
                    "progression-achievement-announce",
                    event.target.checked,
                  )
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
          <div className="progression-form__actions">
            <button
              className="btn-physical btn-small"
              type="submit"
              data-i18n="catalog.save"
              id="progression-submit-5"
              disabled={busy}
            >
              {t("catalog.save")}
            </button>
            <button
              id="progression-achievement-test"
              className="btn-physical btn-small"
              type="button"
              data-i18n="catalog.test"
              disabled={busy}
              onClick={() => action("progression-achievement-test")}
            >
              {t("catalog.test")}
            </button>
            <button
              id="progression-achievement-delete"
              className="btn-physical btn-danger btn-small"
              type="button"
              data-i18n="catalog.delete"
              disabled={busy || !values["progression-achievement-id"]}
              onClick={() => action("progression-achievement-delete")}
            >
              {t("catalog.delete")}
            </button>
          </div>
        </form>
      </section>
      <section
        className="progression-card progression-card--settings"
        aria-labelledby="progression-alert-heading"
      >
        <header className="progression-card__header">
          <h2 id="progression-alert-heading" data-i18n="progression.alerts">
            {t("progression.alerts")}
          </h2>
        </header>
        <form
          id="progression-settings-form"
          className="progression-form"
          onSubmit={(event) => {
            event.preventDefault();
            action("progression-settings-form");
          }}
        >
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
          <label
            htmlFor="progression-alert-layout"
            data-i18n="catalog.layoutLabel"
          >
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
          <label
            htmlFor="progression-alert-sound"
            data-i18n="catalog.soundLabel"
          >
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
          <label
            htmlFor="progression-alert-volume"
            data-i18n="catalog.volumeLabel"
          >
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
          <div className="progression-form__actions">
            <button
              className="btn-physical btn-small"
              type="submit"
              data-i18n="catalog.save"
              id="progression-submit-8"
              disabled={busy}
            >
              {t("catalog.save")}
            </button>
            <button
              id="progression-reconcile"
              className="btn-physical btn-small"
              type="button"
              data-i18n="progression.reconcile"
              disabled={busy}
              onClick={() => action("progression-reconcile")}
            >
              {t("progression.reconcile")}
            </button>
          </div>
          <p id="progression-status" className="field-hint" aria-live="polite">
            {status}
          </p>
          <button
            id="progression-retry"
            className="btn-physical btn-small"
            type="button"
            data-i18n="state.retry"
            disabled={busy}
            onClick={() => action("progression-retry")}
            hidden={!failed}
          >
            {t("state.retry")}
          </button>
        </form>
      </section>
    </div>
  );
}
