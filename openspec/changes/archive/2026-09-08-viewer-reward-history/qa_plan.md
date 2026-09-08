# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Ubuntu CI | amd64 | Automated API/store/JS tests; headless DOM fixtures where applicable | yes, every PR |
| Windows 11 packaged Wails | amd64 | Current light/dark tokens, 100% and 150%, mouse + keyboard | yes, before release |
| macOS packaged Wails | universal 64-bit | Current tokens, default and increased zoom, mouse + keyboard | yes, before release |
| Linux packaged Wails | amd64 | Current tokens, 100% and 150%, mouse + keyboard | yes, before release |
| Normal Chromium-family browser | supported desktop architecture | 200% zoom and narrow responsive viewport | yes, before merge manual UI smoke |

No connector-specific platform matrix is needed: fixtures create canonical viewers associated with Twitch, YouTube Live, and VK Live identities without calling external services.

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| reward history / global | Seed awards plus command/activity events; request first page | Only awards return, newest first, with exact public fields | P0 |
| reward history / cursor | Seed more than limit, including exact-second timestamps, legacy RFC3339 fractions of mixed widths, and equal timestamps; migrate and traverse all cursors | Parsed instants are unchanged; normalized lexical order is chronological; no duplicates or skipped rows; final cursor absent | P0 |
| reward history / validation | Send malformed cursor and limits 0, 101, and non-number | HTTP 400 with UI-safe JSON | P0 |
| reward history / viewer | Request one viewer, then merge that viewer into another | Only scoped rows before merge; all rows appear on survivor after merge; source returns 404 | P0 |
| interaction events / atomic grant | Force event insert failure during grant | HTTP failure; no all/session/day XP change and no award alert | P0 |
| historical name | Grant, rename/delete catalog type, then read history | Existing `reward_name` remains the grant-time snapshot | P0 |
| privacy | Grant from message text and stable source id; inspect DB and API | DB contains no quote; response omits source-message fields, platform ids, and chat text | P0 |
| global UI | Open History, Refresh, Load more, empty and error fixtures | Correct rows/states; pagination failure retains prior rows | P0 |
| viewer UI | Open viewer, switch before history resolves, load more | Profile remains visible; stale result never crosses to new viewer | P0 |
| accessibility | Navigate tabs/table/buttons by keyboard and inspect roles/names/live status | Focus is stable; semantics and busy state are exposed without color-only meaning | P1 |
| localization | Switch RU/EN and inspect long names/rewards | All copy translated; local date + 24-hour time; content wraps safely | P1 |
| hostile text | Seed viewer/reward names containing HTML-like strings | Literal text renders; no markup or script executes | P0 |
| responsive UI | Inspect wide panel, compact sheet, narrow History table at 100–200% zoom | Only panel/body scrolls; header and controls stay reachable | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Start from a writable configuration directory and confirm the database migrates before `/health` and the admin are served.
- Start with an unwritable/corrupt migration target and confirm startup fails through existing error handling without a partially usable history endpoint.
- Close and reopen the browser, Wails WebView, and server; history is reconstructed from SQLite and requires no cache or WebSocket replay.
- Sleep/wake and localhost disconnect are covered by stopping/restarting the server while History is open: the panel shows retryable error and later reloads.
- Verify no new file, native dialog, clipboard operation, notification, child process, firewall prompt, or connector permission occurs.

## Persistence Migration / Corruption / Recovery

1. Build a version-13 fixture containing: a normal current award, a renamed current award, an event whose award type was deleted, command/activity events, exact-second and mixed one-to-nine-digit fractional UTC timestamps, equal timestamps, and two viewers later merged.
2. Run Up and verify `reward_name` uses the migration-time catalog name or `award_id`, non-award rows remain null, every interaction-event timestamp has the fixed nine-digit UTC representation without changing its parsed instant, and both history indexes exist.
3. Reopen the database through normal store startup and traverse global/viewer history.
4. While schema 14 remains applied, insert a legacy-column-list award with a variable-width RFC3339Nano timestamp, reopen through the current store without rerunning migration 14, and traverse its keyset pages to verify the trigger supplied the name snapshot and canonical timestamp.
5. Run Down then Up in a scratch database; verify ids, kinds, points, source references, timestamp values, and XP survive; verify Down removes the compatibility trigger before dropping the dependent schema. Accept the canonical fixed-width timestamp spelling after Down and loss/recreation of `reward_name` according to the rollback contract.
6. Simulate migration SQL failure and event-insert failure. Verify no schema version is falsely advanced and no partial award grant commits.

## Install / Upgrade / Downgrade / Packaged-App Smoke

- Upgrade a copy of populated user data with each packaged desktop build; confirm startup, History tab, viewer section, and an immediately granted award.
- Restart the upgraded version and confirm the entry and snapshot name persist.
- Replace the binary with the previous release without rolling Down; confirm it starts and existing viewers, award catalog, grants, and leaderboard still work. Grant once with that previous binary, return to the current binary without rerunning migration 14, and confirm the history name and order are readable.
- No clean-install wizard or uninstall test is added; confirm existing archive extraction and user-data location remain unchanged.

## Automated Commands / Manual Setup / Fixtures

Run from repository root:

```bash
go test ./internal/store ./internal/api -count=1
go test ./... -race -count=1
go build ./...
golangci-lint run ./...
npm ci
npm test
npm run test:i18n
npm run lint
openspec validate viewer-reward-history --strict
```

Add focused Go fixtures under existing store/API test packages and small DOM/helper tests under `web/admin/js/`. Manual UI setup may use a temporary config directory populated only with synthetic viewer/reward names; do not use or commit a real streamer's database.

## Evidence and Explicit Skips

Retain command output for tests/lint/OpenSpec validation and screenshots of global History plus wide/compact viewer history in RU and EN. Record packaged OS smoke results in the implementation PR.

Explicitly skipped as not applicable: live Twitch/YouTube/VK connections, OAuth, OBS Browser Source, dock, media upload/playback, tray/menu, global shortcuts, code signing/notarization, auto-update, and network services beyond localhost. These surfaces and permissions do not change.
