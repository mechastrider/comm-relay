# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows (project-supported releases) | Packaged architecture | Cache files written next to `config.json` under `overlay-assets`; Wails admin uses HTML file input |
| Linux (project-supported distributions) | Packaged architecture | Same paths via user config dir; no desktop-entry change |
| macOS (project-supported releases) | Packaged architecture | Same; no entitlement change |
| Headless server on supported OS | Packaged architecture | Fetch worker + HTTP upload/API; OBS and admin may be remote to that localhost process only |

OBS CEF must be able to GET `/overlay/assets/{filename}` from the same origin as the overlay pages.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | New files only in existing `overlay-assets` beside config/DB; Goose columns on `comm-relay.db`. No native open/save dialog | Existing user-config-directory write | Failed write keeps remote URL; chat ingest continues |
| clipboard/notifications | Unchanged | None added | Existing behavior |
| tray/menu/shortcuts | Unchanged | None added | Existing behavior |
| protocol/file associations | No change | None | Not applicable |
| single instance/deep open | No change | None | Existing behavior |
| child processes/IPC | No native IPC; outbound HTTPS from the cache worker to connector CDN hosts | Localhost HTTP remains the operator trust boundary; worker must not reach private nets | Fetch errors are logged at Warn; no process crash |
| sleep/wake/shutdown | In-flight fetches abort with process context; queued URLs may retry after restart when the next message for that identity arrives | None | Shutdown still graceful |

## Protocol Contract

- `POST /api/viewers/avatar/upload` multipart `id` + `file`; `POST /api/viewers/avatar/clear` JSON `id`.
- `POST /api/viewers/update` may include `leaderboard_hidden`.
- `GET /api/viewers` and get include resolved `avatar_url` and `leaderboard_hidden`; get includes `custom_avatar` when set.
- `GET /api/leaderboard` and `/ws` `leaderboard` honor hide + `max_entries`.
- `/ws` `message` may carry local `/overlay/assets/` `avatar_url`.
- Overlay asset `kind` `viewer_avatar`. Config `custom_avatars_enabled`. Preset `surfaces.leaderboard.title` and `max_entries`.
- YouTube API connector sets `avatar_url` from `ProfileImageUrl`.

## Security / Privacy / Trust Boundary

- Fetch only connector avatar URLs (HTTPS, public hosts, no userinfo, redirect re-check, size/type sniff).
- Do not fetch URLs from chat message text.
- Localhost API stays unauthenticated.
- Portrait files are viewer PII; they live in the operator backup folder and MUST NOT be copied into diagnostics dumps.
- Custom portraits are operator-supplied, not viewer uploads from the internet.

## Not applicable areas

- Native file/open/save dialogs, camera, microphone, screen capture, accessibility-service, firewall prompts, elevation.
- OS notifications, tray/menu additions, global shortcuts, protocol handlers, file associations, deep links.
- Installer, autostart, desktop-entry, code-signing, and package metadata changes.
- Twitch Helix or any new OAuth client.
- Child-process OBS control.
