const ALERT_SOUND_TYPES = new Set(["chime", "ping", "soft", "alert"]);

function playTone(ctx, start, options) {
  const peak = options.peak;
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

export function playAlertTone(ctx, soundType, start) {
  const peak = 0.18;

  if (soundType === "ping") {
    playTone(ctx, start, { freq: 1200, duration: 0.1, peak: peak });
    return;
  }

  if (soundType === "soft") {
    playTone(ctx, start, { freq: 440, duration: 0.16, peak: peak * 0.7, wave: "triangle" });
    return;
  }

  if (soundType === "alert") {
    playTone(ctx, start, { freq: 880, duration: 0.08, peak: peak });
    playTone(ctx, start + 0.1, { freq: 880, duration: 0.08, peak: peak });
    return;
  }

  playTone(ctx, start, {
    freq: 880,
    freqEnd: 660,
    duration: 0.14,
    peak: peak,
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

export function scheduleAlertSound(ctx, soundType) {
  const normalized = normalizeAlertSound(soundType);
  if (!normalized || !ctx) {
    return;
  }
  playAlertTone(ctx, normalized, ctx.currentTime);
}
