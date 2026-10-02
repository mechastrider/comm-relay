import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { request, post } from "../services/api";
import type { PublicConfig, Diagnostics } from "../services/types";
import {
  connectLive,
  type ConnectionState,
  type WireEvent,
} from "../services/live";
import { useLocale } from "./locale";

interface Runtime {
  config: PublicConfig | null;
  diagnostics: Diagnostics | null;
  diagnosticsStale: boolean;
  connection: ConnectionState;
  configError: string;
  refreshConfig: () => Promise<PublicConfig>;
  refreshDiagnostics: () => Promise<void>;
  updateConfig: (
    compose: (latest: PublicConfig) => unknown,
  ) => Promise<PublicConfig>;
  applyConfig: (next: PublicConfig) => void;
  subscribe: (handler: (event: WireEvent) => void) => () => void;
}
const RuntimeContext = createContext<Runtime | null>(null);

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const { setLocale } = useLocale();
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [diagnosticsStale, setDiagnosticsStale] = useState(false);
  const diagnosticsRequest = useRef<AbortController | null>(null);
  const [configError, setConfigError] = useState("");
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const handlers = useRef(new Set<(event: WireEvent) => void>());
  const generation = useRef(0);
  const pendingSave = useRef<Promise<unknown>>(Promise.resolve());
  const invalidateConfig = useCallback(() => {
    generation.current++;
  }, []);
  const applyConfig = useCallback(
    (next: PublicConfig) => {
      generation.current++;
      setConfig(next);
      setConfigError("");
      setLocale(next.admin.time_locale === "en-GB" ? "en-GB" : "ru-RU");
    },
    [setLocale],
  );
  const refreshConfig = useCallback(async () => {
    const id = ++generation.current;
    try {
      const next = await request<PublicConfig>("/api/config");
      if (generation.current === id) applyConfig(next);
      return next;
    } catch (cause) {
      if (generation.current === id)
        setConfigError(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    }
  }, [applyConfig]);
  const refreshDiagnostics = useCallback(async () => {
    diagnosticsRequest.current?.abort();
    const controller = new AbortController();
    diagnosticsRequest.current = controller;
    try {
      const value = await request<Diagnostics>("/api/diagnostics", {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setDiagnostics(value);
        setDiagnosticsStale(false);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setDiagnosticsStale(true);
        throw cause;
      }
    }
  }, []);
  const updateConfig = useCallback(
    (compose: (latest: PublicConfig) => unknown) => {
      const save = pendingSave.current
        .catch(() => undefined)
        .then(async () => {
          const latest = await request<PublicConfig>("/api/config");
          const next = await post<PublicConfig>(
            "/api/config/update",
            compose(latest),
          );
          applyConfig(next);
          return next;
        });
      pendingSave.current = save;
      return save;
    },
    [applyConfig],
  );
  const subscribe = useCallback((handler: (event: WireEvent) => void) => {
    handlers.current.add(handler);
    return () => {
      handlers.current.delete(handler);
    };
  }, []);
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const configId = ++generation.current;
    void request<PublicConfig>("/api/config", { signal: controller.signal })
      .then((next) => {
        if (!disposed && configId === generation.current) applyConfig(next);
      })
      .catch((cause) => {
        if (!disposed) setConfigError(String(cause));
      });
    const poll = () => {
      void refreshDiagnostics().catch(() => undefined);
    };
    poll();
    const timer = setInterval(poll, 5_000);
    const stop = connectLive({
      onState: setConnection,
      onEvent: (frame) => {
        for (const handler of handlers.current) handler(frame);
      },
      onReconnect: () => {
        poll();
        void refreshConfig().catch(() => undefined);
        for (const handler of handlers.current)
          handler({ type: "reconnected" });
      },
    });
    return () => {
      disposed = true;
      invalidateConfig();
      diagnosticsRequest.current?.abort();
      controller.abort();
      clearInterval(timer);
      stop();
    };
  }, [applyConfig, refreshConfig, invalidateConfig, refreshDiagnostics]);
  return (
    <RuntimeContext.Provider
      value={{
        config,
        diagnostics,
        diagnosticsStale,
        connection,
        configError,
        applyConfig,
        refreshConfig,
        refreshDiagnostics,
        updateConfig,
        subscribe,
      }}
    >
      {children}
    </RuntimeContext.Provider>
  );
}
export function useRuntime() {
  const context = useContext(RuntimeContext);
  if (!context) throw new Error("RuntimeProvider is missing");
  return context;
}
export function useWire(handler: (event: WireEvent) => void) {
  const { subscribe } = useRuntime();
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  }, [handler]);
  useEffect(() => subscribe((event) => latest.current(event)), [subscribe]);
}
