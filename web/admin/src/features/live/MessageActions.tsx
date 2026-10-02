import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  rewardPickerPlacement,
  awardGrantRequest,
} from "../../../../shared/reward-picker";
import { useLocale } from "../../app/locale";
import { ApiError, post } from "../../services/api";
import { useResource } from "../../services/resource";
import { useMessages } from "./MessagesProvider";
import { messageKey, type ChatMessage } from "./message-model";
import { displayName } from "./RichMessage";

export interface Award {
  id: string;
  name: string;
  points: number;
}
export function MessageActions({
  message,
  awards,
  report,
}: {
  message: ChatMessage;
  awards: Award[];
  report: (text: string, error?: boolean) => void;
}) {
  const { t } = useLocale();
  const { remove, granted } = useMessages();
  const [pending, setPending] = useState("");
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const canReward = Boolean(
    message.user_id?.trim() && message.platform?.trim(),
  );
  const like = awards.find((award) => award.id === "like");
  const has = (id: string) => message.granted_award_ids?.includes(id) ?? false;
  const close = () => {
    if (!busy.current) {
      setOpen(false);
      trigger.current?.focus();
    }
  };
  const grant = async (award: Award) => {
    if (busy.current || has(award.id)) return;
    busy.current = true;
    setPending(award.id);
    try {
      await post("/api/awards/grant", awardGrantRequest(message, award));
      granted(messageKey(message), award.id);
      report(
        t("reward.grantSucceeded", {
          award: award.name || award.id,
          points: award.points || 0,
        }),
      );
      setOpen(false);
      trigger.current?.focus();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        granted(messageKey(message), award.id);
        report(t("reward.alreadyGranted"));
        setOpen(false);
        trigger.current?.focus();
      } else report(t("reward.grantFailed"), true);
    } finally {
      busy.current = false;
      setPending("");
    }
  };
  const deleteMessage = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending("delete");
    try {
      await post("/api/messages/delete", {
        platform: message.platform,
        id: message.id,
      });
      remove(message.platform, message.id);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404)
        remove(message.platform, message.id);
      else report(t("msg.couldNotDelete"), true);
    } finally {
      busy.current = false;
      setPending("");
    }
  };
  return (
    <div className="message-list__actions">
      {canReward && like && (
        <button
          type="button"
          className={`message-list__like message-list__icon-button has-tooltip${has("like") ? " is-used" : ""}`}
          disabled={!!pending || has("like")}
          aria-label={like.name || "like"}
          onClick={() => void grant(like)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10v11H3V10h4Zm0 0 5-8c2 0 3 2 2 5l-1 3h6c2 0 3 2 2 4l-2 7H7" />
          </svg>
          <span className="ui-tooltip">{like.name || "like"}</span>
        </button>
      )}
      {canReward && (
        <button
          ref={trigger}
          type="button"
          className="message-list__reward has-tooltip"
          aria-label={t("reward.actionAria", { user: displayName(message) })}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={!!pending}
          onClick={() => setOpen(true)}
        >
          {t("reward.action")}
          <span className="ui-tooltip">{t("reward.action")}</span>
        </button>
      )}
      {message.id && (
        <button
          type="button"
          className="message-list__delete"
          disabled={!!pending}
          aria-label={t("msg.deleteAria", { user: displayName(message) })}
          onClick={() => void deleteMessage()}
        >
          {t("msg.delete")}
        </button>
      )}
      {open && trigger.current && (
        <RewardMenu
          trigger={trigger.current}
          message={message}
          onClose={close}
          onGrant={(award) => void grant(award)}
          pending={pending}
        />
      )}
    </div>
  );
}
function RewardMenu({
  trigger,
  message,
  onClose,
  onGrant,
  pending,
}: {
  trigger: HTMLButtonElement;
  message: ChatMessage;
  onClose: () => void;
  onGrant: (award: Award) => void;
  pending: string;
}) {
  const { t } = useLocale();
  const { data, error, loading, refresh } = useResource<{ awards: Award[] }>(
    "/api/awards",
  );
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    visibility: "hidden",
  });
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useLayoutEffect(() => {
    const place = () => {
      const menu = ref.current;
      if (!menu) return;
      const anchor = trigger.getBoundingClientRect();
      const panel = trigger
        .closest(".message-panel")
        ?.getBoundingClientRect() ?? { left: 0, right: innerWidth };
      const { left, width } = rewardPickerPlacement(
        anchor,
        panel,
        menu.getBoundingClientRect().width,
      );
      const height = Math.min(menu.scrollHeight, innerHeight - 16);
      const below = anchor.bottom + 4;
      setStyle({
        position: "fixed",
        left,
        width,
        maxHeight: innerHeight - 16,
        top: Math.max(
          8,
          below + height > innerHeight - 8 ? anchor.top - height - 4 : below,
        ),
        overflowY: "auto",
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [trigger, data, error]);
  useEffect(() => {
    const menu = ref.current;
    const first = menu?.querySelector<HTMLButtonElement>(
      "button:not(:disabled)",
    );
    (first ?? menu)?.focus();
  }, [data, error]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !ref.current?.contains(event.target) &&
        !trigger.contains(event.target)
      )
        close.current();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
    };
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [trigger]);
  const awards = data?.awards.filter((award) => award.id !== "like") ?? [];
  return createPortal(
    <div
      ref={ref}
      className="reward-picker"
      role="menu"
      tabIndex={-1}
      style={style}
      onKeyDown={(event) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const choices = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        );
        if (!choices.length) return;
        const index = choices.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        choices[
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? choices.length - 1
              : (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  choices.length) %
                choices.length
        ]?.focus();
      }}
    >
      {loading && !data && (
        <p className="reward-picker__status">{t("reward.loading")}</p>
      )}
      {error && (
        <p role="alert" className="reward-picker__error">
          {t("reward.grantFailed")}{" "}
          <button onClick={() => void refresh()}>{t("state.retry")}</button>
        </p>
      )}
      {data && awards.length === 0 && (
        <p className="reward-picker__empty">{t("reward.emptyCatalog")}</p>
      )}
      <div className="reward-picker__list" role="none">
        {awards.map((award) => {
          const used = message.granted_award_ids?.includes(award.id);
          return (
            <button
              key={award.id}
              role="menuitem"
              type="button"
              className={`reward-picker__item${used ? " is-granted" : ""}`}
              data-award-id={award.id}
              disabled={!!pending || used}
              aria-disabled={!!pending || used}
              onClick={() => onGrant(award)}
            >
              {award.name || award.id} (+{award.points || 0})
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
