import { test, expect } from "./fixtures";
import type { WebSocketRoute } from "@playwright/test";

test("command audio monitoring survives navigation and saved disable", { tag: ["@core", "@browser"] }, async ({ page, runtime }) => {
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket("**/ws", (route) => { socket = route; });
  // A real, silent PCM clip exercises browser media playback without making noise.
  const wav = Buffer.alloc(44 + 16000);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(16000, 40);
  await page.route("**/overlay/assets/monitor.wav", (route) => route.fulfill({ body: wav, contentType: "audio/wav" }));
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    Object.assign(window, { commandAudioContexts: contexts });
    const Context = window.AudioContext;
    window.AudioContext = class extends Context {
      constructor(options?: AudioContextOptions) {
        super(options);
        contexts.push(this);
      }
    };
    const events: { kind: string; volume: number }[] = [];
    Object.assign(window, { commandAudioEvents: events });
    Object.assign(window, { commandAudioPlayCalls: 0 });
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as unknown as { commandAudioPlayCalls: number }).commandAudioPlayCalls++;
      this.addEventListener("playing", () => events.push({ kind: "playing", volume: this.volume }), { once: true });
      return play.call(this);
    };
  });
  await page.reload();
  await expect.poll(() => !!socket).toBeTruthy();
  await expect(page.locator("#live-contracts-tab")).toHaveText("Viewer rewards");
  await page.goto(runtime.url + "/#/settings/application");
  const setting = page.getByLabel("Play command and greeting sounds in the app", { exact: true });
  await expect(setting).toBeChecked();
  await page.locator("#message-sound-panel-heading").click();
  // A completed click does not mean AudioContext.resume() has completed.
  // Wait for real browser readiness before delivering the first live command.
  await expect.poll(() => page.evaluate(() => {
    const contexts = (window as unknown as { commandAudioContexts: AudioContext[] }).commandAudioContexts;
    return contexts.length > 0 && contexts.every((context) => context.state === "running");
  })).toBe(true);
  const send = () => socket!.send(JSON.stringify({
    type: "alert", source: "command", name: "Viewer", text: "Voice clip",
    points: 0, duration_ms: 1000, sound_file: "monitor.wav", sound_volume: 25,
  }));
  const played = () => page.evaluate(() => (window as unknown as { commandAudioEvents: object[] }).commandAudioEvents);
  send();
  // The system audio backend can quantize volume (WebKit/PulseAudio reports
  // 0.2499983 for 0.25). Preserve the 25% check without requiring bit equality.
  await expect.poll(played).toEqual([{ kind: "playing", volume: expect.closeTo(0.25, 4) }]);
  await page.goto(runtime.url + "/#/audience");
  send();
  await expect.poll(async () => (await played()).length).toBe(2);
  await page.goto(runtime.url + "/#/settings/application");
  await setting.uncheck();
  const saved = page.waitForResponse((response) => response.url().endsWith("/api/config/update"));
  await page.locator("[data-section-save]").click();
  expect((await (await saved).json()).admin.command_sound_enabled).toBe(false);
  await expect(page.locator(".settings-section > .notice")).toHaveText("Section saved.");
  send();
  // Same-socket ordering is a delivery barrier for the preceding alert. Count
  // attempts too: a rejected or pending play() would never emit "playing".
  socket!.send(JSON.stringify({
    type: "message", platform: "twitch", id: "audio-disabled-barrier",
    user: "Viewer", message: "Audio disable delivery barrier",
    timestamp: "2026-01-01T12:00:00Z",
  }));
  await page.goto(runtime.url + "/#/live");
  await expect(page.locator("#recent-messages")).toContainText("Audio disable delivery barrier");
  expect(await page.evaluate(() =>
    (window as unknown as { commandAudioPlayCalls: number }).commandAudioPlayCalls,
  )).toBe(2);
  expect((await played()).length).toBe(2);
  await page.goto(runtime.url + "/#/settings/application");
  await page.reload();
  await expect(setting).not.toBeChecked();
});

test("leaderboard ranking stays top aligned across themes and rectangles", { tag: ["@browser"] }, async ({ page, runtime }) => {
  test.setTimeout(90000);
  const themes = ["default", "dashboard", "cockpit_panel", "cockpit_popups", "g_rebels_popups"];
  for (const theme of themes) {
    for (const layout of ["panel", "chips"]) {
      await page.goto(`${runtime.url}/overlay/leaderboard?preview=sample&theme=${theme}&layout=${layout}&limit=3`);
      for (const size of [{ width: 800, height: 450 }, { width: 450, height: 450 }, { width: 320, height: 800 }, { width: 800, height: 120 }]) {
        await page.setViewportSize(size);
        await expect(page.locator(".leaderboard-row").first()).toBeVisible();
        await expect.poll(() => page.locator("#leaderboard").evaluate((element) => {
          const style = getComputedStyle(element);
          const child = Array.from(element.children).find((item) => !item.hasAttribute("hidden"));
          if (!child) return false;
          const bounds = element.getBoundingClientRect();
          const expectedTop = bounds.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
          return style.justifyContent === "flex-start" && Math.abs(child.getBoundingClientRect().top - expectedTop) < 2;
        })).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
      }
    }
  }
});
