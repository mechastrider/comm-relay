import { useLocale } from "../../app/locale";
import type { Preset } from "./model";
export function Presets({
  presets,
  selected,
  busy,
  choose,
  url,
  status,
  action,
}: {
  presets: Preset[];
  selected: string;
  busy: boolean;
  choose: (id: string) => void;
  url: string;
  status: string;
  action: (id: string) => void;
}) {
  const { t } = useLocale();
  return (
    <div
      id="preset-island"
      className="preset-island"
      data-i18n-aria-label="obs.presetIntro"
      aria-label={t("obs.presetIntro")}
    >
      <div className="preset-island__toolbar">
        <div className="preset-island__group preset-island__group--preset">
          <label
            className="preset-island__inline-label"
            htmlFor="overlay-preset-select"
            data-i18n="obs.preset"
          >
            {t("obs.preset")}
          </label>
          <select
            id="overlay-preset-select"
            value={selected}
            disabled={busy}
            onChange={(event) => choose(event.target.value)}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span
            id="preset-island-count"
            className="preset-island__count"
            aria-live="polite"
          >
            {presets.length}/32
          </span>
        </div>
        <div
          id="preset-island-icon-actions"
          className="preset-island__icon-actions"
          role="group"
          data-i18n-aria-label="obs.presetActions"
          aria-label={t("obs.presetActions")}
        >
          <button
            id="overlay-preset-add"
            className="icon-btn has-tooltip"
            type="button"
            data-i18n-aria-label="obs.presetAdd"
            disabled={busy || presets.length >= 32}
            onClick={() => action("overlay-preset-add")}
            aria-label={t("obs.presetAdd")}
          >
            <svg
              className="icon-btn__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round"></path>
            </svg>
            <span
              className="ui-tooltip"
              role="tooltip"
              data-i18n="obs.presetAdd"
            >
              {t("obs.presetAdd")}
            </span>
          </button>
          <button
            id="overlay-preset-rename"
            className="icon-btn has-tooltip"
            type="button"
            data-i18n-aria-label="obs.presetRename"
            disabled={busy}
            onClick={() => action("overlay-preset-rename")}
            aria-label={t("obs.presetRename")}
          >
            <svg
              className="icon-btn__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
              <path d="m13.5 7.5 3 3" strokeLinecap="round"></path>
            </svg>
            <span
              className="ui-tooltip"
              role="tooltip"
              data-i18n="obs.presetRename"
            >
              {t("obs.presetRename")}
            </span>
          </button>
          <button
            id="overlay-preset-duplicate"
            className="icon-btn has-tooltip"
            type="button"
            data-i18n-aria-label="obs.presetDuplicate"
            disabled={busy || presets.length >= 32}
            onClick={() => action("overlay-preset-duplicate")}
            aria-label={t("obs.presetDuplicate")}
          >
            <svg
              className="icon-btn__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="8" y="8" width="11" height="11" rx="2"></rect>
              <path
                d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                strokeLinecap="round"
              ></path>
            </svg>
            <span
              className="ui-tooltip"
              role="tooltip"
              data-i18n="obs.presetDuplicate"
            >
              {t("obs.presetDuplicate")}
            </span>
          </button>
          <button
            id="overlay-preset-delete"
            className="icon-btn btn-danger has-tooltip"
            type="button"
            data-i18n-aria-label="obs.presetDelete"
            disabled={busy || presets.length < 2}
            onClick={() => action("overlay-preset-delete")}
            aria-label={t("obs.presetDelete")}
          >
            <svg
              className="icon-btn__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
            <span
              className="ui-tooltip"
              role="tooltip"
              data-i18n="obs.presetDelete"
            >
              {t("obs.presetDelete")}
            </span>
          </button>
        </div>
        <div className="preset-island__divider" aria-hidden="true"></div>
        <div className="preset-island__group preset-island__group--url">
          <label
            className="preset-island__inline-label"
            htmlFor="preset-island-url"
            data-i18n="obs.presetUrl"
          >
            {t("obs.presetUrl")}
          </label>
          <input
            id="preset-island-url"
            className="preset-island__url-input"
            type="text"
            readOnly={true}
            value={url}
          />
          <button
            className="icon-btn has-tooltip"
            type="button"
            data-copy-obs-url="preset-island-url"
            data-copy-label="Overlay URL"
            data-i18n-aria-label="obs.copyUrl"
            id="preset-action-4"
            disabled={busy}
            onClick={() => action("preset-action-4")}
            aria-label={t("obs.copyUrl")}
          >
            <svg
              className="icon-btn__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <rect x="9" y="9" width="13" height="13" rx="1.5"></rect>
              <path
                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                strokeLinecap="round"
              ></path>
            </svg>
            <span className="ui-tooltip" role="tooltip" data-i18n="obs.copyUrl">
              {t("obs.copyUrl")}
            </span>
          </button>
          <span
            id="preset-url-status"
            className="preset-island__status"
            role="status"
            aria-live="polite"
          >
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
