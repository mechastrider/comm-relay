import { apiURL } from "./api.js";

export function buildObsOverlayURL(presetId) {
  let url = apiURL("/overlay");
  if (presetId) {
    url += "?preset=" + encodeURIComponent(presetId);
  }
  return url;
}
