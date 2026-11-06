import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createMessageAudio } from "./message-audio.js";

function shell() {
  const listeners = new Map();
  const frame = { contentWindow: {}, hidden: true };
  const calls = [];
  const audio = { unlock: async () => {}, play: (...args) => calls.push(args), close() {} };
  const api = {
    PrepareMessageAudio: async () => { sandbox.prepareMessageAudio(); },
    PlayMessageSound: async (...args) => { sandbox.playDesktopMessageSound(...args); },
  };
  const sandbox = {
    URL, console, createMessageAudio: () => audio,
    document: { getElementById: (id) => id === "admin" ? frame : {} },
    go: { main: { DesktopAPI: api } },
    addEventListener: (type, handler) => listeners.set(type, handler),
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ["message-audio.js", "bridge.js"]) {
    const source = readFileSync(new URL("../../cmd/comm-relay-desktop/frontend/" + file, import.meta.url), "utf8")
      .replace(/^import .*;\n/gm, "").replace('import("./message-audio.js")', "Promise.resolve({ connectMessageAudio })").replace("export function connectMessageAudio", "function connectMessageAudio");
    vm.runInContext(source, sandbox);
  }
  sandbox.openAdmin("http://127.0.0.1:17877/");
  const port = () => ({ messages: [], closed: false, postMessage(message) { this.messages.push(message); }, close() { this.closed = true; } });
  const connect = (p, extra = {}) => listeners.get("message")({
    source: frame.contentWindow, origin: "http://127.0.0.1:17877",
    data: { type: "comm-relay:desktop-message-audio" }, ports: [p], ...extra,
  });
  return { calls, api, audio, port, connect, listeners };
}

test("shell prepares without click, validates tones, and supersedes old channels", async () => {
  const s = shell(), first = s.port();
  s.connect(first);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(first.messages[0].available, true);
  first.onmessage({ data: { type: "play", sound: "ping", volume: 0.25 } });
  assert.deepEqual(s.calls, [["ping", 0.25]]);
  for (const data of [
    { type: "play", sound: "evil()", volume: 1 },
    { type: "play", sound: "ping", volume: NaN },
    { type: "play", sound: "ping", volume: Infinity },
    { type: "play", sound: "ping", volume: 2 },
    { type: "play", sound: "ping", volume: 0 },
  ]) first.onmessage({ data });
  assert.equal(s.calls.length, 1);
  const second = s.port(); s.connect(second); await Promise.resolve();
  assert.equal(first.closed, true);
  first.onmessage({ data: { type: "play", sound: "ping", volume: 1 } });
  assert.equal(s.calls.length, 1);
  second.onmessage({ data: { type: "close" } });
  second.onmessage({ data: { type: "play", sound: "ping", volume: 1 } });
  assert.equal(s.calls.length, 1);
});

test("shell refuses other origins and child frames", () => {
  const s = shell();
  for (const extra of [{ origin: "http://evil.test" }, { source: {} }, { origin: "http://127.0.0.1:17878" }]) {
    const p = s.port(); s.connect(p, extra);
    assert.equal(p.onmessage, undefined);
    assert.deepEqual(p.messages, []);
  }
});

test("missing native audio binding preserves browser fallback", async () => {
  const s = shell(); delete s.api.PrepareMessageAudio;
  const p = s.port(); s.connect(p); await Promise.resolve();
  assert.equal(p.messages[0].available, false);
  assert.equal(p.closed, true);
});

test("tone engine drops pre-activation and suspended events without stale replay", async () => {
  const old = globalThis.AudioContext;
  const starts = [];
  let context;
  const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
  globalThis.AudioContext = class {
    state = "suspended"; currentTime = 0;
    constructor() { context = this; }
    async resume() { this.state = "running"; }
    async close() { this.state = "closed"; }
    createOscillator() { return { frequency: param, connect() {}, disconnect() {}, start: () => starts.push(1), stop() {} }; }
    createGain() { return { gain: param, connect() {}, disconnect() {} }; }
  };
  try {
    const audio = createMessageAudio();
    audio.play("ping", 1); assert.equal(starts.length, 0);
    await audio.unlock(); assert.equal(starts.length, 0);
    for (const preset of ["ping", "soft", "chime", "alert"]) audio.play(preset, 0.5);
    assert.equal(starts.length, 5);
    context.state = "suspended"; audio.play("ping", 1);
    await audio.unlock(); assert.equal(starts.length, 5);
    for (const volume of [0, -1, NaN, Infinity, 2]) audio.play("ping", volume);
    assert.equal(starts.length, 5);
    audio.close(); assert.equal(context.state, "closed");
  } finally { globalThis.AudioContext = old; }
});
