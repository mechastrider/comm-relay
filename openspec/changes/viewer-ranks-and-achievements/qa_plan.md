# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Ubuntu CI / Chromium | amd64 | Automated Go/JS/API tests; 1440×900, 1100×700, 390×844; keyboard; reduced motion | yes, every PR |
| Windows 11 packaged Wails/WebView2 + OBS CEF | amd64 | Current light/dark tokens; 100%, 150%, 200%; mouse and keyboard | yes, P0 before release |
| Windows 11 external Chromium/Firefox | amd64 | Same responsive matrix; production/debug WebSockets | yes, implementation QA |
| macOS packaged Wails/WebKit | universal 64-bit | Default/increased zoom; mouse/trackpad and keyboard | yes, P1 release smoke |
| Linux packaged Wails/GTK-WebKit + supported OBS | amd64 | 100%/150%; keyboard; documented CEF/GPU limitations | yes, P1 release smoke |
| Headless server on supported OS | release architecture | Browser admin plus overlay URLs, no Wails APIs | yes, CI/build or release smoke |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| viewer-progression / levels | Configure 0/100/500 levels; cross thresholds by activity and award XP; edit/delete thresholds | Highest threshold derives from all-time XP; no bonus XP; baseline protected; admin edits silent | P0 |
| viewer-progression / metrics | For one viewer generate messages, XP, selected awards, successful/rejected commands, participation in distinct sessions, awarded/closed contracts | Each typed metric counts only its documented durable successful fact | P0 |
| viewer-progression / repeat | Cross N, 2N, and multiple thresholds in one atomic increase; retry evaluation | Every occurrence appears once; one-time rules do not repeat | P0 |
| viewer-progression / revisions | Rename/disable/secret-toggle, then change target/metric/repeat mode | Cosmetic fields keep revision; rule fields increment it; old snapshots survive; new backfill is silent | P0 |
| viewer-progression / seeds | Initialize RU and EN fresh stores; upgrade populated v16 store; edit/delete seeds; restart/change locale | Stable ids/thresholds, locale-correct text, exactly-once bootstrap, no restoration/retranslation | P0 |
| viewer-progression / secrecy | Inspect locked secret through list/detail/API/DOM; unlock it live and by backfill | No locked details leak; live unlock may announce; backfill never announces | P0 |
| viewer-progression / suppression | Disable global type, definition announce, level announce, and viewer alerts independently | State/history always update; production frame appears only when every applicable gate permits | P0 |
| viewer-stats / merge | Merge fixtures with overlapping and disjoint historical sessions/days/events/contracts/unlocks and mixed opt-outs | Exact sums, preserved periods, earliest duplicate unlock, restrictive opt-out, audit, no alert | P0 |
| HTTP API | Exercise all reads and create/update/delete/settings actions with malformed JSON, unknown ids/metrics/subjects, bounds, duplicate level threshold | POST-action routes only; snake_case; safe 400/404 field errors; no partial writes | P0 |
| preview isolation | Test dirty achievement, level, and alert-setting drafts with zero/one debug receiver while production client listens | Only debug audience receives frame; response count is correct; no persistence/history/counter mutation | P0 |
| WebSocket aggregation/order | One award causes level plus two unlocks; connect normal, debug, unknown-client, and stalled-client fixtures | Source alert precedes one aggregate frame; debug separation; old clients ignore; slow client does not stall | P0 |
| overlay-alerts / queue | Mix visible/pending award, contract, progression, command, and greeting frames to capacity | No preemption; protected FIFO/order; low-priority eviction only; one combined progression card | P0 |
| overlay-alerts / render | Render level-only, achievement-only, combined, missing portrait, long RU/EN text, reduced motion, reconnect | Safe readable themed card, transparent page, no empty regions, no replay after reconnect | P0 |
| Audience navigation | Visit all six tabs via pointer/keyboard/hash/back-forward at wide/narrow/200% layouts | Greetings remains reachable; Progression order correct; tab scrolls into view; no clipping/wrap | P0 |
| achievement/level editors | Dirty selection, conditional subject field, inline errors, revision/delete confirmations, baseline row, zero receiver | Draft preserved, focus restored/moved correctly, footer reachable, explanations accurate | P0 |
| viewer directory/detail | Open ordinary, maximum-level, no-achievement, repeated-achievement, and locked-secret viewers; receive live frame | Compact title, accessible progress, grouped unlocks, no secret leak, no scroll/draft reset | P0 |
| leaderboard titles | Toggle draft/publish; load legacy preset; test panel/chips, all themes, sample/live, short rectangle | Default off; sample fictitious; live titles correct; title hides before rank/name/XP; no partial row | P0 |
| regression: Greetings/Commands/Awards | Edit/test each existing catalog after adding Progression; run mixed alert queue | Existing tabs, drafts, preview isolation, scheduler priority, and production behavior remain intact | P0 |
| localization/accessibility | Compare RU/EN keys and layouts; keyboard-only editors/dialogs; screen-reader labels/progress; color contrast | Parity, persistent labels, focus trap/restore, non-color state, accessible progress and errors | P1 |
| large history | Reconcile synthetic 10k viewers / 100k interactions while ingesting messages and opening admin | Bounded batches/memory, responsive service, indexed reads, no duplicate unlocks or alert burst | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Start desktop and headless builds with default and explicit config/data paths; verify progression uses only the existing SQLite/config locations and creates no adjacent files.
- Make the database directory temporarily unwritable during migration/catalog save; expect actionable safe failure, intact prior state, and no alert. Restore permission and retry.
- Terminate after pending locale, after seed insertion, and between reconciliation batches. Restart with another UI locale; expect the persisted locale, one catalog, resumed generation, and no duplicate unlocks.
- Suspend/wake or pause the process during reconciliation and with OBS disconnected. Durable state resumes; missed progression cards are not replayed.
- Fill one WebSocket client's queue while another client, admin, and store remain active. Verify pipeline drop diagnostics and no storage rollback.
- Stop one connector and feed normalized events from another. Progression continues because connector health remains isolated.

## Persistence Migration / Corruption / Recovery

Fixtures:

1. empty database at schema 0;
2. schema 16 database with RU and EN configured locales;
3. populated database with deleted starter awards/commands, completed sessions/days, awards, commands, contracts, greetings flags, custom portrait, and viewer merges;
4. upgraded database interrupted at each bootstrap/reconciliation checkpoint;
5. two viewers with overlapping/disjoint stats and duplicate unlock occurrences;
6. malformed/corrupt progression row in a disposable copy;
7. legacy/current config files with omitted, false, true, and invalid `show_viewer_titles`.

For valid fixtures run migration, foreign-key check, `PRAGMA integrity_check`, seed assertions, reconciliation twice, restart, merge, and query-plan inspection. Inject transaction failures before commit and assert total rollback plus zero WS events. Corruption must surface through diagnostics/logging without silently deleting/reseeding user data. Back up before manual upgrade/downgrade work.

## Install / Upgrade / Downgrade / Packaged-App Smoke

- From a clean package, launch once in RU and EN, open Audience Progression, confirm seeds/default settings, add/edit/test definitions, restart, and verify persistence.
- Upgrade a copy of current production data. Existing connectors, awards, commands, greetings, viewer history, OBS URLs, and presets must survive; the new catalog appears once and reconciliation stays silent.
- During backfill, ingest a live qualifying event and verify exactly one live result while historical results remain marked backfilled.
- Copy upgraded data and launch the selected previous release. It must read/write known features without schema failure; after a config save, forward-upgrade again and verify title visibility safely defaults if the old binary omitted it.
- On Windows run the packaged Wails UI and OBS CEF for `/overlay/alert` and `/overlay/leaderboard`; on macOS/Linux repeat available WebKit/OBS smoke and record unavailable cells explicitly.
- Verify app shutdown during reconciliation completes/cancels within the existing graceful-shutdown budget.

## Automated Commands / Manual Setup / Fixtures

Run from repository root after implementation:

```bash
go test ./...
go test -race ./internal/store ./internal/api ./internal/bus ./internal/bootstrap
golangci-lint run ./...
npm ci
npm test
npm run lint
go build ./...
openspec validate viewer-ranks-and-achievements --strict
git diff --check
```

Add focused store tests for every metric/revision/merge/migration invariant; handler tests for route/method/body/error/secret filtering; bus/WS tests for aggregation, order, debug separation, and drops; JS unit tests for tab overflow helpers, editor state, progress rendering, leaderboard fitting, alert scheduling/rendering, i18n parity, and HTML-safe text.

Manual setup uses only synthetic viewer/catalog/history fixtures and the existing overlay-debug mode. Real Twitch/YouTube/VK credentials are unnecessary: connector equivalence is tested at the normalized message boundary. Use a temporary application-data directory and never run destructive migration/downgrade tests on operator data.

## Evidence and Explicit Skips

Attach or record:

- command output for Go/JS/lint/build/OpenSpec checks;
- migration version, integrity/foreign-key results, retry/failure-injection results, and query plans;
- representative API and production/debug WebSocket captures proving secrecy, aggregation, order, and silence;
- screenshots at wide/narrow/200% for all progression sections, viewer card, leaderboard panel/chips, and combined alert in RU/EN plus reduced motion;
- packaged OS/WebView/OBS versions and unavailable matrix cells;
- diagnostics/log excerpts for bootstrap, reconciliation, live unlock, suppression, merge, and WS drops with no raw message/secret leakage.

Explicit skips: real connector OAuth, remote-server exposure, cloud sync, OS notifications, tray/menu/protocol handlers, signing, notarization, uploading, publishing, installer changes, custom progression media, mobile UI, and automatic end-of-stream MVP behavior. These are outside the change and must not be simulated as passing coverage.
