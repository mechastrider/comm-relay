import { createAlertScheduler } from "../../../alert/alert-scheduler.js";
import { progressionAlertFromFrame } from "../../../alert/alert-frame.js";
import { safeStoredSoundAssetFilename } from "../../../alert/alert-render.js";
import { normalizeAlertSound, normalizeAlertVolume, scheduleAlertSound } from "../../../alert/alert-sound.js";
import type { WireEvent } from "./live";

export type AudioStatus = "" | "blocked" | "failed";

/** One page-local monitor; no playback is restored from message history. */
export function createCommandAudio(onStatus: (status: AudioStatus) => void) {
  const queue = createAlertScheduler();
  let enabled = false;
  let context: AudioContext | null = null;
  let media: HTMLAudioElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;

  function stopMedia() {
    if (media) {
      media.pause();
      media.removeAttribute("src");
      media.load();
      media = null;
    }
  }

  function audioContext() {
    context ??= new AudioContext();
    return context;
  }

  async function unlock() {
    if (!enabled) return;
    const current = generation;
    try {
      const ctx = audioContext();
      if (ctx.state === "suspended") await ctx.resume();
      if (enabled && current === generation && ctx.state === "running") onStatus("");
    } catch {
      if (enabled && current === generation) onStatus("blocked");
    }
  }

  function play(alert: WireEvent) {
    if (alert.source && alert.source !== "command") return;
    const filename = safeStoredSoundAssetFilename(alert.sound_file);
    const sound = normalizeAlertSound(alert.sound);
    const volume = normalizeAlertVolume(alert.sound_volume);
    if (volume <= 0 || (!filename && !sound)) return;
    const current = generation;
    try {
      const ctx = audioContext();
      if (ctx.state !== "running") {
        onStatus("blocked");
        return;
      }
      if (filename) {
        const player = new Audio("/overlay/assets/" + encodeURIComponent(filename));
        media = player;
        player.volume = volume / 100;
        void player.play().then(() => {
          if (enabled && current === generation && media === player) onStatus("");
          else player.pause();
        }).catch((error: unknown) => {
          if (!enabled || current !== generation || media !== player) return;
          stopMedia();
          onStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "blocked" : "failed");
        });
      } else {
        scheduleAlertSound(ctx, sound, volume);
        onStatus("");
      }
    } catch {
      if (enabled && current === generation) onStatus("failed");
    }
  }

  function show(alert: WireEvent) {
    stopMedia();
    play(alert);
    timer = setTimeout(() => {
      stopMedia();
      const next = queue.completeVisible();
      if (next) show(next);
    }, Number(alert.duration_ms));
  }

  function reset() {
    generation++;
    clearTimeout(timer);
    timer = undefined;
    queue.reset();
    stopMedia();
    const previous = context;
    context = null;
    if (previous) void previous.close().catch(() => undefined);
  }

  return {
    unlock,
    setEnabled(value: boolean) {
      if (enabled === value) return;
      enabled = value;
      if (!enabled) reset();
      onStatus("");
    },
    receive(frame: WireEvent) {
      if (!enabled) return;
      const alert = frame.type === "alert" ? frame : progressionAlertFromFrame(frame);
      if (!alert) return;
      const next = queue.enqueue(alert);
      if (next) show(next);
    },
    dispose() {
      enabled = false;
      reset();
    },
  };
}
