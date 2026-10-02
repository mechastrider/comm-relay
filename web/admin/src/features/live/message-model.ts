import {
  commandOutcomeFromRecentField,
  commandOutcomeFromWire,
} from "../../../../shared/command-outcome-ui";
import type { WireEvent } from "../../services/live";

export type Outcome = NonNullable<
  ReturnType<typeof commandOutcomeFromRecentField>
>;
export interface Fragment {
  type: string;
  text?: string;
  url?: string;
}
export interface ChatMessage {
  id: string;
  platform: string;
  user_id: string;
  username: string;
  display_name: string;
  message: string;
  timestamp: string;
  avatar_url?: string;
  fragments?: Fragment[];
  command_outcome?: Outcome | null;
  granted_award_ids?: string[];
}
export function messageKey(message: ChatMessage) {
  return [
    message.platform,
    message.id ||
      [
        message.display_name || message.username,
        message.message,
        message.timestamp,
      ].join("\0"),
  ].join("\0");
}
export function normalizeMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    command_outcome: commandOutcomeFromRecentField(message.command_outcome),
  };
}
export function wireMessage(frame: WireEvent): ChatMessage {
  const string = (key: string) =>
    typeof frame[key] === "string" ? frame[key] : "";
  return normalizeMessage({
    id: string("id"),
    platform: string("platform"),
    user_id: string("user_id"),
    username: string("user"),
    display_name: string("display_name") || string("user"),
    message: string("message"),
    avatar_url: string("avatar_url"),
    timestamp: string("timestamp") || new Date().toISOString(),
    fragments: Array.isArray(frame.fragments) ? frame.fragments : [],
    command_outcome: frame.command_outcome as Outcome | undefined,
  });
}
export { commandOutcomeFromWire };
export function previewURL(
  raw: string | undefined,
  allowedHosts: string[],
): string {
  if (!raw) return "";
  try {
    const url = new URL(raw, location.href);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      !/\.(png|jpe?g|gif|webp|avif)$/i.test(url.pathname)
    )
      return "";
    return allowedHosts.some((value) => {
      const allowed = value.trim().toLowerCase();
      return allowed && (host === allowed || host.endsWith("." + allowed));
    })
      ? url.href
      : "";
  } catch {
    return "";
  }
}
