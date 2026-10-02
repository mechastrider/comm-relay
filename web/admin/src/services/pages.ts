import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "./api";
interface PageState<T> {
  key: string;
  entries: T[];
  next: string | null;
  loaded: boolean;
  loading: boolean;
  error: Error | null;
  failedCursor: string | null;
}
export function usePages<T>(path: string, field = "entries") {
  const empty = useCallback(
    (): PageState<T> => ({
      key: path,
      entries: [],
      next: null,
      loaded: false,
      loading: false,
      error: null,
      failedCursor: null,
    }),
    [path],
  );
  const [snapshot, setSnapshot] = useState<PageState<T>>(empty);
  const active = useRef<AbortController | null>(null);
  const load = useCallback(
    async (cursor: string | null) => {
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      setSnapshot((previous) => ({
        ...(previous.key === path ? previous : empty()),
        loading: true,
        error: null,
      }));
      try {
        const payload = await request<Record<string, unknown>>(
          path +
            (cursor
              ? (path.includes("?") ? "&" : "?") +
                "cursor=" +
                encodeURIComponent(cursor)
              : ""),
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const entries = Array.isArray(payload[field])
          ? (payload[field] as T[])
          : [];
        setSnapshot((previous) => ({
          key: path,
          entries:
            cursor && previous.key === path
              ? [...previous.entries, ...entries]
              : entries,
          next:
            typeof payload.next_cursor === "string" && payload.next_cursor
              ? payload.next_cursor
              : null,
          loaded: true,
          loading: false,
          error: null,
          failedCursor: null,
        }));
      } catch (cause) {
        if (!controller.signal.aborted)
          setSnapshot((previous) => ({
            ...(previous.key === path ? previous : empty()),
            loading: false,
            error: cause instanceof Error ? cause : new Error(String(cause)),
            failedCursor: cursor,
          }));
      } finally {
        if (!controller.signal.aborted) active.current = null;
      }
    },
    [empty, field, path],
  );
  useEffect(() => {
    void load(null);
    return () => active.current?.abort();
  }, [load]);
  const state = snapshot.key === path ? snapshot : empty();
  return {
    ...state,
    refresh: () => load(null),
    more: () =>
      !state.loading && state.next ? load(state.next) : Promise.resolve(),
    retry: () => load(state.failedCursor),
  };
}
