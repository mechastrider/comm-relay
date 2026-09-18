import {
  canDownloadRecapImage,
  recapDisplayData,
  RECAP_WINDOW_SESSION,
} from "./live-recap-helpers.js";

/**
 * @param {unknown} detail
 * @returns {boolean}
 */
export function archiveDownloadVisible(detail) {
  const data = recapDisplayData(detail);
  return canDownloadRecapImage({
    dialogWindow: RECAP_WINDOW_SESSION,
    snapshot: data.snapshot,
    allTime: null,
  });
}

/** @param {{ sessions?: unknown[], listLoaded?: boolean, selectedDetail?: unknown }} state */
export function archiveViewMode(state) {
  if (state.selectedDetail) return "detail";
  if (state.listLoaded && (!state.sessions || !state.sessions.length)) return "empty";
  return "list";
}
