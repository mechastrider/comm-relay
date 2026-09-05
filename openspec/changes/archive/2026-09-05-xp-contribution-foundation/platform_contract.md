# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows (project-supported releases) | Packaged architecture | Same ingest, SQLite, and admin/overlay XP behavior |
| Linux (project-supported distributions) | Packaged architecture | Identical; no desktop-entry change |
| macOS (project-supported releases) | Packaged architecture | Identical; no entitlement change |
| Headless server on supported OS | Packaged architecture | Activity and XP mutations run in-process; admin may be a normal browser |

OBS CEF consumes `/overlay/leaderboard` JSON `xp`. Wails WebView and a normal browser share the localhost HTTP contract.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Goose migrates `comm-relay.db` beside `config.json`; activity settings persist in `config.json` | Existing user-config-directory access | Failed migrate prevents startup with the existing store error path; failed config save is HTTP 400/500 with field errors |
| clipboard/notifications | Unchanged | None added | Existing behavior |
| tray/menu/shortcuts | Unchanged | None added | Existing behavior |
| protocol/file associations | No change | None | Not applicable |
| single instance/deep open | No change | None | Existing behavior |
| child processes/IPC | No native IPC; localhost HTTP remains the only UI boundary | Existing localhost trust | Failed ingest leaves prior XP; retry is the next chat line or grant |
| sleep/wake/shutdown | Activity timestamps are SQLite UTC/RFC3339 text; interval uses server clock after wake | None | A long sleep can make the next line eligible for activity; that is intended |

## Protocol Contract

- `GET /api/viewers`, `GET /api/viewers/get`, `GET /api/leaderboard`, and WebSocket `leaderboard` entries use `xp` and MUST NOT include `score`.
- `GET /api/config` includes `activity_interval_seconds`, `activity_session_limit`, `activity_xp`.
- `POST /api/config/update` validates those integers ≥ 0. Legacy `points_per_message` is not a progress control.
- `POST /api/awards/grant` still accepts `award_id` and writes award `points` into XP.
- No new POST-action routes. Connectors unchanged.

## Security / Privacy / Trust Boundary

- Local HTTP remains unauthenticated under the existing localhost operator model.
- Activity events store no chat text.
- Public config still omits secrets. Activity integers are non-secret.

## Not applicable areas

- Native file dialogs, overlay-assets media library, OS notifications, tray, global shortcuts, protocol handlers, deep links, single-instance policy.
- Camera, microphone, screen capture, firewall, elevation, and sandbox entitlements.
- Installer, autostart, desktop-entry, code-signing, and package metadata beyond shipping the same artifacts.
- OBS scene switching and child-process lifecycle.
