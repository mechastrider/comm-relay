import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useResource } from "./resource";
afterEach(() => vi.unstubAllGlobals());
function deferred() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
it("a pushed snapshot wins over an older HTTP response, even if transport ignores abort", async () => {
  const http = deferred();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => http.promise),
  );
  const { result } = renderHook(() =>
    useResource<{ value: number }>("/api/example"),
  );
  act(() => result.current.receive({ value: 2 }));
  await act(async () => {
    http.resolve(Response.json({ value: 1 }));
    await http.promise;
  });
  expect(result.current.data).toEqual({ value: 2 });
});
it("isolates period data and restores only the matching cached snapshot on failure", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ value: 1 }))
      .mockResolvedValueOnce(
        Response.json({ error: "offline" }, { status: 503 }),
      )
      .mockResolvedValueOnce(
        Response.json({ error: "offline" }, { status: 503 }),
      ),
  );
  const { result, rerender } = renderHook(
    ({ path }) => useResource<{ value: number }>(path),
    { initialProps: { path: "/api/example?period=session" } },
  );
  await waitFor(() => expect(result.current.data?.value).toBe(1));
  rerender({ path: "/api/example?period=day" });
  expect(result.current.data).toBeNull();
  await waitFor(() => expect(result.current.error).not.toBeNull());
  expect(result.current.data).toBeNull();
  rerender({ path: "/api/example?period=session" });
  expect(result.current.data?.value).toBe(1);
  await waitFor(() => expect(result.current.error).not.toBeNull());
  expect(result.current.data?.value).toBe(1);
});
