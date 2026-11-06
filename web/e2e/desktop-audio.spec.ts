import { readFile } from "node:fs/promises";
import type { WebSocketRoute } from "@playwright/test";
import { test, expect } from "./fixtures";

test("desktop-audio starts before a click and keeps browser audio out of the playback path", { tag: ["@browser"] }, async ({ page, runtime, browserName }) => {
  if (browserName === "chromium") await page.context().grantPermissions(["local-network-access"], { origin: "http://wails.localhost" });
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket("**/ws", (route) => { socket = route; });
  await page.route("**/api/config", async (route) => {
    const response = await route.fetch();
    const config = await response.json();
    config.admin.message_sound = { enabled: true, sound: "ping", volume: 0.25 };
    await route.fulfill({ response, json: config });
  });
  await page.route("http://wails.localhost/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const files: Record<string, string> = {
      "/": "cmd/comm-relay-desktop/frontend/index.html",
      "/bridge.js": "cmd/comm-relay-desktop/frontend/bridge.js",
      "/message-audio.js": "cmd/comm-relay-desktop/frontend/message-audio.js",
      "/shared/message-audio.js": "web/shared/message-audio.js",
    };
    if (!files[path]) return route.abort();
    await route.fulfill({ body: await readFile(files[path]), contentType: path === "/" ? "text/html" : "text/javascript" });
  });
  // Test the real shell/frame protocol. Native WebKit activation itself is
  // covered separately by the GTK harness, not simulated by a Playwright click.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", { value: "Windows desktop audio test" });
    const state = { ready: false, preparations: 0, sounds: [] as { sound: string; volume: number }[], contexts: 0 };
    Object.assign(window, { audioTest: state });
    const onmessage = Object.getOwnPropertyDescriptor(MessagePort.prototype, "onmessage")!;
    Object.defineProperty(MessagePort.prototype, "onmessage", {
      ...onmessage,
      set(handler) {
        onmessage.set!.call(this, handler ? function (this: MessagePort, event: MessageEvent) {
          handler.call(this, event);
          if (event.data?.available === true) state.ready = true;
        } : null);
      },
    });
    const Context = window.AudioContext;
    window.AudioContext = class extends Context {
      constructor(options?: AudioContextOptions) { super(options); state.contexts++; }
    };
    if (location.origin !== "http://wails.localhost") return;
    Object.assign(window, { go: { main: { DesktopAPI: {
      PrepareMessageAudio: async () => {
        state.preparations++;
        // Calls the actual host preparation function. Chromium's test launcher
        // allows audio; no claim about a real native runtime is made here.
        (window as unknown as { prepareMessageAudio: () => void }).prepareMessageAudio();
      },
      PlayMessageSound: async (sound: string, volume: number) => { state.sounds.push({ sound, volume }); },
    } } } });
  });
  await page.goto("http://wails.localhost/");
  await page.evaluate((url) => (window as unknown as { openAdmin: (url: string) => void }).openAdmin(url), runtime.url);
  const admin = page.frameLocator("#admin");
  await expect(admin.locator("#recent-messages")).toBeAttached();
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioTest: { preparations: number } }).audioTest.preparations)).toBeGreaterThan(0);
  const frame = page.frames().find((frame) => frame.url().startsWith(runtime.url))!;
  await expect.poll(() => frame.evaluate(() => (window as unknown as { audioTest: { ready: boolean } }).audioTest.ready)).toBe(true);
  socket!.send(JSON.stringify({ type: "message", platform: "twitch", id: "desktop-first", user: "Viewer", message: "First without clicks", timestamp: "2026-01-01T12:00:00Z" }));
  await expect(admin.locator("#recent-messages")).toContainText("First without clicks");
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioTest: { sounds: object[] } }).audioTest.sounds)).toEqual([{ sound: "ping", volume: 0.25 }]);
  expect(await frame.evaluate(() => (window as unknown as { audioTest: { contexts: number } }).audioTest.contexts)).toBe(0);
});
