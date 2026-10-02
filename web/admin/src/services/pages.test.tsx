import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { usePages } from "./pages";
afterEach(() => vi.unstubAllGlobals());
function deferred() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
it("ignores a superseded viewer response even when transport ignores cancellation", async () => {
  const a = deferred(),
    b = deferred();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise),
  );
  const { result, rerender } = renderHook(
    ({ path }) => usePages<{ id: string }>(path),
    { initialProps: { path: "/api/reward-history?viewer_id=a" } },
  );
  rerender({ path: "/api/reward-history?viewer_id=b" });
  await act(async () => {
    b.resolve(Response.json({ entries: [{ id: "b" }] }));
    await b.promise;
  });
  await act(async () => {
    a.resolve(Response.json({ entries: [{ id: "a" }] }));
    await a.promise;
  });
  expect(result.current.entries).toEqual([{ id: "b" }]);
});
it("preserves existing rows on page failure and retries the failed cursor exactly once", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ entries: [1], next_cursor: "page2" }),
    )
    .mockResolvedValueOnce(Response.json({ error: "offline" }, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ entries: [2] }));
  vi.stubGlobal("fetch", fetch);
  const { result } = renderHook(() =>
    usePages<number>("/api/reward-history?limit=1"),
  );
  await waitFor(() => expect(result.current.loaded).toBe(true));
  await act(() => result.current.more());
  expect(result.current.entries).toEqual([1]);
  expect(result.current.error).not.toBeNull();
  await act(() => result.current.retry());
  expect(result.current.entries).toEqual([1, 2]);
  expect(fetch.mock.calls.map((args) => args[0])).toEqual([
    "/api/reward-history?limit=1",
    "/api/reward-history?limit=1&cursor=page2",
    "/api/reward-history?limit=1&cursor=page2",
  ]);
});
it("retries failed refresh from page one while keeping the last successful rows", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ entries: [1], next_cursor: "page2" }),
    )
    .mockResolvedValueOnce(Response.json({ error: "offline" }, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ entries: [3] }));
  vi.stubGlobal("fetch", fetch);
  const { result } = renderHook(() =>
    usePages<number>("/api/sessions", "entries"),
  );
  await waitFor(() => expect(result.current.loaded).toBe(true));
  await act(() => result.current.refresh());
  expect(result.current.entries).toEqual([1]);
  await act(() => result.current.retry());
  expect(result.current.entries).toEqual([3]);
  expect(fetch.mock.calls[2][0]).toBe("/api/sessions");
});
