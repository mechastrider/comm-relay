import { Field } from "../../components/Field";
import { Button } from "../../components/Button";
import { preferenceStorage } from "../../services/storage";
import { useReportSaveStatus } from "../../app/save-status";
import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router";
import { useLocale } from "../../app/locale";
import { useRuntime } from "../../app/runtime";
import { Dialog } from "../../components/Dialog";
import { ApiError, post } from "../../services/api";
import type { PublicConfig } from "../../services/types";
import { configUpdateBase } from "../settings/values";
import { uploadAsset, deleteAsset } from "../../services/assets";
import { StudioFrame } from "./StudioFrame";
import { Inspector } from "./Inspector";
import { Preview } from "./Preview";
import { OBSSetup } from "./OBSSetup";
import { Presets } from "./Presets";
import {
  readPresets,
  fieldsFor,
  changeField,
  resetGroup,
  normalizePreset,
  validationTarget,
  resetFields,
  paths,
  type Preset,
  type Surface,
  type Values,
} from "./model";
import {
  readStudioModePreference,
  writeStudioModePreference,
  readStudioSurfaceRailCollapsedPreference,
  writeStudioSurfaceRailCollapsedPreference,
  readStudioSetupState,
} from "./studio-helpers";
import { copyText, readPreference, writePreference } from "./preferences";
import schema from "./fields.json";
function focusField(id: string) {
  requestAnimationFrame(() => {
    const control = document.getElementById(id);
    let parent = control?.parentElement;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    control?.focus();
  });
}
const surfaces: Surface[] = ["chat", "leaderboard", "alerts", "recap"];
const themes = {
  default: "obs.themeDefault",
  dashboard: "obs.themeTextOnly",
  cockpit_panel: "obs.themeCockpitPanel",
  cockpit_popups: "obs.themeCockpitPopups",
  g_rebels_popups: "obs.themeGRebels",
};
type Prompt = "" | "create" | "rename" | "duplicate" | "delete";
export function Studio() {
  const { t } = useLocale(),
    { config, updateConfig, applyConfig } = useRuntime();
  const [draft, setDraft] = useState<{
      baseline: Preset[];
      presets: Preset[];
    } | null>(null),
    [selection, setSelection] = useState("");
  const [raw, setRaw] = useState<Record<string, Values>>({});
  const [surface, setSurface] = useState<Surface>(() => {
    const saved = readPreference("commRelay.overlayPreview.surface", "chat");
    return surfaces.includes(saved as Surface) ? (saved as Surface) : "chat";
  });
  const [mode, setMode] = useState(() =>
      readStudioModePreference(preferenceStorage()),
    ),
    [collapsed, setCollapsed] = useState(() =>
      readStudioSurfaceRailCollapsedPreference(preferenceStorage()),
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [status, setStatus] = useState("");
  const [prompt, setPrompt] = useState<Prompt>(""),
    [name, setName] = useState(""),
    [promptError, setPromptError] = useState("");
  const [period, setPeriod] = useState("session");
  const [setup, setSetup] = useState(
    () => readStudioSetupState(preferenceStorage()) === "unseen",
  );
  const pending = useRef(false),
    alive = useRef(true),
    provisional = useRef(new Set<string>());
  const persisted = config ? readPresets(config.overlay) : [];
  const presets = draft?.presets ?? persisted;
  const active = String(
    config?.overlay.active_preset_id ?? presets[0]?.id ?? "",
  );
  const selected =
    presets.find((item) => item.id === selection) ??
    presets.find((item) => item.id === active) ??
    presets[0];
  const dirty =
    !!draft &&
    (JSON.stringify(draft.baseline) !== JSON.stringify(draft.presets) ||
      Object.values(raw).some((values) => Object.keys(values).length));
  useReportSaveStatus(dirty, busy);
  const blocker = useBlocker(dirty || busy);
  useEffect(() => {
    alive.current = true;
    const cleanup = () => {
      for (const filename of provisional.current) void deleteAsset(filename);
      provisional.current.clear();
    };
    window.addEventListener("beforeunload", cleanup);
    return () => {
      alive.current = false;
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  if (!config || !selected) return <p role="status">{t("state.loading")}</p>;
  const rawKey = selected.id + ":" + surface;
  const values = {
    ...fieldsFor(selected, surface),
    ...raw[rawKey],
    "overlay-leaderboard-period": period,
  };
  const update = (next: Preset) => {
    setDraft((current) => ({
      baseline: current?.baseline ?? persisted,
      presets: (current?.presets ?? persisted).map((item) =>
        item.id === next.id ? next : item,
      ),
    }));
    setStatus("");
  };
  const change = (id: string, value: string | boolean) => {
    if (id === "overlay-leaderboard-period") {
      setPeriod(String(value));
      return;
    }
    const field = (
      schema as Record<
        string,
        { type: string; min?: string; max?: string; step?: string }
      >
    )[id];
    const invalid =
      field &&
      ["number", "range"].includes(field.type) &&
      (!String(value).trim() ||
        !Number.isFinite(Number(value)) ||
        (field.min !== undefined && Number(value) < Number(field.min)) ||
        (field.max !== undefined && Number(value) > Number(field.max)) ||
        (field.step === "1" && !Number.isInteger(Number(value))));
    setRaw((current) => {
      const next = { ...current[rawKey] };
      if (invalid) next[id] = value;
      else delete next[id];
      return { ...current, [rawKey]: next };
    });
    setErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (invalid) {
      setDraft(
        (current) => current ?? { baseline: persisted, presets: persisted },
      );
      return;
    }
    update(changeField(selected, surface, id, value));
  };
  const discard = () => {
    setDraft(null);
    setRaw({});
    for (const filename of provisional.current) void deleteAsset(filename);
    provisional.current.clear();
  };
  const save = async (activate = false) => {
    if (pending.current) return;
    const invalid = Object.entries(raw).find(
      ([, values]) => Object.keys(values).length,
    );
    if (invalid) {
      const [presetID, selectedSurface] = invalid[0].split(":");
      setSelection(presetID);
      setSurface(selectedSurface as Surface);
      const field = Object.keys(invalid[1])[0];
      setErrors({ [field]: t("banner.checkFields") });
      setMode("all");
      focusField(field);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      if (activate)
        applyConfig(
          await post<PublicConfig>("/api/overlay/activate", {
            preset_id: selected.id,
          }),
        );
      else {
        await updateConfig((latest) => ({
          ...configUpdateBase(latest),
          overlay: {
            ...latest.overlay,
            max_messages: selected.max_messages,
            message_ttl_seconds: selected.message_ttl_seconds,
            font_size_px: selected.font_size_px,
            display_mode: selected.display_mode,
            theme: selected.theme,
            presets,
            active_preset_id: latest.overlay.active_preset_id || selected.id,
          },
        }));
        if (alive.current) {
          setDraft(null);
          setRaw({});
          setStatus(t("studio.publishSuccess"));
        }
        const retained = new Set(
          presets.map((item) => item.style.panel_image).filter(Boolean),
        );
        for (const filename of provisional.current)
          if (!retained.has(filename)) void deleteAsset(filename);
        provisional.current.clear();
        for (const old of persisted)
          if (old.style.panel_image && !retained.has(old.style.panel_image))
            void deleteAsset(String(old.style.panel_image));
      }
    } catch (cause) {
      if (!alive.current) return;
      setError(cause instanceof Error ? cause.message : String(cause));
      if (cause instanceof ApiError) {
        const targets = Object.entries(cause.fields).map(([key, message]) => ({
          ...validationTarget(key, presets, surface),
          message,
        }));
        const first = targets[0];
        if (first) {
          if (first.preset) setSelection(first.preset);
          setSurface(first.surface);
          setMode("all");
          focusField(first.field);
        }
        setErrors(
          Object.fromEntries(
            targets
              .filter(
                (target) =>
                  target.preset === first?.preset &&
                  target.surface === first?.surface,
              )
              .map((target) => [target.field, target.message]),
          ),
        );
      }
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const upload = async (file: File) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setErrors({});
    try {
      const filename = await uploadAsset(file, "panel", t);
      if (!alive.current) {
        void deleteAsset(filename);
        return;
      }
      provisional.current.add(filename);
      update(changeField(selected, surface, "overlay-panel-image", filename));
    } catch (cause) {
      if (alive.current)
        setErrors({
          "overlay-panel-image":
            cause instanceof Error ? cause.message : String(cause),
        });
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const confirm = () => {
    const trimmed = name.trim();
    if (prompt !== "delete" && !trimmed) {
      setPromptError(t("obs.presetNameRequired"));
      document.getElementById("overlay-preset-prompt-name")?.focus();
      return;
    }
    let next = presets;
    if (prompt === "rename")
      next = presets.map((item) =>
        item.id === selected.id ? { ...item, name: trimmed } : item,
      );
    if (prompt === "delete" && presets.length > 1) {
      next = presets.filter((item) => item.id !== selected.id);
      setSelection(next[0].id);
      setRaw((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([key]) => !key.startsWith(selected.id + ":"),
          ),
        ),
      );
    }
    if (
      (prompt === "create" || prompt === "duplicate") &&
      presets.length < 32
    ) {
      const created =
        prompt === "duplicate"
          ? {
              ...structuredClone(selected),
              id: "preset-" + crypto.randomUUID(),
              name: trimmed,
            }
          : normalizePreset({
              id: "preset-" + crypto.randomUUID(),
              name: trimmed,
              theme: selected.theme,
            });
      next = [...presets, created];
      setSelection(created.id);
    }
    setDraft((current) => ({
      baseline: current?.baseline ?? persisted,
      presets: next,
    }));
    setPrompt("");
  };
  const followURL = new URL(paths[surface], location.origin);
  if (surface === "leaderboard") followURL.searchParams.set("period", period);
  const pinnedURL = new URL(followURL);
  pinnedURL.searchParams.set("preset", selected.id);
  const action = (id: string) => {
    if (id === "publish" || id === "activate") {
      void save(id === "activate");
      return;
    }
    if (id === "collapse") {
      setCollapsed(!collapsed);
      writeStudioSurfaceRailCollapsedPreference(
        preferenceStorage(),
        !collapsed,
      );
      return;
    }
    if (id === "studio-mode-essentials" || id === "studio-mode-all") {
      const next = id.endsWith("-all") ? "all" : "essentials";
      setMode(next);
      writeStudioModePreference(preferenceStorage(), next);
      return;
    }
    if (id.startsWith("studio-surface-")) {
      const next = id.slice(15) as Surface;
      setSurface(next);
      writePreference("commRelay.overlayPreview.surface", next);
      return;
    }
    if (id === "setup") {
      setSetup(true);
      return;
    }
    const modes: Record<string, Prompt> = {
      "overlay-preset-add": "create",
      "overlay-preset-rename": "rename",
      "overlay-preset-duplicate": "duplicate",
      "overlay-preset-delete": "delete",
    };
    if (modes[id]) {
      setPrompt(modes[id]);
      setName(
        modes[id] === "create"
          ? ""
          : modes[id] === "duplicate"
            ? selected.name + " " + t("obs.presetCopy")
            : selected.name,
      );
      setPromptError("");
    } else
      void copyText(
        pinnedURL.href,
        document.getElementById("preset-island-url") as HTMLInputElement,
      ).then((ok) => setStatus(t(ok ? "obs.copyCopied" : "obs.copyManual")));
  };
  const promptTitle =
    prompt === "create"
      ? "Add"
      : prompt === "rename"
        ? "Rename"
        : prompt === "duplicate"
          ? "Duplicate"
          : "Delete";
  return (
    <>
      <StudioFrame
        setupCompleted={
          readStudioSetupState(preferenceStorage()) === "completed"
        }
        mode={mode}
        collapsed={collapsed}
        surface={surface}
        busy={busy}
        dirty={dirty}
        canActivate={selected.id !== active}
        action={action}
        surfaceKey={(event) => {
          const index = surfaces.indexOf(surface),
            offset = ["ArrowRight", "ArrowDown"].includes(event.key)
              ? 1
              : ["ArrowLeft", "ArrowUp"].includes(event.key)
                ? -1
                : 0;
          if (offset) {
            event.preventDefault();
            const next =
              surfaces[(index + offset + surfaces.length) % surfaces.length];
            action("studio-surface-" + next);
            document.getElementById("studio-surface-" + next)?.focus();
          }
        }}
        preview={
          <Preview
            preset={selected}
            surface={surface}
            follow={followURL.href}
            pinned={pinnedURL.href}
            period={period}
          />
        }
        inspector={
          <>
            <Presets
              presets={presets}
              selected={selected.id}
              busy={busy}
              choose={setSelection}
              url={pinnedURL.href}
              status={t(
                dirty ? "obs.presetUrlDirtyShort" : "obs.presetUrlSavedShort",
              )}
              action={action}
            />
            {error && (
              <p className="notice notice--error" role="alert">
                {error}
              </p>
            )}
            {status && <p role="status">{status}</p>}
            <Inspector
              values={values}
              errors={errors}
              busy={busy}
              surface={surface}
              change={change}
              reset={(group) => {
                update(resetGroup(selected, surface, group));
                const affected = resetFields(group);
                setRaw((current) => ({
                  ...current,
                  [rawKey]: Object.fromEntries(
                    Object.entries(current[rawKey] ?? {}).filter(
                      ([id]) => !affected.includes(id),
                    ),
                  ),
                }));
                setErrors((current) =>
                  Object.fromEntries(
                    Object.entries(current).filter(
                      ([id]) => !affected.includes(id),
                    ),
                  ),
                );
              }}
              upload={(file) => void upload(file)}
              themes={Object.entries(themes).map(([theme, key], index) => (
                <button
                  key={theme}
                  type="button"
                  className="theme-card"
                  data-theme={theme}
                  role="radio"
                  aria-checked={selected.theme === theme}
                  tabIndex={selected.theme === theme ? 0 : -1}
                  disabled={busy}
                  onClick={() => change("overlay-theme", theme)}
                  onKeyDown={(event) => {
                    const offset = ["ArrowRight", "ArrowDown"].includes(
                      event.key,
                    )
                      ? 1
                      : ["ArrowLeft", "ArrowUp"].includes(event.key)
                        ? -1
                        : 0;
                    if (offset) {
                      event.preventDefault();
                      const next =
                        Object.keys(themes)[(index + offset + 5) % 5];
                      change("overlay-theme", next);
                      document
                        .querySelector<HTMLButtonElement>(
                          `.theme-card[data-theme="${next}"]`,
                        )
                        ?.focus();
                    }
                  }}
                >
                  <span className="theme-card__thumb" aria-hidden="true" />
                  <em className="theme-card__label">{t(key)}</em>
                </button>
              ))}
            />

          </>
        }
      />
      <Dialog
        id="overlay-preset-prompt"
        className="prompt-dialog"
        open={!!prompt}
        onClose={() => setPrompt("")}
        title={t("obs.preset" + promptTitle + "Title")}
        actions={
          <>
            <Button
              id="overlay-preset-prompt-cancel"
              onClick={() => setPrompt("")}
            >
              {t("dialog.cancel")}
            </Button>
            <Button variant="primary"
              id="overlay-preset-prompt-confirm"
              onClick={confirm}
            >
              {t(
                prompt === "create"
                  ? "obs.presetCreate"
                  : prompt === "delete"
                    ? "obs.presetDelete"
                    : "obs.preset" + promptTitle + "Action",
              )}
            </Button>
          </>
        }
      >
        {prompt === "delete" ? (
          <p>{t("obs.presetDeleteConfirm", { name: selected.name })}</p>
        ) : (
          <Field>
            <label htmlFor="overlay-preset-prompt-name">
              {t("obs.presetName")}
            </label>
            <input
              id="overlay-preset-prompt-name"
              value={name}
              maxLength={64}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirm();
                }
              }}
              autoFocus
            />
            {promptError && <p role="alert">{promptError}</p>}
          </Field>
        )}
      </Dialog>
      <Dialog
        id="studio-discard-dialog"
        className="prompt-dialog"
        open={blocker.state === "blocked"}
        onClose={() => {
          if (blocker.state === "blocked") blocker.reset();
        }}
        title={t("studio.discardTitle")}
        actions={
          <>
            <Button
              id="studio-discard-cancel"
              onClick={() => {
                if (blocker.state === "blocked") blocker.reset();
              }}
            >
              {t("dialog.keepEditing")}
            </Button>
            <Button variant="danger"
              id="studio-discard-confirm"
              disabled={busy}
              onClick={() => {
                discard();
                if (blocker.state === "blocked") blocker.proceed();
              }}
            >
              {t("studio.discardChanges")}
            </Button>
          </>
        }
      >
        <p>{t("studio.discardMessage")}</p>
      </Dialog>
      {setup && (
        <OBSSetup
          preset={selected}
          period={period}
          setPeriod={setPeriod}
          onFinish={(outcome) => {
            writePreference("commRelay.studio.obsSetupState", outcome);
            setSetup(false);
          }}
        />
      )}
    </>
  );
}
