import { Field, FormSection } from "../../components/Field";
import { Button } from "../../components/Button";
import { useRef } from "react";
import { useLocale } from "../../app/locale";
import { useRuntime } from "../../app/runtime";
import { MediaImage, type useMedia } from "./useMedia";
import { TemplateChips } from "./TemplateChips";
import { substituteSplashTemplate } from "./template-model";
import type { CatalogDraft } from "./types";
interface Props {
  status?: string;
  draft: CatalogDraft;
  errors: Record<string, string>;
  busy: boolean;
  identifier: string;
  awards: { id: string; name: string; }[];
  change: (key: keyof CatalogDraft, value: string | boolean) => void;
  media: ReturnType<typeof useMedia>;
  onSubmit: () => void;
}
export function CommandFields({
  draft,
  errors,
  busy,
  identifier,
  awards,
  change,
  media,
  onSubmit,
}: Props) {
  const { t } = useLocale();
  const { config } = useRuntime();
  const splash = useRef<HTMLInputElement>(null);
  return (
    <form
      id="commands-editor-form"
      className="audience-catalog-editor__body"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <FormSection title={t("catalog.sectionCommand")}>
        <Field>
          <label
            htmlFor="command-trigger-input"
            data-i18n="commands.triggerLabel"
          >
            {t("commands.triggerLabel")}
          </label>
          <input
            id="command-trigger-input"
            type="text"
            autoComplete="off"
            spellCheck="false"
            required={true}
            value={String(draft.trigger)}
            onChange={(event) => change("trigger", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.trigger}
            aria-describedby={"command-trigger-error"}
          />
          <p
            id="command-trigger-error"
            className="field-error"
            role="alert"
            hidden={!errors.trigger}
          >
            {errors.trigger}
          </p>
        </Field>
        <Field>
          <label
            htmlFor="command-aliases-input"
            data-i18n="commands.aliasesLabel"
          >
            {t("commands.aliasesLabel")}
          </label>
          <textarea
            id="command-aliases-input"
            rows={3}
            autoComplete="off"
            spellCheck="false"
            value={String(draft.aliases)}
            onChange={(event) => change("aliases", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.aliases}
            aria-describedby={
              "command-aliases-hint command-aliases-error command-aliases-error"
            }
          ></textarea>
          <p
            id="command-aliases-hint"
            className="field-hint"
            data-i18n="commands.aliasesHint"
          >
            {t("commands.aliasesHint")}
          </p>
          <p
            id="command-aliases-error"
            className="field-error"
            role="alert"
            hidden={!errors.aliases}
          >
            {errors.aliases}
          </p>
        </Field>
        <Field>
          <label htmlFor="command-enabled-input">
            <input
              id="command-enabled-input"
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => change("enabled", event.target.checked)}
              disabled={busy}
              aria-invalid={!!errors.enabled}
              aria-describedby={"command-enabled-error"}
            />
            <span data-i18n="commands.enabledLabel">
              {t("commands.enabledLabel")}
            </span>
            <p
              id="command-enabled-error"
              className="field-error"
              role="alert"
              hidden={!errors.enabled}
            >
              {errors.enabled}
            </p>
          </label>
        </Field>
      </FormSection>
      <FormSection title={t("catalog.sectionAction")}>
        <Field>
          <label htmlFor="command-action-input" data-i18n="commands.actionLabel">
            {t("commands.actionLabel")}
          </label>
          <select
            id="command-action-input"
            value={String(draft.action)}
            onChange={(event) => change("action", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.action}
            aria-describedby={"command-action-error"}
          >
            <option value="alert" data-i18n="commands.actionAlert">
              {t("commands.actionAlert")}
            </option>
            <option
              value="show_leaderboard"
              data-i18n="commands.actionLeaderboard"
            >
              {t("commands.actionLeaderboard")}
            </option>
            <option value="like" data-i18n="commands.actionLike">
              {t("commands.actionLike")}
            </option>
            <option value="buff" data-i18n="commands.actionBuff">
              {t("commands.actionBuff")}
            </option>
          </select>
          <p
            id="command-action-hint"
            className="field-hint"
            data-i18n="commands.actionHint"
          >
            {t(
              "commands.action" +
              ({
                alert: "Alert",
                show_leaderboard: "Leaderboard",
                like: "Like",
                buff: "Buff",
              }[draft.action] || "Alert") +
              "Hint",
            )}
          </p>
          <p
            id="command-action-error"
            className="field-error"
            role="alert"
            hidden={!errors.action}
          >
            {errors.action}
          </p>
        </Field>
        <Field
          id="command-like-fields"
          hidden={draft.action !== "like"}
        >
          <label
            htmlFor="command-award-input"
            data-i18n="commands.likeAwardLabel"
          >
            {t("commands.likeAwardLabel")}
          </label>
          <select
            id="command-award-input"
            value={String(draft.award_id)}
            onChange={(event) => change("award_id", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.award_id}
            aria-describedby={
              "command-award-hint command-award-error command-award-error"
            }
          >
            <option value="">{t("commands.likeAwardPlaceholder")}</option>
            {awards.map((award) => (
              <option key={award.id} value={award.id}>
                {award.name || award.id}
              </option>
            ))}
          </select>
          <p
            id="command-award-hint"
            className="field-hint"
            data-i18n="commands.likeAwardHint"
          >
            {t("commands.likeAwardHint")}
          </p>
          <p
            id="command-award-error"
            className="field-error"
            role="alert"
            hidden={!errors.award_id}
          >
            {errors.award_id}
          </p>
        </Field>
        <Field
          id="command-buff-fields"
          hidden={draft.action !== "buff"}
        >
          <label
            htmlFor="command-points-input"
            data-i18n="commands.buffPointsLabel"
          >
            {t("commands.buffPointsLabel")}
          </label>
          <input
            id="command-points-input"
            type="number"
            min="1"
            max="1000"
            step="1"
            inputMode="numeric"
            value={String(draft.points)}
            onChange={(event) => change("points", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.points}
            aria-describedby={
              "command-points-hint command-points-error command-points-error"
            }
          />
          <p
            id="command-points-hint"
            className="field-hint"
            data-i18n="commands.buffPointsHint"
          >
            {t("commands.buffPointsHint")}
          </p>
          <p
            id="command-points-error"
            className="field-error"
            role="alert"
            hidden={!errors.points}
          >
            {errors.points}
          </p>
        </Field>
      </FormSection>
      <div id="command-alert-fields" hidden={draft.action !== "alert"}>
        <FormSection title={t("greetings.content")}>
          <Field>
            <label
              htmlFor="command-splash-input"
              data-i18n="catalog.splashTemplate"
            >
              {t("catalog.splashTemplate")}
            </label>
            <div
              id="command-splash-vars"
              className="catalog-template-vars"
              role="group"
              data-i18n-aria-label="catalog.templateVariables"
              aria-label={t("catalog.templateVariables")}
            >
              <TemplateChips
                input={splash}
                points={true}
                value={draft.splash_template}
                onChange={(value) => change("splash_template", value)}
              />
            </div>
            <input
              id="command-splash-input"
              type="text"
              autoComplete="off"
              value={String(draft.splash_template)}
              onChange={(event) => change("splash_template", event.target.value)}
              disabled={busy}
              aria-invalid={!!errors.splash_template}
              aria-describedby={"command-splash-error"}
              ref={splash}
              required={draft.action === "alert"}
            />
            <p
              id="command-splash-preview"
              className="catalog-template-preview"
              aria-live="polite"
            >
              {substituteSplashTemplate(draft.splash_template, {
                viewer: "Alice",
                streamer:
                  config?.streamer_display_name?.trim() ||
                  t("catalog.sampleStreamer"),
                points: 0,
                message: t("catalog.sampleCommandMessage"),
              })}
            </p>
            <p
              id="command-splash-error"
              className="field-error"
              role="alert"
              hidden={!errors.splash_template}
            >
              {errors.splash_template}
            </p>
          </Field>
        </FormSection>
        <FormSection title={t("greetings.media")}>
          <Field>
            <label htmlFor="command-sound-input" data-i18n="catalog.soundLabel">
              {t("catalog.soundLabel")}
            </label>
            <select
              id="command-sound-input"
              value={String(draft.sound)}
              onChange={(event) => change("sound", event.target.value)}
              disabled={busy}
              aria-invalid={!!errors.sound}
              aria-describedby={"command-sound-error"}
            >
              <option value="" data-i18n="sound.silence">
                {t("sound.silence")}
              </option>
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
              id="command-sound-error"
              className="field-error"
              role="alert"
              hidden={!errors.sound}
            >
              {errors.sound}
            </p>
          </Field>
          <Field className="catalog-media-field">
            <span
              id="command-image-label"
              className="form__label"
              data-i18n="catalog.imageLabel"
            >
              {t("catalog.imageLabel")}
            </span>
            <div className="catalog-media-row">
              <div
                id="command-image-preview"
                className="catalog-media-preview"
                aria-labelledby="command-image-label"
              >
                <MediaImage
                  kind="command"
                  draft={draft}
                  identifier={identifier}
                />
              </div>
              <div className="catalog-media-actions">
                <label className="btn-physical btn-small catalog-media-upload">
                  <span data-i18n="catalog.upload">{t("catalog.upload")}</span>
                  <input
                    id="command-image-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-labelledby="command-image-label"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void media.upload("image_asset", file);
                    }}
                    aria-invalid={!!errors.image_asset}
                    aria-describedby={"command-image-error"}
                  />
                </label>
                <Button
                  id="command-image-clear"
                  type="button"
                  className="btn-small"
                  data-i18n="catalog.clear"
                  onClick={() => {
                    media.clear("image_asset");
                  }}
                  disabled={busy}
                >
                  {t("catalog.clear")}
                </Button>
              </div>
            </div>
            <p className="field-hint" data-i18n="catalog.imageFallbackHint">
              {t("catalog.imageFallbackHint")}
            </p>
            <p
              id="command-image-error"
              className="field-error"
              role="alert"
              hidden={!errors.image_asset}
            >
              {errors.image_asset}
            </p>
          </Field>
          <Field>
            <label
              htmlFor="command-image-fit-input"
              data-i18n="catalog.imageFitLabel"
            >
              {t("catalog.imageFitLabel")}
            </label>
            <select
              id="command-image-fit-input"
              name="image_fit"
              value={String(draft.image_fit)}
              onChange={(event) => change("image_fit", event.target.value)}
              disabled={busy}
              aria-invalid={!!errors.image_fit}
              aria-describedby={"command-image-fit-error"}
            >
              <option value="cover" data-i18n="obs.panelImageFitCover">
                {t("obs.panelImageFitCover")}
              </option>
              <option value="contain" data-i18n="obs.panelImageFitContain">
                {t("obs.panelImageFitContain")}
              </option>
              <option value="fill" data-i18n="obs.panelImageFitFill">
                {t("obs.panelImageFitFill")}
              </option>
              <option value="tile" data-i18n="obs.panelImageFitTile">
                {t("obs.panelImageFitTile")}
              </option>
            </select>
            <p className="field-hint" data-i18n="catalog.imageFitHint">
              {t("catalog.imageFitHint")}
            </p>
            <p
              id="command-image-fit-error"
              className="field-error"
              role="alert"
              hidden={!errors.image_fit}
            >
              {errors.image_fit}
            </p>
          </Field>
          <Field>
            <label
              htmlFor="command-image-size-input"
              data-i18n="catalog.imageSizeLabel"
            >
              {t("catalog.imageSizeLabel")}
            </label>
            <div className="catalog-volume-row">
              <input
                id="command-image-size-input"
                type="range"
                min="25"
                max="300"
                step="5"
                value={String(draft.image_size_pct)}
                onChange={(event) => change("image_size_pct", event.target.value)}
                disabled={busy}
                aria-invalid={!!errors.image_size_pct}
                aria-describedby={"command-image-size-error"}
              />
              <output
                id="command-image-size-value"
                htmlFor="command-image-size-input"
              >
                {draft.image_size_pct}%
              </output>
            </div>
            <p className="field-hint" data-i18n="catalog.imageSizeHint">
              {t("catalog.imageSizeHint")}
            </p>
            <p
              id="command-image-size-error"
              className="field-error"
              role="alert"
              hidden={!errors.image_size_pct}
            >
              {errors.image_size_pct}
            </p>
          </Field>
          <Field className="catalog-media-field">
            <span
              id="command-sound-file-label"
              className="form__label"
              data-i18n="catalog.customSoundLabel"
            >
              {t("catalog.customSoundLabel")}
            </span>
            <div className="catalog-media-actions">
              <label className="btn-physical btn-small catalog-media-upload">
                <span data-i18n="catalog.upload">{t("catalog.upload")}</span>
                <input
                  id="command-sound-file-input"
                  type="file"
                  accept="audio/mpeg,audio/wav,.mp3,.wav"
                  aria-labelledby="command-sound-file-label"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void media.upload("sound_file", file);
                  }}
                  aria-invalid={!!errors.sound_file}
                  aria-describedby={"command-sound-file-error"}
                />
              </label>
              <Button
                id="command-sound-file-clear"
                type="button"
                className="btn-small"
                data-i18n="catalog.clear"
                onClick={() => {
                  media.clear("sound_file");
                }}
                disabled={busy}
              >
                {t("catalog.clear")}
              </Button>
              <Button
                id="command-sound-play"
                type="button"
                className="btn-small"
                data-i18n="catalog.playSound"
                onClick={() => {
                  void media.play();
                }}
                disabled={busy}
              >
                {t("catalog.playSound")}
              </Button>
              <Button
                id="command-sound-stop"
                type="button"
                className="btn-small"
                data-i18n="catalog.stopSound"
                onClick={() => {
                  media.stop();
                }}
                disabled={busy}
              >
                {t("catalog.stopSound")}
              </Button>
            </div>
            <p
              id="command-sound-file-error"
              className="field-error"
              role="alert"
              hidden={!errors.sound_file}
            >
              {errors.sound_file}
            </p>
          </Field>
          <Field>
            <label
              htmlFor="command-sound-volume-input"
              data-i18n="catalog.soundVolumeLabel"
            >
              {t("catalog.soundVolumeLabel")}
            </label>
            <div className="catalog-volume-row">
              <input
                id="command-sound-volume-input"
                type="range"
                min="0"
                max="100"
                step="1"
                value={String(draft.sound_volume)}
                onChange={(event) => change("sound_volume", event.target.value)}
                disabled={busy}
                aria-invalid={!!errors.sound_volume}
                aria-describedby={"command-sound-volume-error"}
              />
              <output
                id="command-sound-volume-value"
                htmlFor="command-sound-volume-input"
              >
                {draft.sound_volume}%
              </output>
            </div>
            <p
              id="command-sound-volume-error"
              className="field-error"
              role="alert"
              hidden={!errors.sound_volume}
            >
              {errors.sound_volume}
            </p>
          </Field>
        </FormSection>
        <FormSection title={t("greetings.appearance")}>
          <fieldset className="form__field catalog-layout-field">
            <legend data-i18n="catalog.layoutLabel">
              {t("catalog.layoutLabel")}
            </legend>
            <div
              className="catalog-layout-group"
              role="radiogroup"
              aria-label="Alert layout"
            >
              <label className="catalog-layout-option">
                <input
                  type="radio"
                  name="command-layout"
                  value="card"
                  id="command-layout-card"
                  checked={draft.layout === "card"}
                  onChange={() => change("layout", "card")}
                  disabled={busy}
                  aria-describedby={"command-layout-error"}
                  aria-invalid={!!errors.layout}
                />
                <span data-i18n="catalog.layoutCard">
                  {t("catalog.layoutCard")}
                </span>
              </label>
              <label className="catalog-layout-option">
                <input
                  type="radio"
                  name="command-layout"
                  value="banner"
                  id="command-layout-banner"
                  checked={draft.layout === "banner"}
                  onChange={() => change("layout", "banner")}
                  disabled={busy}
                  aria-describedby={"command-layout-error"}
                  aria-invalid={!!errors.layout}
                />
                <span data-i18n="catalog.layoutBanner">
                  {t("catalog.layoutBanner")}
                </span>
              </label>
              <label className="catalog-layout-option">
                <input
                  type="radio"
                  name="command-layout"
                  value="fullscreen"
                  id="command-layout-fullscreen"
                  checked={draft.layout === "fullscreen"}
                  onChange={() => change("layout", "fullscreen")}
                  disabled={busy}
                  aria-describedby={"command-layout-error"}
                  aria-invalid={!!errors.layout}
                />
                <span data-i18n="catalog.layoutFullscreen">
                  {t("catalog.layoutFullscreen")}
                </span>
              </label>
            </div>
            <p
              id="command-layout-error"
              className="field-error"
              role="alert"
              hidden={!errors.layout}
            >
              {errors.layout}
            </p>
          </fieldset>
          <Field>
            <label
              htmlFor="command-duration-input"
              data-i18n="catalog.durationLabel"
            >
              {t("catalog.durationLabel")}
            </label>
            <input
              id="command-duration-input"
              type="number"
              min="1"
              step="1"
              value={String(draft.duration_ms)}
              onChange={(event) => change("duration_ms", event.target.value)}
              disabled={busy}
              aria-invalid={!!errors.duration_ms}
              aria-describedby={"command-duration-error"}
              required={draft.action === "alert"}
            />
            <p
              id="command-duration-error"
              className="field-error"
              role="alert"
              hidden={!errors.duration_ms}
            >
              {errors.duration_ms}
            </p>
          </Field>
        </FormSection>
      </div>
      <FormSection title={t("catalog.sectionLimits")}>
        <Field>
          <label
            htmlFor="command-cooldown-input"
            data-i18n="commands.cooldownLabel"
          >
            {t("commands.cooldownLabel")}
          </label>
          <input
            id="command-cooldown-input"
            type="number"
            min="0"
            step="1"
            required={true}
            value={String(draft.cooldown_seconds)}
            onChange={(event) => change("cooldown_seconds", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.cooldown_seconds}
            aria-describedby={"command-cooldown-error"}
          />
          <p
            id="command-cooldown-error"
            className="field-error"
            role="alert"
            hidden={!errors.cooldown_seconds}
          >
            {errors.cooldown_seconds}
          </p>
        </Field>
      </FormSection>
    </form>
  );
}
export function AwardFields({
  draft,
  errors,
  busy,
  identifier,
  change,
  media,
  onSubmit,
}: Props) {
  const { t } = useLocale();
  const { config } = useRuntime();
  const splash = useRef<HTMLInputElement>(null);
  return (
    <form
      id="awards-editor-form"
      className="audience-catalog-editor__body"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <FormSection title={t("catalog.sectionBasics")}>
        <Field>
          <label htmlFor="award-name-input" data-i18n="awards.nameLabel">
            {t("awards.nameLabel")}
          </label>
          <input
            id="award-name-input"
            type="text"
            autoComplete="off"
            required={true}
            value={String(draft.name)}
            onChange={(event) => change("name", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.name}
            aria-describedby={"award-name-error"}
          />
          <p
            id="award-name-error"
            className="field-error"
            role="alert"
            hidden={!errors.name}
          >
            {errors.name}
          </p>
        </Field>
        <Field>
          <label htmlFor="award-points-input" data-i18n="awards.pointsLabel">
            {t("awards.pointsLabel")}
          </label>
          <input
            id="award-points-input"
            type="number"
            min="1"
            step="1"
            required={true}
            value={String(draft.points)}
            onChange={(event) => change("points", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.points}
            aria-describedby={"award-points-error"}
          />
          <p
            id="award-points-error"
            className="field-error"
            role="alert"
            hidden={!errors.points}
          >
            {errors.points}
          </p>
        </Field>
      </FormSection>
      <FormSection title={t("greetings.content")}>
        <Field>
          <label htmlFor="award-splash-input" data-i18n="catalog.splashTemplate">
            {t("catalog.splashTemplate")}
          </label>
          <div
            id="award-splash-vars"
            className="catalog-template-vars"
            role="group"
            data-i18n-aria-label="catalog.templateVariables"
            aria-label={t("catalog.templateVariables")}
          >
            <TemplateChips
              input={splash}
              points={true}
              value={draft.splash_template}
              onChange={(value) => change("splash_template", value)}
            />
          </div>
          <input
            id="award-splash-input"
            type="text"
            autoComplete="off"
            required={true}
            value={String(draft.splash_template)}
            onChange={(event) => change("splash_template", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.splash_template}
            aria-describedby={"award-splash-error"}
            ref={splash}
          />
          <p
            id="award-splash-preview"
            className="catalog-template-preview"
            aria-live="polite"
          >
            {substituteSplashTemplate(draft.splash_template, {
              viewer: "Alice",
              streamer:
                config?.streamer_display_name?.trim() ||
                t("catalog.sampleStreamer"),
              points: Number(draft.points),
              message: t("catalog.sampleAwardMessage"),
            })}
          </p>
          <p
            id="award-splash-error"
            className="field-error"
            role="alert"
            hidden={!errors.splash_template}
          >
            {errors.splash_template}
          </p>
        </Field>
      </FormSection>
      <FormSection title={t("greetings.media")}>
        <Field>
          <label htmlFor="award-sound-input" data-i18n="catalog.soundLabel">
            {t("catalog.soundLabel")}
          </label>
          <select
            id="award-sound-input"
            value={String(draft.sound)}
            onChange={(event) => change("sound", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.sound}
            aria-describedby={"award-sound-error"}
          >
            <option value="" data-i18n="sound.silence">
              {t("sound.silence")}
            </option>
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
            id="award-sound-error"
            className="field-error"
            role="alert"
            hidden={!errors.sound}
          >
            {errors.sound}
          </p>
        </Field>
        <Field className="catalog-media-field">
          <span
            id="award-image-label"
            className="form__label"
            data-i18n="catalog.imageLabel"
          >
            {t("catalog.imageLabel")}
          </span>
          <div className="catalog-media-row">
            <div
              id="award-image-preview"
              role="group"
              className="catalog-media-preview"
              aria-labelledby="award-image-label"
            >
              <MediaImage kind="award" draft={draft} identifier={identifier} />
            </div>
            <div className="catalog-media-actions">
              <label className="btn-physical btn-small catalog-media-upload">
                <span data-i18n="catalog.upload">{t("catalog.upload")}</span>
                <input
                  id="award-image-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-labelledby="award-image-label"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void media.upload("image_asset", file);
                  }}
                  aria-invalid={!!errors.image_asset}
                  aria-describedby={"award-image-error"}
                />
              </label>
              <Button
                id="award-image-clear"
                type="button"
                className="btn-small"
                data-i18n="catalog.clear"
                onClick={() => {
                  media.clear("image_asset");
                }}
                disabled={busy}
              >
                {t("catalog.clear")}
              </Button>
            </div>
          </div>
          <p className="field-hint" data-i18n="catalog.imageFallbackHint">
            {t("catalog.imageFallbackHint")}
          </p>
          <p
            id="award-image-error"
            className="field-error"
            role="alert"
            hidden={!errors.image_asset}
          >
            {errors.image_asset}
          </p>
        </Field>
        <Field>
          <label
            htmlFor="award-image-fit-input"
            data-i18n="catalog.imageFitLabel"
          >
            {t("catalog.imageFitLabel")}
          </label>
          <select
            id="award-image-fit-input"
            name="image_fit"
            value={String(draft.image_fit)}
            onChange={(event) => change("image_fit", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.image_fit}
            aria-describedby={"award-image-fit-error"}
          >
            <option value="cover" data-i18n="obs.panelImageFitCover">
              {t("obs.panelImageFitCover")}
            </option>
            <option value="contain" data-i18n="obs.panelImageFitContain">
              {t("obs.panelImageFitContain")}
            </option>
            <option value="fill" data-i18n="obs.panelImageFitFill">
              {t("obs.panelImageFitFill")}
            </option>
            <option value="tile" data-i18n="obs.panelImageFitTile">
              {t("obs.panelImageFitTile")}
            </option>
          </select>
          <p className="field-hint" data-i18n="catalog.imageFitHint">
            {t("catalog.imageFitHint")}
          </p>
          <p
            id="award-image-fit-error"
            className="field-error"
            role="alert"
            hidden={!errors.image_fit}
          >
            {errors.image_fit}
          </p>
        </Field>
        <Field>
          <label
            htmlFor="award-image-size-input"
            data-i18n="catalog.imageSizeLabel"
          >
            {t("catalog.imageSizeLabel")}
          </label>
          <div className="catalog-volume-row">
            <input
              id="award-image-size-input"
              type="range"
              min="25"
              max="300"
              step="5"
              value={String(draft.image_size_pct)}
              onChange={(event) => change("image_size_pct", event.target.value)}
              disabled={busy}
              aria-invalid={!!errors.image_size_pct}
              aria-describedby={"award-image-size-error"}
            />
            <output id="award-image-size-value" htmlFor="award-image-size-input">
              {draft.image_size_pct}%
            </output>
          </div>
          <p className="field-hint" data-i18n="catalog.imageSizeHint">
            {t("catalog.imageSizeHint")}
          </p>
          <p
            id="award-image-size-error"
            className="field-error"
            role="alert"
            hidden={!errors.image_size_pct}
          >
            {errors.image_size_pct}
          </p>
        </Field>
        <Field className="catalog-media-field">
          <span
            id="award-sound-file-label"
            className="form__label"
            data-i18n="catalog.customSoundLabel"
          >
            {t("catalog.customSoundLabel")}
          </span>
          <div className="catalog-media-actions">
            <label className="btn-physical btn-small catalog-media-upload">
              <span data-i18n="catalog.upload">{t("catalog.upload")}</span>
              <input
                id="award-sound-file-input"
                type="file"
                accept="audio/mpeg,audio/wav,.mp3,.wav"
                aria-labelledby="award-sound-file-label"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void media.upload("sound_file", file);
                }}
                aria-invalid={!!errors.sound_file}
                aria-describedby={"award-sound-file-error"}
              />
            </label>
            <Button
              id="award-sound-file-clear"
              type="button"
              className="btn-small"
              data-i18n="catalog.clear"
              onClick={() => {
                media.clear("sound_file");
              }}
              disabled={busy}
            >
              {t("catalog.clear")}
            </Button>
            <Button
              id="award-sound-play"
              type="button"
              className="btn-small"
              data-i18n="catalog.playSound"
              onClick={() => {
                void media.play();
              }}
              disabled={busy}
            >
              {t("catalog.playSound")}
            </Button>
            <Button
              id="award-sound-stop"
              type="button"
              className="btn-small"
              data-i18n="catalog.stopSound"
              onClick={() => {
                media.stop();
              }}
              disabled={busy}
            >
              {t("catalog.stopSound")}
            </Button>
          </div>
          <p
            id="award-sound-file-error"
            className="field-error"
            role="alert"
            hidden={!errors.sound_file}
          >
            {errors.sound_file}
          </p>
        </Field>
        <Field>
          <label
            htmlFor="award-sound-volume-input"
            data-i18n="catalog.soundVolumeLabel"
          >
            {t("catalog.soundVolumeLabel")}
          </label>
          <div className="catalog-volume-row">
            <input
              id="award-sound-volume-input"
              type="range"
              min="0"
              max="100"
              step="1"
              value={String(draft.sound_volume)}
              onChange={(event) => change("sound_volume", event.target.value)}
              disabled={busy}
              aria-invalid={!!errors.sound_volume}
              aria-describedby={"award-sound-volume-error"}
            />
            <output
              id="award-sound-volume-value"
              htmlFor="award-sound-volume-input"
            >
              {draft.sound_volume}%
            </output>
          </div>
          <p
            id="award-sound-volume-error"
            className="field-error"
            role="alert"
            hidden={!errors.sound_volume}
          >
            {errors.sound_volume}
          </p>
        </Field>
      </FormSection>
      <FormSection title={t("greetings.appearance")}>
        <fieldset className="form__field catalog-layout-field">
          <legend data-i18n="catalog.layoutLabel">
            {t("catalog.layoutLabel")}
          </legend>
          <div
            className="catalog-layout-group"
            role="radiogroup"
            aria-label="Alert layout"
          >
            <label className="catalog-layout-option">
              <input
                type="radio"
                name="award-layout"
                value="card"
                id="award-layout-card"
                checked={draft.layout === "card"}
                onChange={() => change("layout", "card")}
                disabled={busy}
                aria-describedby={"award-layout-error"}
                aria-invalid={!!errors.layout}
              />
              <span data-i18n="catalog.layoutCard">
                {t("catalog.layoutCard")}
              </span>
            </label>
            <label className="catalog-layout-option">
              <input
                type="radio"
                name="award-layout"
                value="banner"
                id="award-layout-banner"
                checked={draft.layout === "banner"}
                onChange={() => change("layout", "banner")}
                disabled={busy}
                aria-describedby={"award-layout-error"}
                aria-invalid={!!errors.layout}
              />
              <span data-i18n="catalog.layoutBanner">
                {t("catalog.layoutBanner")}
              </span>
            </label>
            <label className="catalog-layout-option">
              <input
                type="radio"
                name="award-layout"
                value="fullscreen"
                id="award-layout-fullscreen"
                checked={draft.layout === "fullscreen"}
                onChange={() => change("layout", "fullscreen")}
                disabled={busy}
                aria-describedby={"award-layout-error"}
                aria-invalid={!!errors.layout}
              />
              <span data-i18n="catalog.layoutFullscreen">
                {t("catalog.layoutFullscreen")}
              </span>
            </label>
          </div>
          <p
            id="award-layout-error"
            className="field-error"
            role="alert"
            hidden={!errors.layout}
          >
            {errors.layout}
          </p>
        </fieldset>
        <Field>
          <label htmlFor="award-duration-input" data-i18n="catalog.durationLabel">
            {t("catalog.durationLabel")}
          </label>
          <input
            id="award-duration-input"
            type="number"
            min="1"
            step="1"
            required={true}
            value={String(draft.duration_ms)}
            onChange={(event) => change("duration_ms", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.duration_ms}
            aria-describedby={"award-duration-error"}
          />
          <p
            id="award-duration-error"
            className="field-error"
            role="alert"
            hidden={!errors.duration_ms}
          >
            {errors.duration_ms}
          </p>
        </Field>
      </FormSection>
    </form>
  );
}
export function GreetingFields({
  draft,
  errors,
  busy,
  identifier,
  status,
  change,
  media,
  onSubmit,
}: Props) {
  const { t } = useLocale();
  const { config } = useRuntime();
  const splash = useRef<HTMLInputElement>(null);
  return (
    <form
      id="greetings-form"
      className="audience-catalog-editor__body"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <FormSection title={t("greetings.behavior")}>
        <Field>
          <label>
            <input
              id="greeting-enabled"
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => change("enabled", event.target.checked)}
              disabled={busy}
              aria-invalid={!!errors.enabled}
              aria-describedby={"greeting-enabled-error"}
            />
            <span data-i18n="greetings.enabled">{t("greetings.enabled")}</span>
            <p
              id="greeting-enabled-error"
              className="field-error"
              role="alert"
              hidden={!errors.enabled}
            >
              {errors.enabled}
            </p>
          </label>
          <p id="greeting-trigger" className="field-hint">
            {t(
              identifier === "returning_viewer"
                ? "greetings.returningViewerHint"
                : "greetings.newViewerHint",
            )}
          </p>
        </Field>
      </FormSection>
      <FormSection title={t("greetings.content")}>
        <Field>
          <label htmlFor="greeting-template" data-i18n="catalog.splashTemplate">
            {t("catalog.splashTemplate")}
          </label>
          <div
            id="greeting-template-vars"
            className="catalog-template-vars"
            role="group"
            data-i18n-aria-label="catalog.templateVariables"
            aria-label={t("catalog.templateVariables")}
          >
            <TemplateChips
              input={splash}
              points={false}
              value={draft.splash_template}
              onChange={(value) => change("splash_template", value)}
            />
          </div>
          <input
            id="greeting-template"
            type="text"
            required={true}
            autoComplete="off"
            value={String(draft.splash_template)}
            onChange={(event) => change("splash_template", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.splash_template}
            aria-describedby={"greeting-template-error"}
            ref={splash}
          />
          <p
            id="greeting-template-preview"
            className="catalog-template-preview"
            aria-live="polite"
          >
            {substituteSplashTemplate(draft.splash_template, {
              viewer: "Alice",
              streamer:
                config?.streamer_display_name?.trim() ||
                t("catalog.sampleStreamer"),
              points: Number(draft.points),
              message: "Hello!",
            })}
          </p>
          <p
            className="field-error"
            data-greeting-error="splash_template"
            role="alert"
            id="greeting-template-error"
            hidden={!errors.splash_template}
          >
            {errors.splash_template}
          </p>
        </Field>
      </FormSection>
      <FormSection title={t("greetings.media")}>
        <Field>
          <label htmlFor="greeting-sound" data-i18n="catalog.soundLabel">
            {t("catalog.soundLabel")}
          </label>
          <select
            id="greeting-sound"
            value={String(draft.sound)}
            onChange={(event) => change("sound", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.sound}
            aria-describedby={"greeting-sound-error"}
          >
            <option value="" data-i18n="sound.silence">
              {t("sound.silence")}
            </option>
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
            id="greeting-sound-error"
            className="field-error"
            role="alert"
            hidden={!errors.sound}
          >
            {errors.sound}
          </p>
        </Field>
        <Field className="catalog-media-field">
          <span
            id="greeting-image-label"
            className="form__label"
            data-i18n="catalog.imageLabel"
          >
            {t("catalog.imageLabel")}
          </span>
          <div className="catalog-media-row">
            <div
              id="greeting-image-preview"
              role="group"
              className="catalog-media-preview"
              aria-labelledby="greeting-image-label"
            >
              <MediaImage
                kind="greeting"
                draft={draft}
                identifier={identifier}
              />
            </div>
            <div className="catalog-media-actions">
              <label className="btn-physical btn-small catalog-media-upload">
                <span data-i18n="catalog.upload">{t("catalog.upload")}</span>
                <input
                  id="greeting-image-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-labelledby="greeting-image-label"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void media.upload("image_asset", file);
                  }}
                  aria-invalid={!!errors.image_asset}
                  aria-describedby={"greeting-image-error"}
                />
              </label>
              <Button
                id="greeting-image-clear"
                type="button"
                className="btn-small"
                data-i18n="catalog.clear"
                onClick={() => {
                  media.clear("image_asset");
                }}
                disabled={busy}
              >
                {t("catalog.clear")}
              </Button>
            </div>
          </div>
          <p className="field-hint" data-i18n="catalog.imageFallbackHint">
            {t("catalog.imageFallbackHint")}
          </p>
          <p
            id="greeting-image-error"
            className="field-error"
            role="alert"
            hidden={!errors.image_asset}
          >
            {errors.image_asset}
          </p>
        </Field>
        <Field>
          <label
            htmlFor="greeting-image-fit-input"
            data-i18n="catalog.imageFitLabel"
          >
            {t("catalog.imageFitLabel")}
          </label>
          <select
            id="greeting-image-fit-input"
            name="image_fit"
            value={String(draft.image_fit)}
            onChange={(event) => change("image_fit", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.image_fit}
            aria-describedby={"greeting-image-fit-error"}
          >
            <option value="cover" data-i18n="obs.panelImageFitCover">
              {t("obs.panelImageFitCover")}
            </option>
            <option value="contain" data-i18n="obs.panelImageFitContain">
              {t("obs.panelImageFitContain")}
            </option>
            <option value="fill" data-i18n="obs.panelImageFitFill">
              {t("obs.panelImageFitFill")}
            </option>
            <option value="tile" data-i18n="obs.panelImageFitTile">
              {t("obs.panelImageFitTile")}
            </option>
          </select>
          <p className="field-hint" data-i18n="catalog.imageFitHint">
            {t("catalog.imageFitHint")}
          </p>
          <p
            id="greeting-image-fit-error"
            className="field-error"
            role="alert"
            hidden={!errors.image_fit}
          >
            {errors.image_fit}
          </p>
        </Field>
        <Field>
          <label
            htmlFor="greeting-image-size-input"
            data-i18n="catalog.imageSizeLabel"
          >
            {t("catalog.imageSizeLabel")}
          </label>
          <div className="catalog-volume-row">
            <input
              id="greeting-image-size-input"
              type="range"
              min="25"
              max="300"
              step="5"
              value={String(draft.image_size_pct)}
              onChange={(event) => change("image_size_pct", event.target.value)}
              disabled={busy}
              aria-invalid={!!errors.image_size_pct}
              aria-describedby={"greeting-image-size-error"}
            />
            <output
              id="greeting-image-size-value"
              htmlFor="greeting-image-size-input"
            >
              {draft.image_size_pct}%
            </output>
          </div>
          <p className="field-hint" data-i18n="catalog.imageSizeHint">
            {t("catalog.imageSizeHint")}
          </p>
          <p
            id="greeting-image-size-error"
            className="field-error"
            role="alert"
            hidden={!errors.image_size_pct}
          >
            {errors.image_size_pct}
          </p>
        </Field>
        <Field className="catalog-media-field">
          <span
            id="greeting-sound-file-label"
            className="form__label"
            data-i18n="catalog.customSoundLabel"
          >
            {t("catalog.customSoundLabel")}
          </span>
          <div className="catalog-media-actions">
            <label className="btn-physical btn-small catalog-media-upload">
              <span data-i18n="catalog.upload">{t("catalog.upload")}</span>
              <input
                id="greeting-sound-file-input"
                type="file"
                accept="audio/mpeg,audio/wav,.mp3,.wav"
                aria-labelledby="greeting-sound-file-label"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void media.upload("sound_file", file);
                }}
                aria-invalid={!!errors.sound_file}
                aria-describedby={"greeting-sound-file-error"}
              />
            </label>
            <Button
              id="greeting-sound-file-clear"
              type="button"
              className="btn-small"
              data-i18n="catalog.clear"
              onClick={() => {
                media.clear("sound_file");
              }}
              disabled={busy}
            >
              {t("catalog.clear")}
            </Button>
            <Button
              id="greeting-sound-play"
              type="button"
              className="btn-small"
              data-i18n="catalog.playSound"
              onClick={() => {
                void media.play();
              }}
              disabled={busy}
            >
              {t("catalog.playSound")}
            </Button>
            <Button
              id="greeting-sound-stop"
              type="button"
              className="btn-small"
              data-i18n="catalog.stopSound"
              onClick={() => {
                media.stop();
              }}
              disabled={busy}
            >
              {t("catalog.stopSound")}
            </Button>
          </div>
          <p
            id="greeting-sound-file-error"
            className="field-error"
            role="alert"
            hidden={!errors.sound_file}
          >
            {errors.sound_file}
          </p>
        </Field>
        <Field>
          <label
            htmlFor="greeting-sound-volume-input"
            data-i18n="catalog.soundVolumeLabel"
          >
            {t("catalog.soundVolumeLabel")}
          </label>
          <div className="catalog-volume-row">
            <input
              id="greeting-sound-volume-input"
              type="range"
              min="0"
              max="100"
              step="1"
              value={String(draft.sound_volume)}
              onChange={(event) => change("sound_volume", event.target.value)}
              disabled={busy}
              aria-invalid={!!errors.sound_volume}
              aria-describedby={"greeting-sound-volume-error"}
            />
            <output
              id="greeting-sound-volume-value"
              htmlFor="greeting-sound-volume-input"
            >
              {draft.sound_volume}%
            </output>
          </div>
          <p
            id="greeting-sound-volume-error"
            className="field-error"
            role="alert"
            hidden={!errors.sound_volume}
          >
            {errors.sound_volume}
          </p>
        </Field>
      </FormSection>
      <FormSection title={t("greetings.appearance")}>
        <Field>
          <span className="form__label" data-i18n="catalog.layoutLabel">
            {t("catalog.layoutLabel")}
          </span>
          <div
            className="catalog-layout-group"
            role="radiogroup"
            aria-label="Alert layout"
          >
            <label className="catalog-layout-option">
              <input
                type="radio"
                name="greeting-layout"
                value="card"
                id="greeting-layout-card"
                checked={draft.layout === "card"}
                onChange={() => change("layout", "card")}
                disabled={busy}
                aria-describedby={"greeting-layout-error"}
                aria-invalid={!!errors.layout}
              />
              <span data-i18n="catalog.layoutCard">
                {t("catalog.layoutCard")}
              </span>
            </label>
            <label className="catalog-layout-option">
              <input
                type="radio"
                name="greeting-layout"
                value="banner"
                id="greeting-layout-banner"
                checked={draft.layout === "banner"}
                onChange={() => change("layout", "banner")}
                disabled={busy}
                aria-describedby={"greeting-layout-error"}
                aria-invalid={!!errors.layout}
              />
              <span data-i18n="catalog.layoutBanner">
                {t("catalog.layoutBanner")}
              </span>
            </label>
            <label className="catalog-layout-option">
              <input
                type="radio"
                name="greeting-layout"
                value="fullscreen"
                id="greeting-layout-fullscreen"
                checked={draft.layout === "fullscreen"}
                onChange={() => change("layout", "fullscreen")}
                disabled={busy}
                aria-describedby={"greeting-layout-error"}
                aria-invalid={!!errors.layout}
              />
              <span data-i18n="catalog.layoutFullscreen">
                {t("catalog.layoutFullscreen")}
              </span>
            </label>
          </div>
          <p
            id="greeting-layout-error"
            className="field-error"
            role="alert"
            hidden={!errors.layout}
          >
            {errors.layout}
          </p>
          <label htmlFor="greeting-duration" data-i18n="catalog.durationLabel">
            {t("catalog.durationLabel")}
          </label>
          <input
            id="greeting-duration"
            type="number"
            min="1"
            required={true}
            value={String(draft.duration_ms)}
            onChange={(event) => change("duration_ms", event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.duration_ms}
            aria-describedby={"greeting-duration-error"}
          />
          <p
            className="field-error"
            data-greeting-error="duration_ms"
            role="alert"
            id="greeting-duration-error"
            hidden={!errors.duration_ms}
          >
            {errors.duration_ms}
          </p>
        </Field>
      </FormSection>
      <p
        id="greetings-status"
        className="field-hint"
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
    </form>
  );
}
