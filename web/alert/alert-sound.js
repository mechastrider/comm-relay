import { safeStoredAssetFilename } from "./alert-render.js";

const ALERT_SOUND_TYPES = new Set(["chime", "ping", "soft", "alert"]);

function playTone(ctx, start, options) {
  const peak = options.peak * (options.volumeScale || 1);
  const duration = options.duration;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = options.wave || "sine";
  osc.frequency.setValueAtTime(options.freq, start);
  if (options.freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(options.freqEnd, start + duration);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function normalizeAlertVolume(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return 70;
  }
  return Math.min(100, Math.max(0, value));
}

export function playAlertTone(ctx, soundType, start, volumePercent) {
  const peak = 0.18;
  const volumeScale = normalizeAlertVolume(volumePercent) / 100;

  if (soundType === "ping") {
    playTone(ctx, start, { freq: 1200, duration: 0.1, peak: peak, volumeScale });
    return;
  }

  if (soundType === "soft") {
    playTone(ctx, start, { freq: 440, duration: 0.16, peak: peak * 0.7, wave: "triangle", volumeScale });
    return;
  }

  if (soundType === "alert") {
    playTone(ctx, start, { freq: 880, duration: 0.08, peak: peak, volumeScale });
    playTone(ctx, start + 0.1, { freq: 880, duration: 0.08, peak: peak, volumeScale });
    return;
  }

  playTone(ctx, start, {
    freq: 880,
    freqEnd: 660,
    duration: 0.14,
    peak: peak,
    volumeScale,
  });
}

export function normalizeAlertSound(raw) {
  if (typeof raw === "string" && ALERT_SOUND_TYPES.has(raw)) {
    return raw;
  }
  return "";
}

export function ensureAudioContext(existing) {
  if (existing && existing.state === "running") {
    return Promise.resolve(existing);
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) {
    return Promise.reject(new Error("Web Audio not supported"));
  }
  const ctx = existing || new Ctx();
  if (ctx.state === "suspended") {
    return ctx.resume().then(function () {
      return ctx;
    });
  }
  return Promise.resolve(ctx);
}

export function scheduleAlertSound(ctx, soundType, volumePercent) {
  const normalized = normalizeAlertSound(soundType);
  if (!normalized || !ctx) {
    return;
  }
  playAlertTone(ctx, normalized, ctx.currentTime, volumePercent);
}

export function playCustomAlertSound(url, volumePercent) {
  const audio = new Audio(url);
  audio.volume = normalizeAlertVolume(volumePercent) / 100;
  return audio.play();
}

export function playAlertAudio(ctx, alert, overlayAssetURL) {
  const soundFile = safeStoredAssetFilename(alert && alert.sound_file);
  const volume = normalizeAlertVolume(alert && alert.sound_volume);
  if (soundFile && typeof overlayAssetURL === "function") {
    return playCustomAlertSound(overlayAssetURL(soundFile), volume);
  }
  const builtIn = normalizeAlertSound(alert && alert.sound);
  if (!builtIn) {
    return Promise.resolve();
  }
  scheduleAlertSound(ctx, builtIn, volume);
  return Promise.resolve();
}
