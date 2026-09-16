# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Windows 11 desktop + OBS | amd64 | All five shipped themes; 100% and 150% display scale; keyboard/mouse; 1920×1080, 1080×1080, 1080×1920 sources | yes — P0 release smoke |
| macOS desktop + OBS | universal | Default plus one cockpit and `g_rebels_popups`; Retina scaling; keyboard/mouse; landscape and portrait | yes — P1 packaged smoke |
| Linux desktop + official Browser-Source-capable OBS | amd64 | Default, dashboard, cockpit; X11/Wayland where current app supports them; keyboard/mouse | yes — P1 packaged smoke; dock availability is irrelevant |
| Headless localhost server + Chromium | host architecture | All five themes; browser zoom 100%/200%; keyboard-only admin; reduced motion | yes — P0 automated/integration and manual fallback |

The five theme values under test are `default`, `dashboard`, `cockpit_panel`, `cockpit_popups`, and `g_rebels_popups`. The matrix does not expand the supported OS list; it samples existing packages and the OBS Chromium runtime most exposed to the new surface.

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| stream-recaps / first confirmed show | Seed a current session, open Recap, inspect permanent/no-reset copy, confirm with its id | One version-1 snapshot commits, becomes visible, counters/session id and XP facts are unchanged | P0 |
| stream-recaps / repeat show | Capture, hide, add later messages/XP/unlocks, Show again | Stored and wire snapshot is byte/field identical; later facts remain only in normalized history | P0 |
| stream-recaps / stale dialog | Open confirmation in client A, run New stream in B, confirm A | HTTP 409, no old/new snapshot created by A, recap stays hidden/prior state unchanged, dialog refreshes | P0 |
| stream-recaps / concurrency | Race two Show calls and Show versus New stream under race detector | At most one snapshot for the expected open session; no mixed-session aggregate; deterministic conflict/reuse | P0 |
| stream-recaps / content/privacy | Seed >5 ranked viewers, a leaderboard-hidden viewer, >6 achievement groups, opted-out viewer, announce-off definition, backfill, repeated occurrence, secret unlock | Exact Top 5 and newest six grouped eligible rows; all exclusions hold; secret unlocked item may appear; totals/bounds valid | P0 |
| stream-recaps / empty | Show a new session with no activity | Valid zero-total snapshot and readable closing card; no blank panels or failure | P1 |
| viewer stats/history | Create multiple sessions with and without recaps; page with small limit; open details | Newest-first stable cursor pages, selected-session aggregates, current/captured flags, no next-session boundary labelled stream end | P0 |
| interaction-events | Exercise command, award, activity, and contract award paths | Event session id matches causal open session in the same commit; no chat text behavior changes | P0 |
| viewer-progression | Trigger live unlock, reconciliation unlock, and viewer merge/collision | Live unlock attributed; backfill remains null; merge preserves original/earliest attribution | P0 |
| HTTP API | Cover all new GET/action routes, JSON/content types, malformed bodies, invalid ids/limits/cursors, 404/409/503/500 mapping | snake_case bounded DTOs, no leaked internals, no mutation on failed reads/actions; router guard accepts POST-action shape | P0 |
| WebSocket feed | Connect normal, unknown-frame-tolerant, debug, stalled, and reconnecting clients; Show/Hide/New stream | Production initial/current state converges, debug gets none, slow queue cannot block, drops observable, other clients keep working | P0 |
| OBS hidden/visible lifecycle | Load production recap hidden; Show, reload source, Hide, restart server | Transparent initially; same snapshot restored on source reload; DOM clears on Hide; restart remains hidden | P0 |
| OBS independent surface | Run short `/overlay/alert` source and full-canvas recap source; enqueue an alert and Show/Hide recap | Recap only fills its own rectangle; alert geometry, queue, and timers are unchanged | P0 |
| OBS layout/themes | Render min/max fixtures across five themes and three aspect ratios with long RU/EN names, titles, achievements | No source scrollbar, clipped primary data, unsafe overflow, illegible contrast, or missing theme mapping | P0 |
| OBS safety/recovery | Feed markup-like text, invalid/local/remote/broken portraits, unknown WS frames, disconnect/reconnect | Text remains literal, allowed images/fallbacks work, unknown frames ignored, bounded reconnect converges | P0 |
| reduced motion | Emulate `prefers-reduced-motion: reduce` in sample and production | Content appears immediately with static emphasis and no required information lost | P1 |
| Live dialog accessibility | Keyboard-open, tab through both views/detail/confirmation, cancel/Escape, create error/conflict, use 200% zoom and short height | Focus trap/return/back targets correct, pinned controls reachable, body scrolls, busy/errors/status announced, no fragment hidden | P0 |
| Studio isolation/config | Select Recap, edit opacity 0/default/1, switch surfaces, preview/publish/revert during production visible state | Draft survives switching/errors, sample stays fictitious, publish updates appearance only, no capture/visibility broadcast | P0 |
| OBS setup | Inspect every existing setup location; copy/open follow-active and pinned preset URLs | Correct `/overlay/recap` forms and full-canvas/z-order guidance; existing URLs unchanged | P1 |
| dock/admin regression | Show/Hide while messages, alerts, leaderboard, Live feed, and `/dock/messages` are open | No recap controls/rendering in dock; known flows keep operating and unknown WS frame is harmless | P0 |
| config-store | Load legacy config, round-trip omission and explicit zero, reject NaN/out-of-range/type errors | Theme default without rewrite; zero preserved; validation field maps to Recap control; stored config unchanged on failure | P0 |
| localization | Run parity test and inspect RU/EN long strings/plurals/timestamps | Key parity, no untranslated keys or assembled fragments, controls remain readable | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Start desktop and headless builds with writable existing data directories; verify `00019` uses the current SQLite location and no second database/preferences file appears.
- Make a temporary data directory non-writable before migration in a controlled test. Startup must fail through existing safe handling, must not serve a partially migrated API, and must preserve the source database.
- Verify URL Copy/Open success and simulated clipboard rejection. Failure feedback must not Show/Hide or alter the copied value later.
- Open multiple admin and Browser Source clients. A successful Show/Hide from one client converges all production clients through localhost HTTP/WebSocket without native IPC.
- Suspend/wake or disconnect/reconnect the host while visible. Browser Sources recover the in-process snapshot. Stop/restart the process and verify every source receives hidden.
- Terminate the process immediately after successful Show response and after failed/cancelled Show. Committed snapshots survive; visibility never survives; incomplete transactions do not appear.
- Confirm no new firewall prompt, elevated privilege, filesystem dialog, notification, tray item, protocol handler, subprocess, connector scope, or external request occurs.

## Persistence Migration / Corruption / Recovery

- Migration fixtures: empty database; schema at `00018`; one closed plus one open session; exact start/end boundary timestamps; gaps; overlapping/corrupt intervals; multiple open rows; backfilled and non-backfilled unlocks; existing viewer merges.
- Verify Up maps only exact single interval matches, uses an exclusive end, never attributes `backfilled = 1`, creates the expected foreign keys/indexes/unique constraint, and leaves all original facts/counts intact.
- Verify Down removes recap-only structures while preserving sessions/stats/events/unlocks, then Up succeeds again. Record that exact snapshot payloads removed by Down are intentionally unrecoverable.
- Run foreign-key/integrity assertions after Up, representative writes/merges, and Down/Up. Verify one snapshot per session and valid JSON/version constraints.
- Insert or arrange invalid JSON/unsupported version/out-of-bounds payload in a dedicated corruption fixture with constraints handled as applicable. Reads/Show fail closed, safe diagnostics appear, no fallback overwrite occurs, and unrelated chat/overlay APIs stay available where startup permits.
- Back up a pre-change temp data directory, migrate/capture/restart, restore the backup, and verify documented rollback behavior. No test operates on the developer's or user's real data directory.
- Exercise legacy and explicit-zero recap config round trips; compare file bytes for no-rewrite load paths where existing tests support that guarantee.

## Install / Upgrade / Downgrade / Packaged-App Smoke

1. Build or obtain each artifact from the existing release workflow; inspect that no user database/config is bundled and that recap assets are embedded.
2. Fresh install: launch, check `/health`, open Live/Studio, load `/overlay/recap` hidden, capture an empty/small session, Show/Hide, and restart hidden.
3. Upgrade: clone a sanitized pre-`00019` data directory, launch the new package, verify migration/backfill/history/existing totals, add the separate OBS source, and capture/show the current session.
4. Binary rollback: stop the new package, preserve a backup, run the prior package against the additive database only in a disposable fixture, and verify its existing admin/chat/alert/leaderboard behavior. It will not expose recap.
5. Schema rollback: in migration tests only, apply Down and verify disclosed recap-data loss plus preservation of older facts; then Up again.
6. Archive smoke: ensure Windows ZIP, macOS universal ZIP, and Linux tarball keep their established names/layout. No signing, notarization, upload, release, or production data mutation is authorized by QA.

## Automated Commands / Manual Setup / Fixtures

Automated gates from repository root:

```text
go test ./...
go test -race ./internal/store ./internal/api ./internal/bus ./internal/bootstrap
golangci-lint run ./...
npm ci
npm run lint
npm test
npm run test:i18n
openspec validate end-of-stream-recap --strict
git diff --check
```

Implementation may narrow the targeted race package list to actual recap-controller ownership, but it must include store/API and the broadcaster/controller package. Add deterministic Go fixtures/builders for sessions, stats, attributed events, definitions/revisions/unlocks, privacy flags, and recap payload version 1. Add Node tests for safe rendering, fit/class selection, WS lifecycle, Studio surface/opacity, Live dialog state, URL construction, and i18n parity.

Manual OBS fixtures use sanitized fictitious viewer data in four sizes: empty, minimal, maximum bounded, and hostile/long text. Capture screenshots at 1920×1080, 1080×1080, and 1080×1920 for all five themes with panel opacity default/0/1 as relevant. Compare hidden frames for full transparency and record Browser Source console errors.

## Evidence and Explicit Skips

Required evidence:

- command logs for all automated gates and migration/race tests;
- HTTP/WS test assertions for exact DTO/envelope and status/error mappings;
- migration fixture results including integrity/foreign-key checks and preserved row counts;
- desktop/OBS screenshot matrix for themes/aspect ratios, plus a short Show → reload → Hide → restart capture;
- keyboard/focus/short-height notes for Live and Studio in RU and EN;
- packaged-artifact inventory and fresh/upgrade/rollback smoke notes per platform.

Explicit skips with rationale:

- iOS/Android, touch gestures, screen readers outside hosted web accessibility, and unsupported OS/architectures: not in the project support matrix.
- Cloud, remote-network, multi-user authorization, firewall traversal, OAuth scopes, and connector API certification: no boundary or permission changes.
- Native notifications, tray commands, global shortcuts, file dialogs/associations, deep links, child processes, services, and sleep inhibitors: explicitly not implemented.
- Auto-update, installer creation, signing/notarization execution, upload, and live release: distribution mechanics are unchanged and planning grants no publication authority.
- Full-chat retention, session labels, Analytics charts/export/deletion, historical on-air replay, snapshot replacement, automatic end detection, and MVP grants: explicit product non-goals.
