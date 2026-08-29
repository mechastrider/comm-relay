/**
 * Interactive console redesign — admin feature inventory (slice 2.1).
 * Maps current entry points to future workspaces. Do not delete workflows until migrated.
 *
 * LIVE (now — #workspace-live, hash #live)
 *   Entry: default route, Monitor/Viewers canvas tabs, message list, refresh messages/viewers
 *   Controls: #new-stream-button, #refresh-messages, #refresh-viewers, canvas tab buttons
 *   Sidebar: Connections, OBS, Rich chat, Sound, Interface, About; systems overview; #save-button → #settings-form
 *   Status: connector pills (#twitch/youtube/vk-status), footer diagnostics, #banner
 *   Dialogs: all remain reachable from Live controls (see below)
 *   APIs: GET /api/messages/recent, GET /api/viewers*, POST /api/viewers/*, POST /api/sessions/start,
 *          GET /api/config, GET /api/diagnostics, POST /api/config/update, WS /ws
 *   Locale prefixes: shell.*, stream.*, viewers.*, banner.*, status.*, messages.*
 *
 * AUDIENCE (later — #workspace-audience, hash #audience)
 *   Future: viewer list/detail/merge, search, period filters, leaderboard period, New stream
 *   Now on Live: #viewers-canvas-panel, viewers-search, viewer-card, viewers APIs
 *
 * STUDIO (later — #workspace-studio, hash #studio)
 *   Future: overlay dialog content, appearance draft/publish, preview, OBS URLs, assets
 *   Now on Live: #overlay-dialog (setup + appearance), preset island, preview iframe
 *   Locale prefixes: obs.*
 *   APIs: POST /api/overlay/assets/upload, (future) POST /api/overlay/activate
 *
 * SETTINGS (later — #workspace-settings, hash #settings)
 *   Future: Platforms, Network, Data, Application, Diagnostics, About sections
 *   Now on Live: #connections-dialog, #rich-chat-dialog, #sound-dialog, #interface-dialog,
 *                #about-dialog, emote diagnostics in systems panel
 *   Locale prefixes: conn.*, dialog.*, rich.*, sound.*, iface.*, about.*
 *
 * DOCK (unchanged — separate page)
 *   /dock/messages — OBS message dock; linked from OBS setup dialog
 *
 * Dialogs (IDs preserved): connections-dialog, overlay-dialog, rich-chat-dialog, sound-dialog,
 *   interface-dialog, about-dialog, new-stream-prompt, overlay-preset-prompt
 *
 * OAuth: query handling in status.js; POST /api/youtube/oauth/start
 * Support: POST /api/support/open (about dialog)
 */

export const WORKSPACE_DESTINATIONS = Object.freeze({
  live: "live",
  audience: "audience",
  studio: "studio",
  settings: "settings",
});
