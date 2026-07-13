import * as dom from './dom.js';
import { state } from './state.js';
import { MESSAGE_SOUND_TYPES } from './constants.js';
import { showBanner } from './ui-shell.js';

export function normalizeMessageSoundType(raw) {
    if (typeof raw === "string" && MESSAGE_SOUND_TYPES.indexOf(raw) !== -1) {
      return raw;
    }
    return "chime";
  }

export function clampVolumePercent(value) {
    if (!Number.isFinite(value)) {
      return 50;
    }
    return Math.min(100, Math.max(0, Math.round(value)));
  }

export function applyMessageSoundFromConfig(config) {
    const ms =
      config && config.admin && config.admin.message_sound
        ? config.admin.message_sound
        : {};

    dom.messageSoundEnabledInput.checked = Boolean(ms.enabled);

    const volumePercent = clampVolumePercent(
      typeof ms.volume === "number" ? ms.volume * 100 : 50
    );
    dom.messageSoundVolumeInput.value = String(volumePercent);
    dom.messageSoundVolumeLabel.textContent = String(volumePercent) + "%";

    dom.messageSoundTypeInput.value = normalizeMessageSoundType(ms.sound);
  }

export function getMessageSoundSettings() {
    const volumePercent = clampVolumePercent(
      Number.parseInt(dom.messageSoundVolumeInput.value, 10)
    );
    return {
      enabled: dom.messageSoundEnabledInput.checked,
      volume: volumePercent / 100,
      sound: normalizeMessageSoundType(dom.messageSoundTypeInput.value),
    };
  }

export function ensureAudioContext() {
    if (!state.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        return Promise.reject(new Error("Web Audio not supported"));
      }
      state.audioCtx = new Ctx();
    }
    if (state.audioCtx.state === "suspended") {
      return state.audioCtx.resume();
    }
    return Promise.resolve();
  }

export function playTone(ctx, start, options) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const peak = options.peak;
    const duration = options.duration;
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

export function scheduleMessageSound(ctx, soundType, volume, start) {
    const peak = Math.max(0.0001, volume * 0.18);

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

export function playMessageSound(force) {
    const settings = getMessageSoundSettings();
    if (!force && !settings.enabled) {
      return;
    }
    if (settings.volume <= 0) {
      return;
    }

    ensureAudioContext()
      .then(function () {
        scheduleMessageSound(state.audioCtx, settings.sound, settings.volume, state.audioCtx.currentTime);
      })
      .catch(function () {
        /* autoplay policy or missing Web Audio */
      });
  }

export function initMessageSoundControls() {
    function unlockAudio() {
      ensureAudioContext().catch(function () {
        /* A later explicit Test click can retry browser audio activation. */
      });
    }
    document.addEventListener("pointerdown", unlockAudio, { once: true });
    document.addEventListener("keydown", unlockAudio, { once: true });

    dom.messageSoundEnabledInput.addEventListener("change", function () {
      if (dom.messageSoundEnabledInput.checked) {
        ensureAudioContext().catch(function () {
          /* user must use Test sound if blocked */
        });
      }
    });

    dom.messageSoundVolumeInput.addEventListener("input", function () {
      const volumePercent = clampVolumePercent(
        Number.parseInt(dom.messageSoundVolumeInput.value, 10)
      );
      dom.messageSoundVolumeLabel.textContent = String(volumePercent) + "%";
    });

    dom.testMessageSound.addEventListener("click", function () {
      ensureAudioContext()
        .then(function () {
          playMessageSound(true);
        })
        .catch(function () {
          showBanner("error", "Sound is not available in this browser.");
        });
    });
  }
