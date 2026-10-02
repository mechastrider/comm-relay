import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocale } from "../../app/locale";
import { useRuntime } from "../../app/runtime";
import { useResource } from "../../services/resource";
import { useMessages } from "./MessagesProvider";
import { MessageActions, type Award } from "./MessageActions";
import {
  Avatar,
  MessageContent,
  OutcomeBadge,
  displayName,
  messageStyle,
  outcomeLabel,
  commandOutcomeChromeKind,
  type PreviewSettings,
} from "./RichMessage";
import { messageKey, type ChatMessage } from "./message-model";

function MessageRow({
  message,
  awards,
  previews,
  now,
}: {
  message: ChatMessage;
  awards: Award[];
  previews: PreviewSettings;
  now: number;
}) {
  const { t, locale } = useLocale();
  const [feedback, setFeedback] = useState({ text: "", error: false });
  const kind = commandOutcomeChromeKind(message.command_outcome, now);
  const date = new Date(message.timestamp);
  const time = Number.isNaN(date.valueOf())
    ? ""
    : new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).format(date);
  return (
    <li
      className={`message-list__item${kind ? " message-list__item--command-" + kind : ""}`}
      data-message-key={messageKey(message)}
      data-message-platform={message.platform}
      data-message-id={message.id || undefined}
      style={messageStyle(message)}
      aria-label={outcomeLabel(message, now, t) || undefined}
    >
      <Avatar message={message} />
      <div className="message-list__content">
        <div className="message-list__meta">
          <span className="message-list__user">{displayName(message)}</span>
          <span className="message-list__platform">{message.platform}</span>
          <time className="message-list__time" dateTime={message.timestamp}>
            {time}
          </time>
          <OutcomeBadge message={message} now={now} />
          <MessageActions
            message={message}
            awards={awards}
            report={(text, error = false) => setFeedback({ text, error })}
          />
        </div>
        <MessageContent message={message} previews={previews} />
        <p
          className="message-list__grant-feedback"
          hidden={!feedback.text}
          role={feedback.error ? "alert" : "status"}
          aria-live={feedback.error ? undefined : "polite"}
        >
          {feedback.text}
        </p>
      </div>
    </li>
  );
}
export function Messages() {
  const { t } = useLocale();
  const { config } = useRuntime();
  const { messages, loading, error, refresh } = useMessages();
  const { data: catalog } = useResource<{ awards: Award[] }>("/api/awards");
  const [now, setNow] = useState(Date.now);
  const panel = useRef<HTMLDivElement>(null);
  const scroll = useRef({ bottom: true, top: 0, height: 0 });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useLayoutEffect(() => {
    const node = panel.current;
    if (!node) return;
    if (scroll.current.bottom) node.scrollTop = node.scrollHeight;
    else
      node.scrollTop = Math.max(
        0,
        scroll.current.top + node.scrollHeight - scroll.current.height,
      );
    scroll.current = {
      bottom: node.scrollHeight - node.scrollTop - node.clientHeight <= 48,
      top: node.scrollTop,
      height: node.scrollHeight,
    };
  }, [messages]);
  const previews = (config?.overlay.image_previews ?? {
    enabled: false,
    allowed_hosts: [],
  }) as unknown as PreviewSettings;
  return (
    <div
      id="live-messages-region"
      className="live-region message-panel"
      ref={panel}
      aria-busy={loading}
      onScroll={(event) => {
        const node = event.currentTarget;
        scroll.current = {
          bottom: node.scrollHeight - node.scrollTop - node.clientHeight <= 48,
          top: node.scrollTop,
          height: node.scrollHeight,
        };
      }}
    >
      <ul id="recent-messages" className="message-list" aria-live="polite">
        {messages.map((message) => (
          <MessageRow
            key={messageKey(message)}
            message={message}
            awards={catalog?.awards ?? []}
            previews={previews}
            now={now}
          />
        ))}
      </ul>
      {!loading && messages.length === 0 && (
        <p id="recent-messages-empty" className="empty-state live-region-empty">
          {t("shell.noMessagesYet")}
        </p>
      )}
      {loading && (
        <p id="live-messages-loading" className="empty-state">
          {t("state.loading")}
        </p>
      )}
      {error && (
        <div
          id="live-messages-error"
          className="notice notice--error live-region-error"
        >
          <p className="notice__body">{error}</p>
          <button
            type="button"
            className="state-retry btn-physical btn-small"
            onClick={() => void refresh()}
          >
            {t("state.retry")}
          </button>
        </div>
      )}
    </div>
  );
}
