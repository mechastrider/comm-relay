import { cloneOverlayAppearanceDraft } from "./studio-helpers.js";

/**
 * Decide how Studio draft state should be restored after applyConfig overwrote the form.
 *
 * @param {{
 *   serverOverlay: unknown,
 *   baseline: Record<string, unknown> | null,
 *   draft: Record<string, unknown> | null,
 *   isDirty: boolean,
 * }} options
 * @returns {{
 *   shouldResetFromServer: boolean,
 *   overlayToApply: Record<string, unknown>,
 *   nextBaseline: Record<string, unknown>,
 *   nextDraft: Record<string, unknown>,
 * }}
 */
export function resolveStudioDraftAfterConfigApply(options) {
  const { serverOverlay, baseline, draft, isDirty } = options;
  if (isDirty && draft) {
    const nextDraft = cloneOverlayAppearanceDraft(draft);
    const nextBaseline = baseline
      ? cloneOverlayAppearanceDraft(baseline)
      : cloneOverlayAppearanceDraft(nextDraft);
    const server =
      serverOverlay && typeof serverOverlay === "object"
        ? /** @type {Record<string, unknown>} */ (serverOverlay)
        : {};
    const serverPresetId =
      typeof server.active_preset_id === "string" ? server.active_preset_id : "";
    if (serverPresetId && serverPresetId !== nextDraft.active_preset_id) {
      nextDraft.active_preset_id = serverPresetId;
      nextBaseline.active_preset_id = serverPresetId;
    }
    return {
      shouldResetFromServer: false,
      overlayToApply: nextDraft,
      nextBaseline,
      nextDraft,
    };
  }

  const nextBaseline = cloneOverlayAppearanceDraft(serverOverlay);
  const nextDraft = cloneOverlayAppearanceDraft(nextBaseline);
  return {
    shouldResetFromServer: true,
    overlayToApply: nextDraft,
    nextBaseline,
    nextDraft,
  };
}

/**
 * Split editable Settings sections into those that keep in-memory drafts vs reset from server.
 *
 * @param {readonly string[]} editableSections
 * @param {Iterable<string>} draftSectionIds
 * @returns {{ resetSections: string[], restoreSections: string[] }}
 */
export function partitionSettingsSectionsForConfigApply(editableSections, draftSectionIds) {
  const draftIds = new Set(draftSectionIds);
  const resetSections = [];
  const restoreSections = [];

  editableSections.forEach(function (sectionId) {
    if (draftIds.has(sectionId)) {
      restoreSections.push(sectionId);
    } else {
      resetSections.push(sectionId);
    }
  });

  return { resetSections, restoreSections };
}
