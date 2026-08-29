/**
 * Interactive console redesign — admin feature inventory (slice 6).
 *
 * SETTINGS (#workspace-settings, hash #settings or #settings/<section>)
 *   Sections: platforms, network, data, application, diagnostics, about
 *   Editable sections: per-section baseline, dirty state, Reset, Save
 *   Save: GET /api/config → compose full update (server overlay) → apply section → POST /api/config/update
 *   Live controls link to #settings/<section> (OBS → #studio)
 *   OAuth callback opens #settings/platforms
 *   Modules: settings-workspace.js, settings-helpers.js, settings.js (shared config helpers)
 */

export const WORKSPACE_DESTINATIONS = Object.freeze({
  live: "live",
  audience: "audience",
  studio: "studio",
  settings: "settings",
});
