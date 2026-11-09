import {
  useId,
  useState,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { useLocale } from "../../app/locale";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { Field, FormSection } from "../../components/Field";
import {
  deliveries,
  presets,
  type AISettings,
  type AICharacter,
} from "./types";

export function AIField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(
        children as ReactElement<{
          id?: string;
          "aria-describedby"?: string;
          "aria-invalid"?: boolean;
        }>,
        {
          id,
          "aria-describedby": error ? id + "-error" : undefined,
          "aria-invalid": !!error,
        },
      )
    : children;
  return (
    <Field>
      <label htmlFor={id}>{label}</label>
      {control}
      {error && (
        <p id={id + "-error"} role="alert" className="form__error">
          {error}
        </p>
      )}
    </Field>
  );
}
export interface ImageCommand {
  id: string;
  trigger: string;
  image_asset?: string;
  action: string;
  enabled: boolean;
}
export function AIFields({
  value,
  change,
  commands,
  errors,
  credentials,
}: {
  value: AISettings;
  change: (next: AISettings) => void;
  commands: ImageCommand[];
  errors: Record<string, string>;
  credentials?: Record<string, boolean>;
}) {
  const { t } = useLocale();
  const id = useId();
  const [help, setHelp] = useState(false);
  function character(index: number, patch: Partial<AICharacter>) {
    change({
      ...value,
      characters: value.characters.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  }
  const eligible = commands.filter(
    (item) => item.enabled && item.action === "alert" && item.image_asset,
  );
  return (
    <>
      {(["llm", "tts"] as const).map((kind) => {
        const profile = value[kind];
        const update = (patch: Partial<typeof profile>) =>
          change({ ...value, [kind]: { ...profile, ...patch } });
        return (
          <FormSection key={kind} title={t("ai." + kind)}>
            {kind === "llm" && (
              <AIField label={t("ai.provider")}>
                <select
                  value={profile.preset}
                  onChange={(e) => {
                    const preset = presets[e.target.value];
                    update({
                      preset: e.target.value,
                      ...(preset
                        ? { base_url: preset.url, api_key_env: preset.key }
                        : {}),
                    });
                  }}
                >
                  {[...Object.keys(presets), "custom"].map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </AIField>
            )}
            {(["base_url", "model", "api_key_env"] as const).map((key) => (
              <AIField
                key={key}
                label={t("ai." + key)}
                error={errors[`ai_messages.${kind}.${key}`]}
              >
                <input
                  value={profile[key]}
                  aria-invalid={!!errors[`ai_messages.${kind}.${key}`]}
                  onChange={(e) => update({ [key]: e.target.value })}
                  autoComplete="off"
                  spellCheck={false}
                />
              </AIField>
            ))}
            <div>
              <Button
                type="button"
                className="btn-small"
                onClick={() => setHelp(true)}
              >
                {t("ai.keyHelp")}
              </Button>
              <span role="status">
                {" "}
                {t(credentials?.[kind] ? "ai.keyAvailable" : "ai.keyMissing")}
              </span>
            </div>
            <AIField
              label={t("ai.timeout")}
              error={errors[`ai_messages.${kind}.timeout_seconds`]}
            >
              <input
                type="number"
                min={1}
                max={kind === "llm" ? 60 : 120}
                value={profile.timeout_seconds}
                onChange={(e) =>
                  update({ timeout_seconds: Number(e.target.value) })
                }
              />
            </AIField>
            {kind === "llm" && (
              <AIField label={t("ai.outputMode")}>
                <select
                  value={profile.output_mode}
                  onChange={(e) => update({ output_mode: e.target.value })}
                >
                  <option value="json_schema">JSON Schema</option>
                  <option value="json_object">JSON object</option>
                </select>
              </AIField>
            )}
          </FormSection>
        );
      })}
      <FormSection title={t("ai.policy")}>
        <p>{t("ai.policyHint")}</p>
        <AIField label={t("ai.context")}>
          <textarea
            rows={3}
            maxLength={4000}
            value={value.stream_context}
            onChange={(e) =>
              change({ ...value, stream_context: e.target.value })
            }
          />
        </AIField>
        <AIField
          label={t("ai.denylist")}
          error={errors["ai_messages.denylist"]}
        >
          <textarea
            rows={3}
            value={value.denylist.join("\n")}
            onChange={(e) =>
              change({ ...value, denylist: e.target.value.split("\n") })
            }
          />
        </AIField>
      </FormSection>
      <FormSection title={t("ai.characters")}>
        <p>{t("ai.charactersHint")}</p>
        {errors["ai_messages.characters"] && (
          <p role="alert">{errors["ai_messages.characters"]}</p>
        )}
        {value.characters.map((ch, index) => (
          <FormSection key={index} title={ch.label || t("ai.character")}>
            {(["id", "label", "description", "voice_id"] as const).map(
              (key) => (
                <AIField key={key} label={t("ai." + key)}>
                  <input
                    value={ch[key]}
                    onChange={(e) =>
                      character(index, { [key]: e.target.value })
                    }
                  />
                </AIField>
              ),
            )}
            <AIField label={t("ai.delivery")}>
              <select
                value={ch.default_delivery}
                onChange={(e) =>
                  character(index, { default_delivery: e.target.value })
                }
              >
                {deliveries.map((d) => (
                  <option key={d} value={d}>
                    {t("ai.delivery." + d)}
                  </option>
                ))}
              </select>
            </AIField>
            {ch.images.map((im, i) => (
              <div key={i} className="ai-image-binding">
                <AIField label={t("ai.imageID")}>
                  <input
                    value={im.id}
                    onChange={(e) =>
                      character(index, {
                        images: ch.images.map((v, n) =>
                          n === i ? { ...v, id: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </AIField>
                <AIField label={t("ai.commandImage")}>
                  <select
                    value={im.command_id}
                    onChange={(e) =>
                      character(index, {
                        images: ch.images.map((v, n) =>
                          n === i ? { ...v, command_id: e.target.value } : v,
                        ),
                      })
                    }
                  >
                    <option value="">{t("ai.selectImage")}</option>
                    {eligible.map((cmd) => (
                      <option key={cmd.id} value={cmd.id}>
                        !{cmd.trigger}
                      </option>
                    ))}
                  </select>
                </AIField>
                <AIField label={t("ai.situation")}>
                  <input
                    value={im.description}
                    onChange={(e) =>
                      character(index, {
                        images: ch.images.map((v, n) =>
                          n === i ? { ...v, description: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </AIField>
                <Button
                  type="button"
                  onClick={() =>
                    character(index, {
                      images: ch.images.filter((_, n) => n !== i),
                    })
                  }
                >
                  {t("ai.removeImage")}
                </Button>
              </div>
            ))}
            <div className="ai-actions">
              <Button
                type="button"
                disabled={ch.images.length >= 50}
                onClick={() =>
                  character(index, {
                    images: [
                      ...ch.images,
                      {
                        id: "image_" + (ch.images.length + 1),
                        command_id: "",
                        description: "",
                      },
                    ],
                  })
                }
              >
                {t("ai.addImage")}
              </Button>
              <Button
                type="button"
                onClick={() =>
                  change({
                    ...value,
                    characters: value.characters.filter((_, i) => i !== index),
                  })
                }
              >
                {t("ai.removeCharacter")}
              </Button>
            </div>
          </FormSection>
        ))}
        <Button
          type="button"
          disabled={value.characters.length >= 32}
          onClick={() =>
            change({
              ...value,
              characters: [
                ...value.characters,
                {
                  id: "character_" + (value.characters.length + 1),
                  label: "",
                  description: "",
                  voice_id: "",
                  default_delivery: "neutral",
                  images: [],
                },
              ],
            })
          }
        >
          {t("ai.addCharacter")}
        </Button>
      </FormSection>
      <FormSection title={t("ai.limits")}>
        <p>{t("ai.budgetHint")}</p>
        {Object.entries(value.limits).map(([key, n]) => (
          <AIField
            key={key}
            label={t("ai.limit." + key)}
            error={errors["ai_messages.limits." + key]}
          >
            <input
              type="number"
              min={key.includes("cooldown") || key.includes("interval") ? 0 : 1}
              value={n}
              aria-invalid={!!errors["ai_messages.limits." + key]}
              onChange={(e) =>
                change({
                  ...value,
                  limits: { ...value.limits, [key]: Number(e.target.value) },
                })
              }
            />
          </AIField>
        ))}
      </FormSection>
      <Dialog
        id={id}
        open={help}
        onClose={() => setHelp(false)}
        title={t("ai.keyHelp")}
        actions={
          <Button type="button" onClick={() => setHelp(false)}>
            {t("ai.close")}
          </Button>
        }
      >
        <p>{t("ai.keyHelpText")}</p>
      </Dialog>
    </>
  );
}
