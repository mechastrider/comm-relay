# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows (project-supported releases) | Packaged architecture | Wails admin uses the same Audience table and localhost API; no Windows API is added |
| Linux (project-supported distributions) | Packaged architecture | Identical admin behavior; no desktop-entry or compositor change |
| macOS (project-supported releases) | Packaged architecture | Identical admin behavior; no entitlement change |
| Headless server on supported OS | Packaged architecture | `GET /api/viewers` includes `platforms`; admin may be used from a normal browser |

OBS CEF, overlay, and dock are out of this change. The Wails WebView and a normal browser are the operator UI runtimes; they share one HTTP contract.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | SQLite is read for list + platform collapse; no new file, dialog, or `config.json` field | Existing user-config-directory access | List errors stay HTTP 500/`cannot-reach`; last successful table remains until Retry |
| clipboard/notifications | Unchanged | None added | Existing behavior |
| tray/menu/shortcuts | Unchanged | None added | Existing behavior |
| protocol/file associations | No change | None | Not applicable |
| single instance/deep open | No change | None | Existing behavior |
| child processes/IPC | No native IPC; localhost HTTP remains the only runtime boundary | Existing localhost trust model | Failed list fetch is retryable; sort preference stays in WebView storage |
| sleep/wake/shutdown | In-memory table sort is recomputed on the next successful list; WebView storage survives process restart of the UI | None | Invalid stored sort falls back to last-activity order |

## Protocol Contract

- `GET /api/viewers` remains GET with optional `q`. Additive `platforms` is a JSON array of unique lowercase platform ids, last-seen first. `identities` stays omitted on the list.
- `GET /api/viewers/get` is unchanged and remains the identity detail source.
- No new POST-action route. Merge, session start, and viewer update keep current paths.
- Connectors are unchanged. Platform ids are those already stored on `viewer_identities`.

## Security / Privacy / Trust Boundary

- The local HTTP server remains unauthenticated under the existing localhost operator trust model.
- List payloads still omit per-identity logins and avatars. `platforms` is only a unique id set.
- Sort preference is non-secret UI state in `localStorage`; it MUST NOT be written to SQLite, `config.json`, logs, or diagnostics.
- No secret, OAuth token, or proxy credential is added to the list JSON.

## Not applicable areas

- Native file/open/save dialogs, media directories, and overlay asset folders.
- OS notifications, tray/menu additions, global shortcuts, protocol handlers, file associations, deep links, and single-instance behavior.
- Camera, microphone, screen capture, accessibility-service, firewall, elevation, and sandbox entitlements.
- Installer, autostart, desktop-entry, code-signing, and package metadata.
- Child-process lifecycle, OBS scene switching, and overlay WebSocket consumers.
