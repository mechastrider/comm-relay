import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useLiveEvents } from "./useLiveEvents";
const row = (id: string) => ({ id, kind: "command", viewer_name: "Viewer", recipient_name: "", label: "gg", points: 0, created_at: "2026-10-15T12:00:00.000Z" });
const page = (ids: string[], session = "one", next_cursor?: string) => ({ session_id: session, entries: ids.map(row), next_cursor });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("freezes history while paused, counts new rows and resumes the latest snapshot", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(page(["one"]))).mockResolvedValueOnce(Response.json(page(["two", "one"])));
  vi.stubGlobal("fetch", fetch);
  const { result } = renderHook(() => useLiveEvents("all", 0));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.pause());
  await act(async () => { result.current.retry(); });
  expect(result.current.page.entries.map((e) => e.id)).toEqual(["one"]);
  expect(result.current.newCount).toBe(1);
  act(() => result.current.resume());
  expect(result.current.page.entries.map((e) => e.id)).toEqual(["two", "one"]);
  expect(result.current.paused).toBe(false);
});

it("resets frozen history on a new stream and retains rows after request failure", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(page(["old"])))
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(Response.json(page([], "two")));
  vi.stubGlobal("fetch", fetch);
  const { result } = renderHook(() => useLiveEvents("all", 0));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.pause());
  await act(async () => { result.current.retry(); });
  expect(result.current.error).toBe(true);
  expect(result.current.page.entries[0].id).toBe("old");
  await act(async () => { result.current.retry(); });
  expect(result.current.error).toBe(false);
  expect(result.current.page.entries).toEqual([]);
  expect(result.current.page.session_id).toBe("two");
  expect(result.current.paused).toBe(false);
});

it("appends older pages once and ignores responses after filter cancellation", async () => {
  let resolve!: (value: Response) => void;
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(page(["one"], "one", "older")))
    .mockResolvedValueOnce(Response.json(page(["one", "old"])))
    .mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; }))
    .mockResolvedValueOnce(Response.json(page(["filtered"])));
  vi.stubGlobal("fetch", fetch);
  const { result, rerender } = renderHook(({ category }: { category: "all" | "commands" }) => useLiveEvents(category, 0), { initialProps: { category: "all" } });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { result.current.older(); });
  expect(fetch.mock.calls[1][0]).toContain("cursor=older");
  expect(result.current.page.entries.map((e) => e.id)).toEqual(["one", "old"]);
  act(() => result.current.retry());
  rerender({ category: "commands" });
  await waitFor(() => expect(result.current.page.entries[0].id).toBe("filtered"));
  await act(async () => { resolve(Response.json(page(["stale"]))); });
  expect(result.current.page.entries[0].id).toBe("filtered");
});

it("stops polling after unmount and aborts its request", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockResolvedValue(Response.json(page([])));
  vi.stubGlobal("fetch", fetch);
  const { unmount } = renderHook(() => useLiveEvents("all", 0));
  await act(async () => {});
  await act(async () => { await vi.advanceTimersByTimeAsync(2001); });
  expect(fetch).toHaveBeenCalledTimes(2);
  const signal = fetch.mock.calls[1][1].signal as AbortSignal;
  unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
  expect(fetch).toHaveBeenCalledTimes(2);
});
