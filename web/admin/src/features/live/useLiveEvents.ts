import { useEffect, useRef, useState } from "react";
import { request } from "../../services/api";

export type EventCategory = "all" | "reactions" | "commands" | "progress";
export interface LiveEvent {
  id: string;
  kind: "command" | "award" | "like" | "buff" | "achievement" | "level";
  viewer_name: string;
  recipient_name: string;
  label: string;
  points: number;
  created_at: string;
}
interface EventPage {
  session_id: string;
  entries: LiveEvent[];
  next_cursor?: string;
}
const emptyPage: EventPage = { session_id: "", entries: [] };

// One sequential requester owns polling, history and cancellation for this tab.
export function useLiveEvents(category: EventCategory, refreshVersion: number) {
  const [page, setPage] = useState(emptyPage);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [paused, setPaused] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const actions = useRef({ pause: () => {}, resume: () => {}, older: () => {}, retry: () => {} });

  useEffect(() => {
    const controller = new AbortController();
    let current = emptyPage;
    let latest = emptyPage;
    let frozen = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout>;
    const publish = (next: EventPage) => {
      current = next;
      setPage(next);
    };
    const pause = () => { frozen = true; setPaused(true); };
    const resume = () => {
      frozen = false;
      setPaused(false);
      setNewCount(0);
      publish(latest);
    };
    const load = async (older = false) => {
      if (running || controller.signal.aborted) return;
      running = true;
      clearTimeout(timer);
      setBusy(true);
      const params = new URLSearchParams({ category, limit: "50" });
      if (older && current.next_cursor) params.set("cursor", current.next_cursor);
      try {
        const next = await request<EventPage>("/api/live-events?" + params, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setError(false);
        if (older && next.session_id === current.session_id) {
          const ids = new Set(current.entries.map((entry) => entry.id));
          publish({ ...next, entries: [...current.entries, ...next.entries.filter((entry) => !ids.has(entry.id))] });
        } else {
          latest = next;
          if (!frozen || next.session_id !== current.session_id) {
            resume();
          } else {
            const ids = new Set(current.entries.map((entry) => entry.id));
            setNewCount(next.entries.filter((entry) => !ids.has(entry.id)).length);
          }
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        running = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          setBusy(false);
          timer = setTimeout(() => { if (!document.hidden) void load(); else schedule(); }, 2000);
        }
      }
    };
    const schedule = () => {
      timer = setTimeout(() => { if (!document.hidden) void load(); else schedule(); }, 2000);
    };
    const onVisible = () => { if (!document.hidden) void load(); };
    actions.current = {
      pause,
      resume: () => { resume(); void load(); },
      older: () => { if (current.next_cursor) { pause(); void load(true); } },
      retry: () => { void load(); },
    };
    document.addEventListener("visibilitychange", onVisible);
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [category, refreshVersion]);

  return { page, loading, busy, error, paused, newCount,
    pause: () => actions.current.pause(), resume: () => actions.current.resume(),
    older: () => actions.current.older(), retry: () => actions.current.retry() };
}
