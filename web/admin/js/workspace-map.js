/**
 * Interactive console redesign — admin feature inventory (slice 2.1 + 3).
 * Maps current entry points to workspaces. Do not delete workflows until migrated.
 *
 * LIVE (#workspace-live, hash #live)
 *   Status strip: connector pills (#live-twitch/youtube/vk-status), browser client count
 *     (#live-browser-clients), active preset (#live-active-preset → POST /api/overlay/activate),
 *     #new-stream-button
 *   Tabs: Messages (#live-messages-panel), Leaderboard (#live-leaderboard-panel),
 *     Statistics (#live-statistics-panel) — keyboard tablist, independent region errors
 *   Messages: #recent-messages, WS /ws, delete stable IDs, sound, manual scroll
 *   Sidebar: Connections, OBS, Rich chat, Sound, Interface, About; #save-button
 *   APIs: GET /api/messages/recent, GET /api/leaderboard, GET /api/viewers,
 *          GET /api/config, GET /api/diagnostics, POST /api/overlay/activate, WS /ws
 *   Locale: live.*, shell.*, stream.*, banner.*, status.*
 *
 * AUDIENCE (#workspace-audience, hash #audience)
 *   Toolbar: labeled search, period select, Open leaderboard, Refresh, New stream
 *   Dense viewer table with score/messages for selected period
 *   Wide: side inspector; compact: in-flow detail sheet dialog
 *   Edit display name, merge with confirmation, APIs:
 *     GET /api/viewers, GET /api/viewers/get, POST /api/viewers/update,
 *     POST /api/viewers/merge, POST /api/sessions/start
 *   Period shared with Live leaderboard via live-leaderboard.js
 *   Locale: audience.*, viewers.*, stream.*
 *
 * STUDIO (#workspace-studio, hash #studio)
 *   Three-column layout: OBS source setup | preview | preset inspector
 *   Draft/baseline overlay config; Publish → POST /api/config/update (overlay only)
 *   Hot active preset (#studio-active-preset → POST /api/overlay/activate)
 *   Primary copy URLs omit ?preset= (follow active preset); pinned URLs in advanced section
 *   Dock URL unchanged: /dock/messages
 *   Modules: studio.js, studio-helpers.js, overlay-appearance.js, overlay-preview.js, obs-setup.js
 *   Locale: studio.*, obs.followActive*, obs.pinned*
 *
 * SETTINGS (later — #workspace-settings, hash #settings)
 *   Future: Platforms, Network, Data, Application, Diagnostics, About sections
 *   Now on Live: connection/rich-chat/sound/interface/about dialogs
 *
 * DOCK (unchanged): /dock/messages
 */

export const WORKSPACE_DESTINATIONS = Object.freeze({
  live: "live",
  audience: "audience",
  studio: "studio",
  settings: "settings",
});
