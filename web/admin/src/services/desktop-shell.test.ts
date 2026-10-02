import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, test, vi } from "vitest";

function shell() {
  const nativeSave = vi.fn().mockResolvedValue("");
  let receive: (event: object) => void = () => undefined;
  const frame = { contentWindow: {}, src: "", hidden: true };
  const win = {
    go: { main: { DesktopAPI: { SavePNGFile: nativeSave } } },
    addEventListener: (_: string, callback: typeof receive) => {
      receive = callback;
    },
    openAdmin: (_: string) => {},
  };
  runInNewContext(
    readFileSync("cmd/comm-relay-desktop/frontend/bridge.js", "utf8"),
    {
      window: win,
      document: {
        getElementById: (id: string) =>
          id === "admin" ? frame : { hidden: false },
      },
      URL,
    },
  );
  win.openAdmin("http://127.0.0.1:17877/");
  return { nativeSave, receive, frame };
}
test("native shell rejects foreign origins and nested preview frames", () => {
  const { nativeSave, receive, frame } = shell();
  const port = { postMessage: vi.fn(), close: vi.fn() };
  receive({
    source: frame.contentWindow,
    origin: "https://example.org",
    data: { type: "comm-relay:desktop-save" },
    ports: [port],
  });
  receive({
    source: {},
    origin: "http://127.0.0.1:17877",
    data: { type: "comm-relay:desktop-save" },
    ports: [port],
  });
  expect(port.postMessage).not.toHaveBeenCalled();
  expect(nativeSave).not.toHaveBeenCalled();
});
test("native shell forwards one PNG call and preserves cancellation", async () => {
  const { nativeSave, receive, frame } = shell();
  const port = {
    postMessage: vi.fn(),
    close: vi.fn(),
    onmessage: async (_: object) => {},
  };
  receive({
    source: frame.contentWindow,
    origin: "http://127.0.0.1:17877",
    data: { type: "comm-relay:desktop-save" },
    ports: [port],
  });
  expect(port.postMessage).toHaveBeenCalledWith({ available: true });
  await port.onmessage({ data: { args: ["Save", "recap.png", "iVBOR"] } });
  await port.onmessage({ data: { args: ["Save", "recap.png", "duplicate"] } });
  expect(nativeSave).toHaveBeenCalledExactlyOnceWith(
    "Save",
    "recap.png",
    "iVBOR",
  );
  expect(port.postMessage).toHaveBeenLastCalledWith({ path: "" });
  expect(port.close).toHaveBeenCalledOnce();
});
test("native shell cannot be navigated to an arbitrary host", () => {
  const { frame } = shell();
  expect(frame.src).toBe("http://127.0.0.1:17877/");
});
