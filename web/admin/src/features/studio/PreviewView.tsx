import { CopyButton } from "../../components/CopyButton";
import type { RefObject, CSSProperties } from "react";
import { useLocale } from "../../app/locale";
import type { Surface } from "./model";
export function PreviewView({
  values,
  change,
  action,
  copy,
  surface,
  overflow,
  url,
  frameKey,
  loaded,
  stageRef,
  viewportStyle,
  state,
  copyStatus,
}: {
  values: Record<string, string>;
  change: (id: string, value: string) => void;
  action: (id: string) => void;
  copy: (id: string) => void;
  surface: Surface;
  overflow: boolean;
  url: string;
  frameKey: string;
  loaded: () => void;
  stageRef: RefObject<HTMLDivElement | null>;
  viewportStyle: CSSProperties;
  state: string;
  copyStatus: string;
}) {
  const { t } = useLocale();
  return (
    <section
      className="panel overlay-preview-panel"
      aria-labelledby="overlay-preview-heading"
      data-preview-only=""
    >
      <div className="overlay-preview-chrome">
        <h3
          id="overlay-preview-heading"
          className="overlay-preview-heading"
          data-i18n="obs.preview"
        >
          {t("obs.preview")}
        </h3>
        <div className="overlay-preview-chrome__main">
          <button
            id="overlay-preview-replay"
            className="icon-btn has-tooltip"
            type="button"
            data-i18n-aria-label="obs.replay"
            onClick={() => action("overlay-preview-replay")}
            aria-label={t("obs.replay")}
          >
            <svg
              className="icon-btn__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 12a8 8 0 1 0 2.3-5.7" strokeLinecap="round"></path>
              <path
                d="M4 4v5h5"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
            <span className="ui-tooltip" role="tooltip" data-i18n="obs.replay">
              {t("obs.replay")}
            </span>
          </button>
          <div
            className="studio-copy-obs-link-wrap"
            data-studio-essential-only=""
          >
            <input
              id="studio-follow-url-compact"
              className="visually-hidden"
              type="text"
              readOnly={true}
              tabIndex={-1}
              aria-hidden="true"
              value={values["studio-follow-url-compact"] ?? ""}
            />
            <CopyButton
              id="preview-action-1"
              target="studio-follow-url-compact"
              onCopy={() => copy("studio-follow-url-compact")}
            />
          </div>
          <div
            className="studio-follow-url overlay-preview-follow"
            data-studio-all-only=""
          >
            <div className="obs-url-row">
              <input
                id="studio-follow-url"
                type="text"
                readOnly={true}
                data-i18n-aria-label="obs.followActivePreset"
                value={values["studio-follow-url"] ?? ""}
                aria-label={t("obs.followActivePreset")}
              />
              <CopyButton
                id="preview-action-2"
                target="studio-follow-url"
                onCopy={() => copy("studio-follow-url")}
              />
            </div>
          </div>
          <div className="overlay-preview-overflow" data-studio-all-only="">
            <button
              id="overlay-preview-overflow-toggle"
              className="icon-btn has-tooltip"
              type="button"
              aria-controls="overlay-preview-overflow-panel"
              data-i18n-aria-label="studio.previewOverflow"
              onClick={() => action("overlay-preview-overflow-toggle")}
              aria-expanded={overflow}
              aria-label={t("studio.previewOverflow")}
            >
              <svg
                className="icon-btn__icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="currentColor"
              >
                <circle cx="5" cy="12" r="1.75"></circle>
                <circle cx="12" cy="12" r="1.75"></circle>
                <circle cx="19" cy="12" r="1.75"></circle>
              </svg>
              <span
                className="ui-tooltip"
                role="tooltip"
                data-i18n="studio.previewOverflow"
              >
                {t("studio.previewOverflow")}
              </span>
            </button>
            <div
              id="overlay-preview-overflow-panel"
              className="overlay-preview-overflow__panel"
              hidden={!overflow}
            >
              <div className="overlay-preview-controls">
                <div
                  className="preview-control overlay-chat-only"
                  id="overlay-preview-mode-control"
                  hidden={surface !== "chat"}
                >
                  <label
                    htmlFor="overlay-preview-mode"
                    data-i18n="obs.previewMode"
                  >
                    {t("obs.previewMode")}
                  </label>
                  <select
                    id="overlay-preview-mode"
                    value={values["overlay-preview-mode"] ?? ""}
                    onChange={(event) =>
                      change("overlay-preview-mode", event.target.value)
                    }
                  >
                    <option value="sample" data-i18n="obs.sample">
                      {t("obs.sample")}
                    </option>
                    <option value="live" data-i18n="obs.liveChat">
                      {t("obs.liveChat")}
                    </option>
                  </select>
                </div>
                <div className="preview-size-row">
                  <div className="preview-control preview-control--size">
                    <label
                      htmlFor="overlay-preview-size"
                      data-i18n="obs.sourceSize"
                    >
                      {t("obs.sourceSize")}
                    </label>
                    <select
                      id="overlay-preview-size"
                      value={values["overlay-preview-size"] ?? ""}
                      onChange={(event) =>
                        change("overlay-preview-size", event.target.value)
                      }
                    >
                      <option value="640x360">{"640 × 360"}</option>
                      <option value="800x600">{"800 × 600"}</option>
                      <option value="1280x720">{"1280 × 720"}</option>
                      <option value="480x720">{"480 × 720"}</option>
                      <option value="custom" data-i18n="obs.custom">
                        {t("obs.custom")}
                      </option>
                    </select>
                  </div>
                  <div className="preview-control preview-control--dimension">
                    <label
                      htmlFor="overlay-preview-width"
                      data-i18n="obs.width"
                    >
                      {t("obs.width")}
                    </label>
                    <input
                      id="overlay-preview-width"
                      type="number"
                      min="240"
                      max="3840"
                      step="1"
                      inputMode="numeric"
                      value={values["overlay-preview-width"] ?? ""}
                      onChange={(event) =>
                        change("overlay-preview-width", event.target.value)
                      }
                    />
                  </div>
                  <span className="preview-dimension-mark" aria-hidden="true">
                    {"×"}
                  </span>
                  <div className="preview-control preview-control--dimension">
                    <label
                      htmlFor="overlay-preview-height"
                      data-i18n="obs.height"
                    >
                      {t("obs.height")}
                    </label>
                    <input
                      id="overlay-preview-height"
                      type="number"
                      min="180"
                      max="2160"
                      step="1"
                      inputMode="numeric"
                      value={values["overlay-preview-height"] ?? ""}
                      onChange={(event) =>
                        change("overlay-preview-height", event.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="preview-control">
                  <label
                    htmlFor="overlay-preview-background"
                    data-i18n="obs.background"
                  >
                    {t("obs.background")}
                  </label>
                  <select
                    id="overlay-preview-background"
                    value={values["overlay-preview-background"] ?? ""}
                    onChange={(event) =>
                      change("overlay-preview-background", event.target.value)
                    }
                  >
                    <option value="white" data-i18n="obs.bgWhite">
                      {t("obs.bgWhite")}
                    </option>
                    <option value="checker" data-i18n="obs.bgChecker">
                      {t("obs.bgChecker")}
                    </option>
                    <option value="scene" data-i18n="obs.bgScene">
                      {t("obs.bgScene")}
                    </option>
                    <option value="dark" data-i18n="obs.bgDark">
                      {t("obs.bgDark")}
                    </option>
                  </select>
                </div>
                <div className="preview-control preview-control--full studio-url-pinned">
                  <label
                    id="studio-pinned-url-label"
                    htmlFor="studio-pinned-url"
                    data-i18n="obs.pinnedPresetAdvanced"
                  >
                    {t("obs.pinnedPresetAdvanced")}
                  </label>
                  <div className="obs-url-row">
                    <input
                      id="studio-pinned-url"
                      type="text"
                      readOnly={true}
                      value={values["studio-pinned-url"] ?? ""}
                    />
                    <CopyButton
                      id="preview-action-4"
                      target="studio-pinned-url"
                      onCopy={() => copy("studio-pinned-url")}
                    />
                  </div>
                </div>
                <div className="preview-control preview-control--full">
                  <a
                    id="overlay-preview-open"
                    className="button-secondary button-secondary--small"
                    target="_blank"
                    rel="noopener"
                    data-i18n="obs.openOverlay"
                    href={url}
                  >
                    {t("obs.openOverlay")}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        id="overlay-preview-stage"
        className="overlay-preview-stage"
        ref={stageRef}
      >
        <div
          id="overlay-preview-viewport"
          className="overlay-preview-viewport"
          style={viewportStyle}
        >
          <iframe
            id="overlay-preview-frame"
            key={frameKey}
            src={url}
            title={t("obs.previewTitle")}
            referrerPolicy="no-referrer"
            onLoad={loaded}
          />
        </div>
        <div
          id="overlay-preview-state"
          className="overlay-preview-state"
          role="status"
          aria-live="polite"
          hidden={state === "ready"}
          data-state={state}
        >
          <span
            id="overlay-preview-state-text"
            data-i18n="studio.previewLoading"
          >
            {t(
              state === "error"
                ? "studio.previewError"
                : "studio.previewLoading",
            )}
          </span>
          <button
            id="overlay-preview-retry"
            className="btn-physical btn-small"
            type="button"
            data-i18n="studio.retryPreview"
            onClick={() => action("overlay-preview-retry")}
            hidden={state !== "error"}
          >
            {t("studio.retryPreview")}
          </button>
        </div>
      </div>
      <p
        id="overlay-preview-note"
        className="overlay-preview-note"
        aria-live="polite"
        data-i18n="obs.previewNoteSample"
      >
        {t(
          surface === "chat"
            ? values["overlay-preview-mode"] === "live"
              ? "obs.previewNoteLive"
              : "obs.previewNoteSample"
            : surface === "recap"
              ? "obs.previewNoteRecap"
              : surface === "alerts"
                ? "obs.previewNoteAlerts"
                : "obs.previewNoteLeaderboard",
        )}
      </p>
      <p
        id="studio-copy-status"
        className="obs-copy-status"
        role="status"
        aria-live="polite"
      >
        {copyStatus}
      </p>
    </section>
  );
}
