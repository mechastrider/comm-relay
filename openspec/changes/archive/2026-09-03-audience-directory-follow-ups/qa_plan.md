# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Linux CI / headless browser | amd64 | Keyboard; 100% and 150% zoom; current admin theme | yes, P0 |
| Windows 11 packaged Wails | amd64 | Mouse/keyboard; 100%/150% display scaling; wide and compact admin width | yes before release, P0 |
| Linux packaged Wails when WebView is available | amd64 | Keyboard; document X11/Wayland limitation | yes before release where supported, P1 |
| macOS packaged Wails/browser | universal | Admin smoke | yes before release, P1 |

OBS overlay/dock are not in this matrix.

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| viewer-stats / merged list | Merge Twitch+YouTube; `GET /api/viewers` | `platforms` is unique, last-seen first; `identities` omitted | P0 |
| viewer-stats / duplicate platform | Two identities on one platform | That id appears once | P0 |
| viewer-stats / card | `GET /api/viewers/get` | Full identities still present | P0 |
| admin-and-dock / first sort | Click Score from activity order | Descending by selected period; `aria-sort=descending` | P0 |
| admin-and-dock / cycle | Third click on Score | Last-activity order; `aria-sort=none` | P0 |
| admin-and-dock / persist | Sort Messages desc, reload Audience | Same column and direction | P0 |
| admin-and-dock / period | Sort by Score, switch session/day/all | Metrics follow the period; sort column stays | P0 |
| admin-and-dock / click | Single click a row at ≥1024px | Inspector opens; no Actions column | P0 |
| admin-and-dock / compact | Click a row below the wide breakpoint | Sheet opens | P0 |
| admin-and-dock / keyboard | Focus row, Enter and Space | Card opens; arrow roving still works | P0 |
| admin-and-dock / icons | Merged viewer row | Two icons, accessible names, no permanent text labels | P0 |
| admin-and-dock / unknown id | Inject unrecognized platform id | Generic glyph; raw id is the accessible name | P1 |
| admin-and-dock / New stream | Audience desktop toolbar; cancel then confirm | Control is outside filters; confirmation and session reset unchanged | P0 |
| admin-and-dock / header contrast | Light/dark admin theme, 150% zoom | Header surface distinct; text still readable | P0 |
| fallback / old server | Omit `platforms` in a fixture | One icon from `last_seen.platform` | P0 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Restart the desktop/browser: sort preference restores; SQLite viewers unchanged.
- Reload during an in-flight list: existing in-flight/error handling remains; no duplicate invented rows.
- WebView with `localStorage` disabled: table still loads in last-activity order.
- No filesystem dialog, clipboard, notification, or overlay WebSocket scenario is required.

## Persistence Migration / Corruption / Recovery

- No Goose migration to run. Confirm no new SQL migration file.
- Invalid `commRelay.audienceSort` falls back to activity order and does not wipe sidebar preference.
- Downgrade: previous binary lists viewers without `platforms`; data file opens.
- Corrupt `config.json` recovery is unchanged and out of this change.

## Install / Upgrade / Downgrade / Packaged-App Smoke

- Existing package names/contents besides embedded `web/` and Go list JSON.
- Upgrade over a DB with merged viewers: two icons appear without a re-merge.
- Restore the prior binary: app starts; viewer scores remain.

## Automated Commands / Manual Setup / Fixtures

Run from repository root:

```bash
npm ci
npm test
npm run test:i18n
npm run lint
go test ./...
golangci-lint run ./...
go build ./...
openspec validate audience-directory-follow-ups --strict
git diff --check
```

Add focused fixtures for merged platforms, duplicate collapse, sort cycle/persist, missing-`platforms` fallback, and markup without the Actions column.

Manual setup: admin `/` → Audience with at least one merged viewer, one single-platform viewer, and enough rows to sort. Check wide inspector and a narrowed window.

## Evidence and Explicit Skips

Required evidence: automated command output; API JSON for a merged viewer; screenshots of sorted headers, icons, and New stream grouping; keyboard notes.

Explicit skips:

- Overlay, dock, and OBS Browser Source checks: UI is admin-only.
- Connector network tests: connectors unchanged.
- Installer, signing, notarization, tray, protocol-handler, and media-file tests: out of scope.
- Full directory live-sync from leaderboard frames: out of scope.
