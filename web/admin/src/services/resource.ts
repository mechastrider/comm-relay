import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "./api";

/** Requests and pushed snapshots share a cancellation boundary; each URL owns its data. */
export function useResource<T>(path: string | null) {
  const cache = useRef(new Map<string, T>());
  const [snapshot, setSnapshot] = useState<{ path: string; data: T } | null>(
    null,
  );
  const [failure, setFailure] = useState<{ path: string; error: Error } | null>(
    null,
  );
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const current = useRef<AbortController | null>(null);
  const receive = useCallback(
    (value: T) => {
      if (!path) return;
      current.current?.abort();
      cache.current.set(path, value);
      setSnapshot({ path, data: value });
      setFailure(null);
      setLoadingPath(null);
    },
    [path],
  );
  const refresh = useCallback(async () => {
    current.current?.abort();
    if (!path) return;
    const controller = new AbortController();
    current.current = controller;
    setLoadingPath(path);
    setFailure(null);
    try {
      const value = await request<T>(path, { signal: controller.signal });
      if (!controller.signal.aborted) {
        cache.current.set(path, value);
        setSnapshot({ path, data: value });
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setFailure({
          path,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        });
    } finally {
      if (!controller.signal.aborted) setLoadingPath(null);
    }
  }, [path]);
  useEffect(() => {
    void refresh();
    return () => current.current?.abort();
  }, [refresh]);
  const data = path
    ? snapshot?.path === path
      ? snapshot.data
      : (cache.current.get(path) ?? null)
    : null;
  return {
    data,
    receive,
    error: failure?.path === path ? failure.error : null,
    loading: loadingPath === path && path !== null,
    refresh,
  };
}
