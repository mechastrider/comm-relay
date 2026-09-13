import { normalizeOpacitySurface, parsePanelOpacity, withSurfacePanelOpacity } from "./surface-opacity.js";

// Keeps the editable input separate from persisted overrides. In particular,
// the Recap input may display a theme-derived fallback that was never saved.
export function collectPanelOpacityOverrides(surfaces, editor) {
  const state = editor && typeof editor === "object" ? editor : {};
  let next = surfaces && typeof surfaces === "object" ? surfaces : {};
  const drafts = state.drafts && typeof state.drafts === "object" ? state.drafts : {};

  Object.keys(drafts).forEach(function (surface) {
    const opacity = parsePanelOpacity(drafts[surface]);
    if (opacity !== null) {
      next = withSurfacePanelOpacity(next, surface, opacity);
    }
  });

  if (state.touched) {
    const opacity = parsePanelOpacity(state.value);
    if (opacity !== null) {
      next = withSurfacePanelOpacity(next, normalizeOpacitySurface(state.surface), opacity);
    }
  }
  return next;
}

// Reset is an explicit operator action. Store it as a draft immediately so a
// programmatic input value cannot be mistaken for an untouched theme fallback.
export function resetPanelOpacityDraft(drafts, surface, opacity) {
  return Object.assign({}, drafts, {
    [normalizeOpacitySurface(surface)]: String(opacity),
  });
}
