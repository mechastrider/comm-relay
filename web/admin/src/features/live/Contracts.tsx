import { useEffect, useRef, useState } from "react";
import { useNavigation } from "../../app/navigation";
import { useLocale } from "../../app/locale";
import { useWire } from "../../app/runtime";
import { Modal } from "../../components/Dialog";
import { ApiError, post } from "../../services/api";
import { useResource } from "../../services/resource";
import { validateViewerContractDraft } from "./contract-model";
import type { Award } from "./MessageActions";
interface Contract {
  id: string;
  title: string;
  objective: string;
  reward_name: string;
  reward_points: number;
  announced_at: string;
}
interface Viewer {
  id: string;
  display_name: string;
  platforms?: string[];
}
export function Contracts() {
  const { t, locale } = useLocale();
  const current = useResource<{ contract: Contract | null }>(
    "/api/viewer-contracts/current",
  );
  const catalog = useResource<{ awards: Award[] }>("/api/awards");
  const { contractDraft: draft, setContractDraft: setDraft } = useNavigation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false),
    alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [dialog, setDialog] = useState<"winner" | "award" | "close" | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Viewer | null>(null);
  const viewers = useResource<{ viewers: Viewer[] }>(
    dialog === "winner"
      ? "/api/viewers?q=" + encodeURIComponent(query.trim())
      : null,
  );
  const titleRef = useRef<HTMLInputElement>(null),
    objectiveRef = useRef<HTMLTextAreaElement>(null),
    rewardRef = useRef<HTMLSelectElement>(null);
  const contract = current.data?.contract;
  const awards = catalog.data?.awards ?? [];
  const reload = () => {
    void current.refresh();
    void catalog.refresh();
  };
  useWire((frame) => {
    if (frame.type === "reconnected") reload();
  });
  const close = () => {
    if (!inFlight.current) setDialog(null);
  };
  const act = async (action: "open" | "announce" | "award" | "close") => {
    if (inFlight.current) return;
    const normalized = validateViewerContractDraft(draft);
    if (action === "open") {
      const next: Record<string, string> = {};
      if (!normalized.titleValid) next.title = t("contracts.invalidTitle");
      if (!normalized.objectiveValid)
        next.objective = t("contracts.invalidObjective");
      if (!normalized.rewardValid) next.reward = t("contracts.invalidReward");
      setErrors(next);
      if (Object.keys(next).length) {
        (next.title
          ? titleRef
          : next.objective
            ? objectiveRef
            : rewardRef
        ).current?.focus();
        return;
      }
    } else if (!contract || (action === "award" && !selected)) return;
    const body =
      action === "open"
        ? {
            title: normalized.title,
            objective: normalized.objective,
            reward_id: normalized.rewardID,
          }
        : action === "award"
          ? { id: contract!.id, viewer_id: selected!.id }
          : { id: contract!.id };
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = await post<{ contract?: Contract }>(
        "/api/viewer-contracts/" + action,
        body,
      );
      if (!alive.current) return;
      if (action === "open") {
        current.receive({ contract: payload.contract ?? null });
        setDraft({ title: "", objective: "", rewardID: "" });
      }
      if (action === "award" || action === "close") {
        current.receive({ contract: null });
        setDialog(null);
        requestAnimationFrame(() => titleRef.current?.focus());
      }
      setStatus(
        t(
          "contracts." +
            {
              open: "opened",
              announce: "announcedAgain",
              award: "awarded",
              close: "closed",
            }[action],
        ),
      );
    } catch (cause) {
      if (!alive.current) return;
      if (cause instanceof ApiError && cause.status === 409) {
        setDialog(null);
        setStatus(t("contracts.conflict"));
        await current.refresh();
      } else if (
        cause instanceof ApiError &&
        cause.status === 404 &&
        action === "award"
      ) {
        setSelected(null);
        setDialog("winner");
        setStatus(t("contracts.viewerMissing"));
      } else
        setError(
          cause instanceof Error ? cause.message : t("contracts.requestFailed"),
        );
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const failure = error || current.error?.message || catalog.error?.message;
  const fetching = current.loading || catalog.loading;
  return (
    <div
      id="live-contracts-region"
      className="live-region live-contracts-region"
      aria-busy={busy || fetching}
    >
      <p id="live-contracts-status" className="field-hint" aria-live="polite">
        {status || (fetching ? t("state.loading") : "")}
      </p>
      {failure && (
        <div id="live-contracts-error" className="notice notice--error">
          <p className="notice__body">{failure}</p>
          <button
            id="live-contracts-retry"
            className="btn-physical btn-small"
            onClick={reload}
          >
            {t("state.retry")}
          </button>
        </div>
      )}
      {!contract && (
        <form
          id="live-contracts-draft"
          className="live-contracts-draft"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void act("open");
          }}
        >
          <div className="form__field">
            <label htmlFor="live-contract-title">{t("contracts.title")}</label>
            <input
              ref={titleRef}
              id="live-contract-title"
              type="text"
              maxLength={320}
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
              aria-invalid={!!errors.title}
              aria-describedby="live-contract-title-hint live-contract-title-error"
            />
            <p id="live-contract-title-hint" className="field-hint">
              {t("contracts.titleHint")}
            </p>
            <p
              id="live-contract-title-error"
              className="field-error"
              role="alert"
              hidden={!errors.title}
            >
              {errors.title}
            </p>
          </div>
          <div className="form__field">
            <label htmlFor="live-contract-objective">
              {t("contracts.objective")}
            </label>
            <textarea
              ref={objectiveRef}
              id="live-contract-objective"
              rows={4}
              maxLength={1120}
              value={draft.objective}
              onChange={(event) =>
                setDraft({ ...draft, objective: event.target.value })
              }
              aria-invalid={!!errors.objective}
              aria-describedby="live-contract-objective-hint live-contract-objective-error"
            />
            <p id="live-contract-objective-hint" className="field-hint">
              {t("contracts.objectiveHint")}
            </p>
            <p
              id="live-contract-objective-error"
              className="field-error"
              role="alert"
              hidden={!errors.objective}
            >
              {errors.objective}
            </p>
          </div>
          <div className="form__field">
            <label htmlFor="live-contract-reward">
              {t("contracts.reward")}
            </label>
            <select
              ref={rewardRef}
              id="live-contract-reward"
              value={draft.rewardID}
              onChange={(event) =>
                setDraft({ ...draft, rewardID: event.target.value })
              }
              aria-invalid={!!errors.reward}
              aria-describedby="live-contract-reward-error"
            >
              <option value="">{t("contracts.selectReward")}</option>
              {awards.map((award) => (
                <option key={award.id} value={award.id}>
                  {award.name} · +{award.points} XP
                </option>
              ))}
            </select>
            <p
              id="live-contract-reward-error"
              className="field-error"
              role="alert"
              hidden={!errors.reward}
            >
              {errors.reward}
            </p>
          </div>
          {!awards.length && (
            <p id="live-contracts-empty-catalog" className="notice__body">
              {t("contracts.emptyCatalog")}
            </p>
          )}
          <div className="live-contracts-actions">
            <button
              id="live-contract-open"
              className="btn-physical"
              type="submit"
              disabled={busy || fetching || !awards.length}
            >
              {t("contracts.announce")}
            </button>
          </div>
        </form>
      )}
      {contract && (
        <article
          id="live-contracts-active"
          className="live-contract-card"
          aria-labelledby="live-contract-active-title"
        >
          <p className="live-contract-card__status">{t("contracts.active")}</p>
          <h3 id="live-contract-active-title">{contract.title}</h3>
          <p
            id="live-contract-active-objective"
            className="live-contract-card__objective"
          >
            {contract.objective}
          </p>
          <p
            id="live-contract-active-reward"
            className="live-contract-card__reward"
          >
            {contract.reward_name} · +{contract.reward_points} XP
          </p>
          <p id="live-contract-active-time" className="field-hint">
            {Number.isNaN(Date.parse(contract.announced_at))
              ? ""
              : t("contracts.announcedAt", {
                  time: new Date(contract.announced_at).toLocaleString(locale),
                })}
          </p>
          <div className="live-contracts-actions">
            <button
              id="live-contract-award"
              className="btn-physical"
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setQuery("");
                setDialog("winner");
              }}
            >
              {t("contracts.awardWinner")}
            </button>
            <button
              id="live-contract-repeat"
              className="btn-physical btn-small"
              disabled={busy}
              onClick={() => void act("announce")}
            >
              {t("contracts.announceAgain")}
            </button>
            <button
              id="live-contract-close"
              className="btn-danger btn-small"
              disabled={busy}
              onClick={() => setDialog("close")}
            >
              {t("contracts.close")}
            </button>
          </div>
        </article>
      )}
      <Modal
        id="live-contract-winner-dialog"
        open={dialog === "winner"}
        onClose={close}
        className="viewer-contract-dialog"
        labelledBy="live-contract-winner-heading"
      >
        <header className="viewer-contract-dialog__header">
          <h2 id="live-contract-winner-heading">{t("contracts.pickWinner")}</h2>
        </header>
        <div className="viewer-contract-dialog__body">
          <label htmlFor="live-contract-viewer-search">
            {t("contracts.searchViewer")}
          </label>
          <input
            id="live-contract-viewer-search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <p
            id="live-contract-viewer-status"
            className="field-hint"
            aria-live="polite"
          >
            {viewers.loading
              ? t("state.loading")
              : viewers.error
                ? t("contracts.viewerLoadFailed")
                : !viewers.data?.viewers.length
                  ? t("contracts.noViewers")
                  : ""}
          </p>
          <ul
            id="live-contract-viewer-results"
            className="viewer-contract-viewers"
            aria-label={t("contracts.viewerResults")}
          >
            {viewers.data?.viewers.slice(0, 50).map((viewer) => (
              <li key={viewer.id}>
                <button
                  type="button"
                  className="viewer-contract-viewer"
                  aria-pressed={selected?.id === viewer.id}
                  onClick={() => setSelected(viewer)}
                >
                  {viewer.display_name || viewer.id}
                  <span className="viewer-contract-viewer__meta">
                    {viewer.platforms?.join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <footer className="viewer-contract-dialog__footer">
          <button
            id="live-contract-winner-cancel"
            className="btn-physical btn-small"
            onClick={close}
          >
            {t("dialog.cancel")}
          </button>
          <button
            id="live-contract-winner-next"
            className="btn-physical"
            disabled={!selected}
            onClick={() => setDialog("award")}
          >
            {t("contracts.continue")}
          </button>
        </footer>
      </Modal>
      {(["award", "close"] as const).map((kind) => (
        <Modal
          key={kind}
          id={`live-contract-${kind}-dialog`}
          open={dialog === kind}
          onClose={close}
          className="viewer-contract-dialog"
          labelledBy={`live-contract-${kind}-heading`}
        >
          <header className="viewer-contract-dialog__header">
            <h2 id={`live-contract-${kind}-heading`}>
              {t(
                kind === "award"
                  ? "contracts.confirmAward"
                  : "contracts.confirmClose",
              )}
            </h2>
          </header>
          <div className="viewer-contract-dialog__body">
            <p
              id={`live-contract-${kind}-confirmation`}
              className="viewer-contract-confirmation"
            >
              {kind === "award" && contract && selected
                ? t("contracts.awardConfirmation", {
                    viewer: selected.display_name || selected.id,
                    title: contract.title,
                    reward: contract.reward_name,
                    points: contract.reward_points,
                  })
                : t("contracts.closeConfirmation")}
            </p>
            {error && <p role="alert">{error}</p>}
          </div>
          <footer className="viewer-contract-dialog__footer">
            <button
              id={`live-contract-${kind}-cancel`}
              className="btn-physical btn-small"
              disabled={busy}
              onClick={close}
            >
              {t("dialog.cancel")}
            </button>
            <button
              id={`live-contract-${kind}-confirm`}
              className={kind === "award" ? "btn-physical" : "btn-danger"}
              disabled={busy}
              onClick={() => void act(kind)}
            >
              {t(
                kind === "award" ? "contracts.awardWinner" : "contracts.close",
              )}
            </button>
          </footer>
        </Modal>
      ))}
    </div>
  );
}
