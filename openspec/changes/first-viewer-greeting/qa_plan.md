# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Windows 11 | amd64 | Wails, light/dark, 100% and 150%, mouse + keyboard, OBS Browser Source | yes — release gate |
| Linux current release used by project QA | amd64 | Wails/WebKit, light/dark, mouse + keyboard, OBS Browser Source | yes — release gate |
| macOS current supported release | universal 64-bit | Wails/WebKit, light/dark, keyboard, OBS Browser Source | yes — packaged smoke; full matrix may follow existing release availability |
| Current Chromium-family browser | host | 375/768/1024/1440 px, keyboard, reduced motion | yes — UI gate |
| Headless Go server | CI host | HTTP/WebSocket/SQLite fixtures | yes — CI gate |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| `viewer-greetings`: defaults | Initialize fresh RU and EN stores; list greetings | Exactly two localized definitions, both disabled | P0 |
| `viewer-greetings`: precedence | Enable both; ingest a new viewer ordinary line twice | First line emits one `new_viewer`; second emits none | P0 |
| `viewer-greetings`: returning | Start a new session; ingest known viewer | One `returning_viewer`; day/all-time state unchanged | P0 |
| `viewer-greetings`: independent switches | Exercise each enabled/disabled combination | Only the applicable enabled definition emits | P0 |
| `viewer-greetings`: command | Send enabled `!hi`, then ordinary text; also test unknown/disabled bang | Enabled command does not consume; next ordinary line greets; unmatched bang follows ordinary behavior | P0 |
| `viewer-greetings`: exclusion | Exclude viewer before qualifying line, then clear exclusion | No alert and no replay in current eligibility window | P0 |
| `viewer-greetings`: canonical merge | Merge cross-platform viewers with mixed markers/exclusion | Union prevents duplicate greeting; exclusion is preserved | P0 |
| `viewer-stats`: concurrency/restart | Race two first ordinary lines; restart mid-session | Exactly one outcome; later line after restart is not first | P0 |
| `http-api`: catalog/update | GET list; valid update; unknown id; invalid bounds/path | Stable snake_case JSON; atomic save; correct 404/field errors | P0 |
| `http-api`: preview isolation | Connect production and debug alert clients; preview unsaved draft | Debug receives frame and count; production receives none; database unchanged | P0 |
| `overlay-alerts`: scheduling | Queue greeting with commands, awards, and contracts; exceed wait/capacity | Protected work wins; greeting expires at 10 s and cannot displace protected item | P0 |
| `overlay-alerts`: rendering | Test both kinds, all layouts, custom/broken media, sound, themes | Correct emblem/fallback/text/media with transparent page | P1 |
| `admin-and-dock`: catalog | Navigate tabs, select both rows, edit/save, provoke errors | Correct order/layout; no Create/Delete; draft and focus preserved on error | P0 |
| `admin-and-dock`: preview recovery | Test with and without debug receiver | Honest delivered-client feedback and recovery guidance | P1 |
| `admin-and-dock`: responsive/a11y | 375 px and desktop; keyboard only; screen-reader spot check | No horizontal/clipped fields; logical focus; labels/errors/tooltips announced | P1 |
| diagnostics | Exercise fired, disabled, excluded, and delivery-drop paths | Bounded counters/reasons distinguish qualification and transport without message text | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Upload valid PNG/JPEG/WebP and MP3/WAV assets, reject unsafe names and over-limit/invalid files, and verify clear deletes only unreferenced assets.
- Reference one asset from a command and a greeting, clear the greeting, and verify the shared file remains.
- Prove `/ws` never receives preview frames and `/ws/overlay-debug` never receives production greetings.
- Disconnect all production alert clients for a qualifying greeting, reconnect, and verify no replay.
- Stop during/after a committed first-line transaction, restart with the same open session, and verify marker durability.
- Deny/read-only the asset directory and confirm the editor reports a recoverable media error without losing non-media form input.
- Sleep/wake requires no special test beyond the restart/reconnect case; no OS notification, tray, clipboard, protocol, or child-process scenario applies.

## Persistence Migration / Corruption / Recovery

- Fresh migration: tables/columns/constraints exist; locale bootstrap is idempotent.
- Populated upgrade: all existing message-bearing viewers are marked known; participants in the open session are marked seen; both definitions disabled.
- Re-open and down/up: edited definitions, exclusions, markers, and media references survive without duplicate seeds.
- Merge fixture: source and target have distinct identities, sessions, markers, and exclusions; survivor contains the conservative union.
- Constraint/corruption fixture: missing/invalid reserved definition fails visibly in store/API diagnostics and does not offer UI creation.
- Backup/restore a data directory containing greeting assets and confirm restored references resolve.

## Install / Upgrade / Downgrade / Packaged-App Smoke

- Build existing Windows, macOS, and Linux artifacts with no packaging-layout changes.
- On each required packaged platform, open Audience → Greetings, save one definition, open Studio alert test mode, run Test, and verify a transparent alert rendering.
- Upgrade a copied populated data directory, confirm no automatic greeting until explicitly enabled and a genuinely eligible future message occurs.
- Launch the previous compatible binary against a backed-up/restored pre-migration directory for rollback; do not make destructive downgrade assumptions.
- Confirm existing Twitch, YouTube, and VK connection/setup UI is unchanged.

## Automated Commands / Manual Setup / Fixtures

Run from repository root after implementation:

```bash
go test ./internal/store ./internal/api ./internal/observability
go test -race ./internal/store ./internal/api
go test ./...
golangci-lint run ./...
npm ci
npm run lint
npm run test:i18n
openspec validate first-viewer-greeting --strict
```

Add SQLite fixtures for fresh RU/EN bootstrap, populated pre-change upgrade with an open session, merge state, and shared media references. Add API WebSocket harness clients for simultaneous production/debug assertions. Manual OBS checks use the existing alert test source and a production `/overlay/alert` source side by side.

## Evidence and Explicit Skips

Required evidence: automated command logs, migration fixture assertions, screenshots at desktop and 375 px, keyboard/focus notes, one alert capture for each greeting kind, and packaged-smoke notes per available release runner. Record any unavailable macOS/OBS manual environment explicitly; CI/build success alone is not visual evidence. Signing/notarization, installer, auto-update, elevated permission, native notification, tray, global shortcut, and cloud tests are skipped because those contracts do not change.
