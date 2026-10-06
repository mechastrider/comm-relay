import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createCommandAudio } from "./command-audio";
import { scheduleAlertSound } from "../../../alert/alert-sound.js";

vi.mock("../../../alert/alert-sound.js", async (original) => ({
  ...await original<object>(), scheduleAlertSound: vi.fn(),
}));

const players: Player[] = [];
const contexts: Context[] = [];
let initialState = "running";
let playResult = () => Promise.resolve();
class Context {
  state = initialState;
  resume = vi.fn(async () => { this.state = "running"; });
  close = vi.fn(async () => { this.state = "closed"; });
  constructor() { contexts.push(this); }
}
class Player {
  volume = 1;
  play = vi.fn(() => playResult());
  pause = vi.fn();
  removeAttribute = vi.fn();
  load = vi.fn();
  constructor(public src: string) { players.push(this); }
}
const frame = (extra: Record<string, unknown> = {}) => ({
  type: "alert", source: "command", name: "Viewer", text: "Hello",
  points: 0, duration_ms: 1000, sound: "ping", sound_volume: 40, ...extra,
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  players.length = 0;
  contexts.length = 0;
  initialState = "running";
  playResult = () => Promise.resolve();
  vi.stubGlobal("Audio", Player);
  vi.stubGlobal("AudioContext", Context);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

test("plays live tones and custom clips at event volume, with custom priority", async () => {
  const audio = createCommandAudio(vi.fn());
  audio.setEnabled(true);
  audio.receive(frame());
  expect(scheduleAlertSound).toHaveBeenCalledWith(contexts[0], "ping", 40);
  audio.receive(frame({ sound_file: "voice.mp3", sound_volume: 25 }));
  expect(players).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(1000);
  expect(players[0].src).toBe("/overlay/assets/voice.mp3");
  expect(players[0].volume).toBe(0.25);
  expect(players[0].play).toHaveBeenCalledOnce();
  expect(scheduleAlertSound).toHaveBeenCalledTimes(1);
  audio.dispose();
});

test("silent and zero-volume events do not create audio, and invalid asset paths never load", () => {
  const audio = createCommandAudio(vi.fn());
  audio.setEnabled(true);
  for (const extra of [{ sound: "" }, { sound_volume: 0, sound_file: "voice.wav" }, { sound: "", sound_file: "../escape.mp3" }]) {
    audio.receive(frame(extra));
    vi.advanceTimersByTime(1000);
  }
  expect(contexts).toHaveLength(0);
  expect(players).toHaveLength(0);
  expect(scheduleAlertSound).not.toHaveBeenCalled();
  audio.dispose();
});

test("non-command slots stay silent and retain award priority before queued commands", () => {
  const audio = createCommandAudio(vi.fn());
  audio.setEnabled(true);
  audio.receive(frame());
  audio.receive(frame({ sound_file: "next.wav" }));
  audio.receive(frame({ source: "award", points: 1, award_id: "a", award_name: "Award" }));
  vi.advanceTimersByTime(1000);
  expect(players).toHaveLength(0);
  expect(scheduleAlertSound).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1000);
  expect(players).toHaveLength(1);
  audio.dispose();
});

test("disabling stops active playback, clears pending work and ignores late play success", async () => {
  let resolve!: () => void;
  playResult = () => new Promise<void>((done) => { resolve = done; });
  const status = vi.fn();
  const audio = createCommandAudio(status);
  audio.setEnabled(true);
  audio.receive(frame({ sound_file: "active.wav" }));
  audio.receive(frame({ sound_file: "queued.wav" }));
  audio.setEnabled(false);
  status.mockClear();
  resolve();
  await Promise.resolve();
  expect(status).not.toHaveBeenCalled();
  expect(players[0].pause).toHaveBeenCalled();
  expect(contexts[0].close).toHaveBeenCalled();
  vi.advanceTimersByTime(5000);
  expect(players).toHaveLength(1);
  audio.setEnabled(true);
  audio.receive(frame({ sound_file: "new.wav" }));
  audio.dispose();
  resolve();
  await Promise.resolve();
  expect(vi.getTimerCount()).toBe(0);
});

test("asset failures are reported and do not prevent the next command", async () => {
  playResult = () => Promise.reject(new Error("Missing file"));
  const status = vi.fn();
  const audio = createCommandAudio(status);
  audio.setEnabled(true);
  audio.receive(frame({ sound_file: "missing.wav" }));
  await vi.advanceTimersByTimeAsync(0);
  expect(status).toHaveBeenLastCalledWith("failed");
  expect(players[0].pause).toHaveBeenCalled();
  playResult = () => Promise.resolve();
  audio.receive(frame({ sound_file: "next.wav" }));
  await vi.advanceTimersByTimeAsync(1000);
  expect(players[1].play).toHaveBeenCalled();
  expect(status).toHaveBeenLastCalledWith("");
  audio.dispose();
});

test("progression events share queue timing without producing app audio", () => {
  const audio = createCommandAudio(vi.fn());
  audio.setEnabled(true);
  audio.receive({ type: "viewer_progression", viewer_id: "v", display_name: "Viewer", level: { title: "New level" }, duration_ms: 2000, sound: "chime" });
  audio.receive(frame());
  vi.advanceTimersByTime(1999);
  expect(scheduleAlertSound).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(scheduleAlertSound).toHaveBeenCalledOnce();
  audio.dispose();
});

test("autoplay recovery plays future events without replaying the blocked command", async () => {
  initialState = "suspended";
  const status = vi.fn();
  const audio = createCommandAudio(status);
  audio.setEnabled(true);
  audio.receive(frame({ sound_file: "blocked.wav" }));
  expect(status).toHaveBeenLastCalledWith("blocked");
  await audio.unlock();
  expect(status).toHaveBeenLastCalledWith("");
  expect(players).toHaveLength(0);
  vi.advanceTimersByTime(1000);
  audio.receive(frame({ sound_file: "future.wav" }));
  expect(players[0].src).toContain("future.wav");
  audio.dispose();
});

test("legacy command sources and greetings play but other sources and history never do", () => {
  const audio = createCommandAudio(vi.fn());
  audio.receive(frame());
  expect(contexts).toHaveLength(0);
  audio.setEnabled(true);
  audio.receive(frame({ source: "greeting", greeting_kind: "new_viewer", sound_file: "hello.mp3", sound: "" }));
  vi.advanceTimersByTime(1000);
  expect(players[0].src).toContain("hello.mp3");
  for (const source of ["contract", "progression", "unknown"]) {
    audio.receive(frame({
      source, greeting_kind: "new_viewer", sound_file: "other.mp3",
      points: source === "contract" ? 10 : 0,
      contract_id: "contract", contract_title: "Title", contract_objective: "Goal",
      award_id: "award", award_name: "Award", viewer_id: "viewer", level: { title: "Level" },
    }));
    vi.advanceTimersByTime(1000);
  }
  expect(players).toHaveLength(1);
  audio.receive({ type: "reconnected" });
  audio.receive({ type: "message", message: "!hello" });
  audio.receive(frame({ source: undefined }));
  expect(scheduleAlertSound).toHaveBeenCalledOnce();
  audio.dispose();
});

test("expired queued commands are not played and recordings do not overlap", () => {
  const audio = createCommandAudio(vi.fn());
  audio.setEnabled(true);
  audio.receive(frame({ sound_file: "first.wav", duration_ms: 11000 }));
  audio.receive(frame({ sound_file: "stale.wav" }));
  vi.advanceTimersByTime(11000);
  expect(players[0].pause).toHaveBeenCalled();
  expect(players).toHaveLength(1);
  audio.receive(frame({ sound_file: "fresh.wav" }));
  expect(players).toHaveLength(2);
  audio.dispose();
});
