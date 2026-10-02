import { Button } from "../../components/Button";
import { useReportSaveStatus } from "../../app/save-status";
import { useEffect, useRef, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router";
import { useRuntime } from "../../app/runtime";
import { useLocale } from "../../app/locale";
import { Dialog } from "../../components/Dialog";
import { Tabs } from "../../components/Tabs";
import { ApiError, NetworkError, post } from "../../services/api";
import { playSound, unlockAudio } from "../../services/sound";
import {
  sectionValues,
  composeSectionUpdate,
  sections,
  type Section,
} from "./values";
import {
  PlatformsFields,
  NetworkFields,
  DataFields,
  ApplicationFields,
  type FieldValues,
} from "./Fields";
import { DiagnosticsView } from "./Diagnostics";

const allSections = [...sections, "diagnostics"] as const;
const components = {
  platforms: PlatformsFields,
  network: NetworkFields,
  data: DataFields,
  application: ApplicationFields,
};
interface Draft {
  baseline: FieldValues;
  values: FieldValues;
}
export function Settings() {
  const runtime = useRuntime();
  const { config } = runtime;
  const { t } = useLocale();
  const navigate = useNavigate();
  const route = useParams().section;
  const section = allSections.find((item) => item === route) ?? "platforms";
  const [drafts, setDrafts] = useState<Partial<Record<Section, Draft>>>({});
  const [platform, setPlatform] = useState("twitch");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sectionFeedback, setSectionFeedback] = useState<{
    section: string;
    text: string;
  } | null>(null);
  const feedback =
    sectionFeedback?.section === section ? sectionFeedback.text : "";
  const setFeedback = (text: string) =>
    setSectionFeedback(text ? { section, text } : null);
  const [resetOpen, setResetOpen] = useState(false);
  const oauth = useRef<AbortController | null>(null);
  useEffect(() => () => oauth.current?.abort(), []);
  const editable = section !== "diagnostics";
  const currentDraft = editable ? drafts[section] : undefined;
  const dirty =
    !!currentDraft &&
    JSON.stringify(currentDraft.values) !==
      JSON.stringify(currentDraft.baseline);
  useReportSaveStatus(dirty, busy);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (dirty || busy) && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const reset = () => {
    if (editable)
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[section];
        return next;
      });
    setErrors({});
    setFeedback("");
  };
  const change = (id: string, value: string | boolean) => {
    if (!config || !editable || busy) return;
    setDrafts((previous) => {
      const current = previous[section] ?? {
        baseline: sectionValues(config, section),
        values: sectionValues(config, section),
      };
      return {
        ...previous,
        [section]: {
          baseline: current.baseline,
          values: { ...current.values, [id]: value },
        },
      };
    });
    setFeedback("");
    setErrors((current) => {
      const next = { ...current };
      delete next[id.replaceAll("-", "_")];
      return next;
    });
  };
  const save = async () => {
    if (!config || !editable || !currentDraft || !dirty || inFlight.current)
      return;
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFeedback("");
    try {
      await runtime.updateConfig((latest) =>
        composeSectionUpdate(latest, section, currentDraft.values),
      );
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[section];
        return next;
      });
      setFeedback(t("settings.sectionSaved"));
      void runtime.refreshDiagnostics().catch(() => undefined);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setErrors(cause.fields);
        const first = Object.keys(cause.fields)[0];
        if (section === "platforms" && first) setPlatform(first.split("_")[0]);
        requestAnimationFrame(() =>
          document
            .querySelector<HTMLElement>(
              '#settings-section-form [aria-invalid="true"]',
            )
            ?.focus(),
        );
      }
      setFeedback(
        cause instanceof NetworkError
          ? t("settings.saveConnectionFailed")
          : cause instanceof Error
            ? cause.message
            : t("banner.cannotReach"),
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const values =
    config && editable
      ? (currentDraft?.values ?? sectionValues(config, section))
      : {};
  const action = async (name: string) => {
    if (name === "sound") {
      try {
        await unlockAudio();
        playSound(
          String(values["message-sound-type"]),
          Number(values["message-sound-volume"]) / 100,
        );
      } catch {
        setFeedback(t("banner.soundUnavailable"));
      }
    } else if (name === "oauth" && !oauth.current) {
      const controller = new AbortController();
      oauth.current = controller;
      try {
        const result = await post<{
          opened: boolean;
          authorization_url?: string;
        }>("/api/youtube/oauth/start", {}, controller.signal);
        setFeedback(
          result.opened
            ? t("banner.youtubeSignIn")
            : result.authorization_url
              ? t("banner.youtubeOpenLink", {
                  url: result.authorization_url,
                })
              : t("banner.youtubeBrowserFailed"),
        );
        if (result.opened || result.authorization_url) {
          const deadline = Date.now() + 300_000;
          while (!controller.signal.aborted && Date.now() < deadline) {
            const response = await fetch("/api/status", {
              signal: controller.signal,
            });
            if (!response.ok) throw new Error(t("banner.cannotReach"));
            const status = (await response.json()) as {
              youtube?: { oauth_connected?: boolean };
            };
            if (status.youtube?.oauth_connected) {
              setFeedback(t("banner.youtubeConnected"));
              await runtime.refreshDiagnostics();
              return;
            }
            await new Promise<void>((resolve) => {
              const done = () => {
                clearTimeout(timer);
                controller.signal.removeEventListener("abort", done);
                resolve();
              };
              const timer = setTimeout(done, 1000);
              controller.signal.addEventListener("abort", done, {
                once: true,
              });
            });
          }
          if (!controller.signal.aborted)
            setFeedback(t("banner.youtubeTimeout"));
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setFeedback(
            cause instanceof Error ? cause.message : t("banner.cannotReach"),
          );
      } finally {
        oauth.current = null;
      }
    }
  };
  const Fields = editable ? components[section] : null;
  return (
    <section
      id="workspace-settings"
      className="workspace settings-workspace"
      data-workspace="settings"
      aria-labelledby="workspace-settings-heading"
    >
      <div className="settings-workspace__layout">
        <header className="settings-workspace__header">
          <h1
            id="workspace-settings-heading"
            className="workspace-heading"
            tabIndex={-1}
          >
            {t("workspace.settingsHeading")}
          </h1>
          <nav
            className="settings-nav"
            role="tablist"
            aria-label={t("settings.navLabel")}
          >
            {allSections.map((item) => (
              <a
                key={item}
                id={`settings-${item}-tab`}
                className={`settings-nav__link${item === section ? " settings-nav__link--active" : ""}`}
                href={`#settings/${item}`}
                role="tab"
                aria-controls={`settings-${item}-panel`}
                aria-selected={section === item}
                aria-current={section === item ? "location" : undefined}
                tabIndex={section === item ? 0 : -1}
                onClick={(event) => {
                  event.preventDefault();
                  void navigate("/settings/" + item);
                }}
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const index = allSections.indexOf(item);
                  const next =
                    allSections[
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? allSections.length - 1
                          : (index +
                              (event.key === "ArrowRight" ? 1 : -1) +
                              allSections.length) %
                            allSections.length
                    ];
                  void navigate("/settings/" + next);
                }}
              >
                {t("settings.section." + item)}
              </a>
            ))}
          </nav>
        </header>
        <div
          id="settings-sections-mount"
          className="settings-workspace__content"
        >
          <section
            id={`settings-${section}-panel`}
            className={`settings-section settings-section--active${editable ? "" : " settings-section--readonly"}`}
            role="tabpanel"
            aria-labelledby={`settings-${section}-tab`}
          >
            <header className="settings-section__header">
              <h2 className="settings-section__heading">
                {t("settings.section." + section)}
              </h2>
              {editable && (
                <div className="settings-section__toolbar">
                  <span
                    className="settings-section__dirty"
                    role="status"
                    hidden={!dirty}
                  >
                    {t("settings.sectionDirty")}
                  </span>
                  <div className="settings-section__actions">
                    <Button
                      className="btn-small"
                      type="button"
                      data-section-reset
                      disabled={!dirty || busy}
                      onClick={() => setResetOpen(true)}
                    >
                      {t("settings.resetSection")}
                    </Button>
                    <Button variant="primary"
                      className="btn-small"
                      type="submit"
                      form="settings-section-form"
                      data-section-save
                      disabled={!dirty || busy}
                      aria-busy={busy}
                    >
                      {t("settings.saveSection")}
                    </Button>
                  </div>
                </div>
              )}
            </header>
            {feedback && (
              <p role="status" className="notice">
                {feedback}
              </p>
            )}
            {section === "diagnostics" ? (
              <DiagnosticsView />
            ) : !config ? (
              <p role="status">{runtime.configError || t("state.loading")}</p>
            ) : (
              <form
                id="settings-section-form"
                className="settings-section__form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
              >
                <div
                  className={`settings-section__body${section === "application" ? " settings-application-body" : ""}`}
                >
                  {section === "platforms" && (
                    <Tabs
                      items={[
                        { id: "twitch", label: "Twitch" },
                        { id: "youtube", label: "YouTube" },
                        { id: "vk", label: "VK Live" },
                      ]}
                      selected={platform}
                      onSelect={setPlatform}
                      label={t("dialog.connectionSections")}
                      idPrefix="connections"
                      className="dialog-tabs settings-platform-tabs"
                    />
                  )}
                  {Fields && (
                    <Fields
                      values={values}
                      errors={errors}
                      onChange={change}
                      onAction={(name) => void action(name)}
                      platform={platform}
                    />
                  )}
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
      <Dialog
        id="discard-changes-dialog"
        className="prompt-dialog"
        open={resetOpen || blocker.state === "blocked"}
        title={t("dialog.discardUnsavedTitle")}
        onClose={() => {
          setResetOpen(false);
          if (blocker.state === "blocked") blocker.reset();
        }}
        actions={
          <>
            <Button
              id="discard-changes-cancel"
              onClick={() => {
                setResetOpen(false);
                if (blocker.state === "blocked") blocker.reset();
              }}
            >
              {t("dialog.keepEditing")}
            </Button>
            <Button variant="danger"
              id="discard-changes-confirm"
              disabled={busy}
              onClick={() => {
                reset();
                setResetOpen(false);
                if (blocker.state === "blocked") blocker.proceed();
              }}
            >
              {t("dialog.discardChanges")}
            </Button>
          </>
        }
      >
        <p>{t("settings.discardConfirm")}</p>
      </Dialog>
    </section>
  );
}
