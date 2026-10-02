import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRuntime, useWire } from "../../app/runtime";
import { request } from "../../services/api";
import { playSound, unlockAudio, closeAudio } from "../../services/sound";
import {
  messageKey,
  normalizeMessage,
  wireMessage,
  commandOutcomeFromWire,
  type ChatMessage,
  type Outcome,
} from "./message-model";

type Operation = (messages: ChatMessage[]) => ChatMessage[];
interface MessageState {
  messages: ChatMessage[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  remove: (platform: string, id: string) => void;
  granted: (key: string, award: string) => void;
}
const Context = createContext<MessageState | null>(null);
export function MessagesProvider({ children }: { children: ReactNode }) {
  const { config } = useRuntime();
  const settings = useRef(config?.admin.message_sound);
  useEffect(() => {
    settings.current = config?.admin.message_sound;
  }, [config]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const known = useRef(new Set<string>());
  const outcomes = useRef(new Map<string, Outcome>());
  const current = useRef<AbortController | null>(null);
  const pending = useRef<Operation[]>([]);
  const ready = useRef(false);
  const mutate = useCallback((operation: Operation) => {
    if (current.current) pending.current.push(operation);
    setMessages(operation);
  }, []);
  const remove = useCallback(
    (platform: string, id: string) => {
      known.current.delete(platform + "\0" + id);
      mutate((messages) =>
        messages.filter(
          (message) => message.platform !== platform || message.id !== id,
        ),
      );
    },
    [mutate],
  );
  const granted = useCallback(
    (key: string, award: string) => {
      mutate((messages) =>
        messages.map((message) =>
          messageKey(message) === key
            ? {
                ...message,
                granted_award_ids: [
                  ...new Set([...(message.granted_award_ids || []), award]),
                ],
              }
            : message,
        ),
      );
    },
    [mutate],
  );
  const refresh = useCallback(async () => {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    pending.current = [];
    setLoading(true);
    setError("");
    try {
      const payload = await request<{ messages: ChatMessage[] }>(
        "/api/messages/recent?limit=20",
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      let next: ChatMessage[] = (payload.messages || [])
        .map(normalizeMessage)
        .map((message) => ({
          ...message,
          command_outcome:
            outcomes.current.get(messageKey(message)) ??
            message.command_outcome,
        }));
      const newMessages = next.some(
        (message) => !known.current.has(messageKey(message)),
      );
      for (const operation of pending.current) next = operation(next);
      next = next.slice(-20);
      next.forEach((message) => known.current.add(messageKey(message)));
      setMessages(next);
      const sound = settings.current;
      if (ready.current && newMessages && sound?.enabled)
        playSound(sound.sound, sound.volume);
      ready.current = true;
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (!controller.signal.aborted) {
        current.current = null;
        pending.current = [];
        setLoading(false);
      }
    }
  }, []);
  useEffect(() => {
    void refresh();
    const unlock = () => {
      void unlockAudio().catch(() => undefined);
    };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      current.current?.abort();
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      closeAudio();
    };
  }, [refresh]);
  useWire((frame) => {
    if (frame.type === "reconnected") {
      void refresh();
      return;
    }
    if (
      frame.type === "message_deleted" &&
      typeof frame.platform === "string" &&
      typeof frame.id === "string"
    ) {
      remove(frame.platform, frame.id);
      return;
    }
    const outcome = commandOutcomeFromWire(frame);
    if (outcome) {
      const key = outcome.platform + "\0" + outcome.id;
      outcomes.current.set(key, outcome.outcome);
      if (outcomes.current.size > 100)
        outcomes.current.delete(outcomes.current.keys().next().value!);
      mutate((messages) =>
        messages.map((message) =>
          messageKey(message) === key
            ? { ...message, command_outcome: outcome.outcome }
            : message,
        ),
      );
      return;
    }
    if (frame.type !== "message") return;
    const message = wireMessage(frame),
      key = messageKey(message);
    if (known.current.has(key)) return;
    known.current.add(key);
    if (known.current.size > 1000)
      known.current.delete(known.current.keys().next().value!);
    message.command_outcome =
      outcomes.current.get(key) ?? message.command_outcome;
    mutate((messages) =>
      [...messages.filter((item) => messageKey(item) !== key), message].slice(
        -20,
      ),
    );
    const sound = settings.current;
    if (ready.current && sound?.enabled) playSound(sound.sound, sound.volume);
  });
  return (
    <Context.Provider
      value={{ messages, loading, error, refresh, remove, granted }}
    >
      {children}
    </Context.Provider>
  );
}
export function useMessages() {
  const context = useContext(Context);
  if (!context) throw new Error("MessagesProvider is missing");
  return context;
}
