import { memo, useState, type CSSProperties } from "react";
import { createChatRender, safeImageURL } from "../../../../shared/chat-render";
import {
  commandOutcomeChromeKind,
  commandOutcomeReasonLabel,
  cooldownSecondsRemaining,
} from "../../../../shared/command-outcome-ui";
import { useLocale } from "../../app/locale";
import { previewURL, type ChatMessage, type Fragment } from "./message-model";

const identity = createChatRender();
export interface PreviewSettings {
  enabled: boolean;
  allowed_hosts: string[];
  max_width_px?: number;
  max_height_px?: number;
}
function FragmentImage({
  fragment,
  previews,
}: {
  fragment: Fragment;
  previews: PreviewSettings;
}) {
  const [failedURL, setFailedURL] = useState("");
  const text = fragment.text || "";
  const url =
    fragment.type === "emote"
      ? safeImageURL(fragment.url)
      : previews.enabled
        ? previewURL(fragment.url, previews.allowed_hosts)
        : "";
  if (!url || failedURL === url) return <>{text}</>;
  const image = fragment.type === "image_link";
  return (
    <img
      className={image ? "message-list__image-preview" : "message-list__emote"}
      src={url}
      alt={image ? "chat image" : text}
      title={text}
      decoding="async"
      loading={image ? "lazy" : undefined}
      draggable={false}
      referrerPolicy="no-referrer"
      style={
        image
          ? {
              maxWidth:
                (previews.max_width_px ?? 0) >= 32
                  ? previews.max_width_px
                  : undefined,
              maxHeight:
                (previews.max_height_px ?? 0) >= 32
                  ? previews.max_height_px
                  : undefined,
            }
          : undefined
      }
      onError={() => setFailedURL(url)}
    />
  );
}
export const MessageContent = memo(function MessageContent({
  message,
  previews,
}: {
  message: ChatMessage;
  previews: PreviewSettings;
}) {
  const fragments = message.fragments?.filter(
    (fragment) => fragment && typeof fragment === "object",
  );
  return (
    <p className="message-list__text">
      {fragments?.length
        ? fragments.map((fragment, index) =>
            fragment.type === "emote" || fragment.type === "image_link" ? (
              <FragmentImage
                key={index}
                fragment={fragment}
                previews={previews}
              />
            ) : (
              <span key={index}>{fragment.text || ""}</span>
            ),
          )
        : message.message}
    </p>
  );
});
export function Avatar({ message }: { message: ChatMessage }) {
  const [failed, setFailed] = useState("");
  const url = safeImageURL(message.avatar_url);
  const fallback = identity.avatarFallbackURL(message);
  return (
    <img
      className="message-list__avatar"
      src={url && failed !== url ? url : fallback}
      alt=""
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setFailed(url)}
    />
  );
}
export function messageStyle(message: ChatMessage): CSSProperties {
  return { "--message-accent": identity.userAccent(message) } as CSSProperties;
}
export const displayName = (message: ChatMessage): string =>
  identity.messageDisplayName(message);
export function outcomeLabel(
  message: ChatMessage,
  now: number,
  t: ReturnType<typeof useLocale>["t"],
) {
  const kind = commandOutcomeChromeKind(message.command_outcome, now);
  if (!kind) return "";
  if (kind === "accepted") return t("msg.commandAccepted");
  return kind === "rejected"
    ? t("msg.commandRejectedFrozen") +
        ". " +
        commandOutcomeReasonLabel(message.command_outcome, (key) => t(key))
    : t("msg.commandCooldownFrozen") +
        ". " +
        t("msg.commandCooldownRemaining", {
          seconds: cooldownSecondsRemaining(
            message.command_outcome?.cooldown_expires_at_ms,
            now,
          ),
        });
}
export function OutcomeBadge({
  message,
  now,
}: {
  message: ChatMessage;
  now: number;
}) {
  const { t } = useLocale();
  const kind = commandOutcomeChromeKind(message.command_outcome, now);
  if (!kind) return null;
  const paths =
    kind === "accepted"
      ? ["M5 13.2 9.2 18 19 7"]
      : [
          "M12 3v18",
          "M5.6 6.5 18.4 17.5",
          "M18.4 6.5 5.6 17.5",
          "m9 5 3-2 3 2",
          "M9 19l3 2 3-2",
          "M4 9.5l-1.5 2.5L4 14.5",
          "M20 9.5l1.5 2.5L20 14.5",
        ];
  const label = outcomeLabel(message, now, t);
  return (
    <span
      role="status"
      className={`message-list__command-outcome message-list__command-outcome--${kind === "accepted" ? "accepted" : "frozen"}`}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
      {kind !== "accepted" && (
        <span className="message-list__command-outcome-label">
          {kind === "rejected"
            ? commandOutcomeReasonLabel(message.command_outcome, (key) =>
                t(key),
              )
            : t("msg.commandCooldownShort", {
                seconds: cooldownSecondsRemaining(
                  message.command_outcome?.cooldown_expires_at_ms,
                  now,
                ),
              })}
        </span>
      )}
    </span>
  );
}
export { commandOutcomeChromeKind };
