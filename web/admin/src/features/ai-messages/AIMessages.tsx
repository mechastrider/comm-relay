import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRuntime } from "../../app/runtime";
import { useLocale } from "../../app/locale";
import { useReportSaveStatus } from "../../app/save-status";
import { ApiError, request, post } from "../../services/api";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { AIFields, type ImageCommand } from "./AIFields";
import type { AIPage, AISettings, AIJob } from "./types";

export function AIMessages({
  onDirtyChange,
}: {
  onDirtyChange: (value: boolean) => void;
}) {
  const runtime = useRuntime();
  const { t } = useLocale();
  const [draft, setDraft] = useState<AISettings | null>(null);
  const [enabledDraft, setEnabledDraft] = useState<boolean | null>(null);
  const [tab, setTab] = useState("settings");
  const [page, setPage] = useState<AIPage | null>(null);
  const [older, setOlder] = useState<AIJob[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [reviews, setReviews] = useState<AIJob[]>([]);
  const [commands, setCommands] = useState<ImageCommand[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [test, setTest] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const value = draft ?? runtime.config?.ai_messages;
  const enabled =
    enabledDraft ?? runtime.config?.features?.experimental_ai_messages ?? false;
  const dirty = draft !== null || enabledDraft !== null;
  useReportSaveStatus(dirty, busy);
  useEffect(() => {
    onDirtyChange(dirty || busy);
    return () => onDirtyChange(false);
  }, [dirty, busy, onDirtyChange]);
  useLayoutEffect(() => {
    if (Object.keys(fields).length)
      document
        .querySelector<HTMLElement>('.ai-form [aria-invalid="true"]')
        ?.focus();
  }, [fields]);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const [next, pending] = await Promise.all([
      request<AIPage>("/api/ai-messages?limit=100", { signal }),
      request<AIPage>("/api/ai-messages?limit=100&state=review_pending", {
        signal,
      }),
    ]);
    setPage(next);
    setReviews(pending.items);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    const poll = async () => {
      if (loading || document.visibilityState === "hidden") return;
      loading = true;
      try {
        await refresh(controller.signal);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        loading = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 2000);
    void request<{ commands: ImageCommand[] }>("/api/commands", {
      signal: controller.signal,
    })
      .then((result) => setCommands(result.commands))
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await action();
    } catch (cause) {
      if (cause instanceof ApiError) setFields(cause.fields);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function save() {
    if (!value) return;
    void run(async () => {
      await runtime.updateConfig((latest) => ({
        ...latest,
        features: { ...latest.features, experimental_ai_messages: enabled },
        ai_messages: {
          ...value,
          denylist: value.denylist.map((x) => x.trim()).filter(Boolean),
        },
      }));
      setDraft(null);
      setEnabledDraft(null);
      setFields({});
      setFeedback(t("ai.saved"));
      await refresh();
    });
  }
  function act(job: AIJob, action: string) {
    void run(async () => {
      await post("/api/ai-messages/" + action, {
        job_id: job.id,
        expected_revision: job.revision,
      });
      await refresh();
      setSelected(null);
    });
  }
  const review = reviews;
  const allJobs = [
    ...new Map(
      [...older, ...(page?.items ?? []), ...review].map((job) => [job.id, job]),
    ).values(),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const jobs = tab === "review" ? review : allJobs;
  const current = allJobs.find((job) => job.id === selected);
  const nextCursor = cursor ?? page?.next_cursor;
  if (!value)
    return <p role="status">{runtime.configError || t("state.loading")}</p>;
  return (
    <div className="ai-workspace">
      <div className="ai-actions" role="tablist" aria-label={t("ai.title")}>
        {["settings", "review", "recent"].map((name) => (
          <Button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
          >
            {t("ai." + name)}
            {name === "review" ? ` (${review.length})` : ""}
          </Button>
        ))}
      </div>
      <p role="status">
        {t("ai.service")}: {t("ai.state." + (page?.service_state ?? "loading"))}
      </p>
      {error && <p role="alert">{error}</p>}
      {feedback && <p role="status">{feedback}</p>}
      <div className="ai-actions">
        <Button
          type="button"
          disabled={busy || !runtime.config?.features?.experimental_ai_messages}
          onClick={() =>
            void run(async () => {
              await runtime.updateConfig((latest) => ({
                ...latest,
                features: {
                  ...latest.features,
                  experimental_ai_messages: false,
                },
              }));
              setEnabledDraft(null);
              await refresh();
            })
          }
        >
          {t("ai.disable")}
        </Button>
        {page?.service_state !== "ready" &&
          page?.service_state !== "disabled" && (
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await post("/api/ai-messages/resume", {});
                  await refresh();
                })
              }
            >
              {t("ai.resume")}
            </Button>
          )}
      </div>
      {tab === "settings" ? (
        <form
          className="ai-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <p>{t("ai.notice")}</p>
          <label className="form__checkbox">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabledDraft(e.target.checked)}
            />
            {t("ai.enable")}
          </label>
          <fieldset disabled={busy} className="ai-fields">
            <AIFields
              value={value}
              change={(next) => {
                setDraft(next);
                setFields({});
              }}
              commands={commands}
              errors={fields}
              credentials={page?.credentials}
            />
          </fieldset>
          <div className="ai-actions ai-save">
            <Button type="submit" variant="primary" disabled={busy || !dirty}>
              {t("ai.save")}
            </Button>
            <Button
              type="button"
              disabled={busy || !dirty}
              onClick={() => {
                setDraft(null);
                setEnabledDraft(null);
                setFields({});
              }}
            >
              {t("ai.reset")}
            </Button>
            {(["llm", "tts"] as const).map((profile) => (
              <Button
                key={profile}
                type="button"
                disabled={busy || dirty}
                onClick={() => setTest(profile)}
              >
                {t("ai.test")} {profile.toUpperCase()}
              </Button>
            ))}
          </div>
        </form>
      ) : (
        <>
          <p>{t("ai.dispatchedHint")}</p>
          {!page ? (
            <p role="status">{t("state.loading")}</p>
          ) : jobs.length === 0 ? (
            <p>{t("ai.empty")}</p>
          ) : (
            <ul className="ai-jobs">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Button type="button" onClick={() => setSelected(job.id)}>
                    {job.name} · {t("ai.state." + job.state)}
                  </Button>
                  <p>{job.prepared?.display_text ?? job.original_text}</p>
                  <small>
                    {new Date(job.created_at).toLocaleString()}{" "}
                    {job.error_code ? `· ${job.error_code}` : ""}
                  </small>
                </li>
              ))}
            </ul>
          )}
          {tab === "recent" && nextCursor && (
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const next = await request<AIPage>(
                    "/api/ai-messages?limit=100&before_id=" +
                      encodeURIComponent(nextCursor),
                  );
                  setOlder((previous) => [...previous, ...next.items]);
                  setCursor(next.next_cursor ?? "");
                })
              }
            >
              {t("ai.more")}
            </Button>
          )}
          {tab === "recent" && (
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await post("/api/ai-messages/clear-history", {});
                  setOlder([]);
                  setCursor(null);
                  await refresh();
                })
              }
            >
              {t("ai.clear")}
            </Button>
          )}
        </>
      )}
      <Dialog
        id="ai-paid-test"
        open={test !== null}
        onClose={() => setTest(null)}
        title={t("ai.test")}
        actions={
          <>
            <Button type="button" onClick={() => setTest(null)}>
              {t("ai.close")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await post<Record<string, unknown>>(
                    "/api/ai-messages/test",
                    { profile: test },
                  );
                  setTest(null);
                  setFeedback(
                    t("ai.testSuccess") +
                      " " +
                      String(result.elapsed_ms) +
                      " ms",
                  );
                })
              }
            >
              {t("ai.testConfirm")}
            </Button>
          </>
        }
      >
        <p>{t("ai.testHint")}</p>
        {error && <p role="alert">{error}</p>}
      </Dialog>
      <Dialog
        id="ai-review"
        open={!!current}
        onClose={() => setSelected(null)}
        title={t("ai.review")}
        actions={
          current && (
            <>
              {current.state === "review_pending" ? (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={busy}
                    onClick={() => act(current, "approve")}
                  >
                    {t("ai.approve")}
                  </Button>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => act(current, "reject")}
                  >
                    {t("ai.reject")}
                  </Button>
                </>
              ) : (
                ![
                  "dispatched",
                  "rejected",
                  "expired",
                  "canceled",
                  "failed",
                ].includes(current.state) && (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => act(current, "cancel")}
                  >
                    {t("ai.cancel")}
                  </Button>
                )
              )}
              <Button type="button" onClick={() => setSelected(null)}>
                {t("ai.close")}
              </Button>
            </>
          )
        }
      >
        {error && <p role="alert">{error}</p>}
        {current && (
          <>
            <p>{t("ai.state." + current.state)}</p>
            <h3>{t("ai.original")}</h3>
            <p>{current.original_text}</p>
            <h3>{t("ai.display")}</h3>
            <p>{current.prepared?.display_text}</p>
            <h3>{t("ai.spoken")}</h3>
            <p>{current.prepared?.segments.map((s) => s.text).join(" ")}</p>
            <p>
              {current.prepared?.character_id} / {current.prepared?.image_id}
            </p>
            {current.presentation.image_asset && (
              <img
                className="ai-preview"
                alt={current.prepared?.image_id ?? ""}
                src={
                  "/overlay/assets/" +
                  encodeURIComponent(current.presentation.image_asset)
                }
              />
            )}
            <p>{current.reason}</p>
            {current.error_code && <p role="alert">{current.error_code}</p>}
            {current.review_expires_at && (
              <p>
                {t("ai.expires")}:{" "}
                {Math.max(
                  0,
                  Math.ceil(
                    (Date.parse(current.review_expires_at) - Date.now()) / 1000,
                  ),
                )}{" "}
                {t("ai.seconds")}
              </p>
            )}
            <p>
              {t("ai.usage")}:{" "}
              {current.usage?.length
                ? JSON.stringify(current.usage)
                : t("ai.unknown")}
            </p>
          </>
        )}
      </Dialog>
    </div>
  );
}
