import { afterEach, expect, test, vi } from "vitest";
import { ApiError, post, request, upload } from "./api";

afterEach(() => vi.unstubAllGlobals());
test("preserves structured field errors instead of losing them on failed mutations", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Invalid channel",
            fields: { twitch_channel: "Required" },
          }),
          { status: 422 },
        ),
      ),
  );
  await expect(post("/api/config/update", {})).rejects.toMatchObject({
    status: 422,
    fields: { twitch_channel: "Required" },
  });
});
test("forwards cancellation and POST-action JSON without changing its wire shape", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetcher);
  const controller = new AbortController();
  await post(
    "/api/overlay/activate",
    { preset_id: "look-2" },
    controller.signal,
  );
  const [path, init] = fetcher.mock.calls[0];
  expect(path).toBe("/api/overlay/activate");
  expect(init).toMatchObject({
    method: "POST",
    body: '{"preset_id":"look-2"}',
    signal: controller.signal,
  });
  expect(init.headers.get("Content-Type")).toBe("application/json");
});
test("lets the browser supply multipart boundaries", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetcher);
  await upload("/api/overlay/assets/upload", new FormData());
  expect(fetcher.mock.calls[0][1].headers.has("Content-Type")).toBe(false);
});
test("non-JSON failures retain their HTTP status", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })),
  );
  await expect(request("/api/config")).rejects.toBeInstanceOf(ApiError);
});
