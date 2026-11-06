import { afterEach, expect, test, vi } from "vitest";
import { closeAudio, initAudio, playSound, unlockAudio } from "./sound";
import { connectDesktopMessageAudio } from "./desktop-message-audio";

const browser = vi.hoisted(() => ({ unlock: vi.fn(), play: vi.fn(), close: vi.fn() }));
vi.mock("../../../shared/message-audio.js", () => ({ createMessageAudio: () => browser }));
vi.mock("./desktop-message-audio", () => ({ connectDesktopMessageAudio: vi.fn() }));
afterEach(() => { closeAudio(); vi.clearAllMocks(); });

test("desktop startup prepares without interaction and uses one playback sink", async () => {
  const port = { postMessage: vi.fn(), close: vi.fn() };
  vi.mocked(connectDesktopMessageAudio).mockResolvedValue(port as unknown as MessagePort);
  await initAudio();
  playSound("ping", 0.4);
  expect(port.postMessage).toHaveBeenCalledWith({ type: "play", sound: "ping", volume: 0.4 });
  expect(browser.play).not.toHaveBeenCalled();
  await unlockAudio();
  expect(port.postMessage).toHaveBeenCalledWith({ type: "prepare" });
  closeAudio(); expect(port.close).toHaveBeenCalledOnce();
});

test("standalone browser retains interaction unlock and tone playback", async () => {
  vi.mocked(connectDesktopMessageAudio).mockResolvedValue(null);
  await unlockAudio(); playSound("soft", 0.2);
  expect(browser.unlock).toHaveBeenCalledOnce();
  expect(browser.play).toHaveBeenCalledWith("soft", 0.2);
});

test("late desktop handshake after unmount closes its port without replacing the next session", async () => {
  let finish!: (port: MessagePort | null) => void;
  vi.mocked(connectDesktopMessageAudio).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  const old = initAudio(); closeAudio();
  vi.mocked(connectDesktopMessageAudio).mockResolvedValue(null);
  await initAudio();
  const port = { close: vi.fn() };
  finish(port as unknown as MessagePort); await old;
  expect(port.close).toHaveBeenCalledOnce();
  playSound("ping", 1); expect(browser.play).toHaveBeenCalledWith("ping", 1);
});


test("a pending interaction cannot recreate audio after cleanup", async () => {
  let finish!: (port: MessagePort | null) => void;
  vi.mocked(connectDesktopMessageAudio).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  const unlock = unlockAudio();
  closeAudio(); finish(null); await unlock;
  expect(browser.unlock).not.toHaveBeenCalled();
});
