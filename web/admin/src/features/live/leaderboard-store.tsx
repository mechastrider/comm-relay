import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRuntime } from "../../app/runtime";
import { request } from "../../services/api";
import type { LeaderboardSnapshot, Period } from "./Leaderboard";
interface Entry {
  data: LeaderboardSnapshot | null;
  error: Error | null;
  loading: boolean;
}
const empty: Entry = { data: null, error: null, loading: false };
const Context = createContext<{
  entries: Partial<Record<Period, Entry>>;
  refresh: (period: Period) => Promise<void>;
} | null>(null);
export function LeaderboardProvider({ children }: { children: ReactNode }) {
  const { subscribe } = useRuntime();
  const [entries, setEntries] = useState<Partial<Record<Period, Entry>>>({});
  const requests = useRef(new Map<Period, AbortController>());
  const refresh = useCallback(async (period: Period) => {
    requests.current.get(period)?.abort();
    const controller = new AbortController();
    requests.current.set(period, controller);
    setEntries((current) => ({
      ...current,
      [period]: { ...(current[period] ?? empty), loading: true, error: null },
    }));
    try {
      const data = await request<LeaderboardSnapshot>(
        "/api/leaderboard?period=" + period,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted)
        setEntries((current) => ({
          ...current,
          [period]: { data, loading: false, error: null },
        }));
    } catch (cause) {
      if (!controller.signal.aborted)
        setEntries((current) => ({
          ...current,
          [period]: {
            ...(current[period] ?? empty),
            loading: false,
            error: cause instanceof Error ? cause : new Error(String(cause)),
          },
        }));
    } finally {
      if (requests.current.get(period) === controller)
        requests.current.delete(period);
    }
  }, []);
  useEffect(() => {
    const active = requests.current;
    const stop = subscribe((frame) => {
      if (
        frame.type === "leaderboard" &&
        ["session", "day", "all"].includes(String(frame.period)) &&
        Array.isArray(frame.entries)
      ) {
        const period = frame.period as Period;
        active.get(period)?.abort();
        active.delete(period);
        setEntries((current) => ({
          ...current,
          [period]: {
            data: frame as unknown as LeaderboardSnapshot,
            error: null,
            loading: false,
          },
        }));
      }
      if (frame.type === "reconnected")
        for (const period of ["session", "day", "all"] as const)
          void refresh(period);
    });
    return () => {
      stop();
      for (const controller of active.values()) controller.abort();
      active.clear();
    };
  }, [subscribe, refresh]);
  return (
    <Context.Provider value={{ entries, refresh }}>{children}</Context.Provider>
  );
}
export function useLeaderboard(period: Period) {
  const context = useContext(Context);
  if (!context) throw new Error("LeaderboardProvider is missing");
  const refreshPeriod = context.refresh;
  const refresh = useCallback(
    () => refreshPeriod(period),
    [refreshPeriod, period],
  );
  return { ...(context.entries[period] ?? empty), refresh };
}
