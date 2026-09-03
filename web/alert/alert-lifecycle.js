/**
 * Starts audio without letting an audio policy or playback failure affect the
 * display timer. The timer is the sole authority for queue progression.
 */
export function startSplashLifecycle(options) {
  try {
    const playback = options.playSound();
    if (playback && typeof playback.catch === "function") {
      playback.catch(function () {
        /* visual completion remains independent of audio */
      });
    }
  } catch {
    /* visual completion remains independent of audio */
  }

  if (options.keepVisible) {
    return null;
  }
  return options.setTimeout(options.onComplete, options.durationMs);
}
