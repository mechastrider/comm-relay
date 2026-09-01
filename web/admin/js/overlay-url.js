import { overlaySourceURL } from "./studio-helpers.js";

const DEFAULT_ORIGIN = "http://127.0.0.1";

function resolveOrigin(explicit) {
  if (explicit) {
    return explicit;
  }
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return window.location.origin;
  }
  return DEFAULT_ORIGIN;
}

/**
 * @param {string | { presetId?: string, followActive?: boolean, origin?: string }} options
 * @returns {string}
 */
export function buildObsOverlayURL(options) {
  if (typeof options === "string") {
    return overlaySourceURL({
      origin: resolveOrigin(undefined),
      pathname: "/overlay",
      presetId: options,
      followActive: false,
    });
  }
  const opts = options || {};
  const origin = resolveOrigin(opts.origin);
  if (opts.followActive) {
    return overlaySourceURL({
      origin: origin,
      pathname: "/overlay",
      followActive: true,
    });
  }
  return overlaySourceURL({
    origin: origin,
    pathname: "/overlay",
    presetId: opts.presetId,
    followActive: false,
  });
}
