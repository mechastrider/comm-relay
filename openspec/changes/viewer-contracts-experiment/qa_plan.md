# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Linux CI/dev host | amd64 | Headless Chromium/manual browser; keyboard; 100% and 150%; every alert theme and landscape/square/portrait/banner rectangles | yes — automated baseline and manual overlay smoke |
| Windows 11 | amd64 | Wails WebView2 plus OBS CEF; keyboard/mouse; 100%, 125%, 150% OS scaling; every alert theme | yes — release-blocking packaged smoke |
| macOS current release runner/host | universal amd64+arm64 | Packaged Wails webview and browser/OBS where available; keyboard; default and enlarged text | yes for build/start/migration, manual visual smoke may be recorded as unavailable if no host |
| Linux supported desktop | amd64 | Wails WebKitGTK and OBS CEF; keyboard/mouse; default and 150% scaling; current GPU workaround checked | yes for release candidate |
| Twitch / YouTube Live / VK / merged viewer fixture | platform-neutral canonical ids | Winner picker labels and identical XP/history result | yes — automated data/API coverage; no live connector credentials needed |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| viewer-contracts / open | POST valid title/objective/reward; read current | Trimmed active record and exactly one contract alert after commit | P0 |
| viewer-contracts / validation | Submit empty/over-limit Unicode text and unknown reward | HTTP 400, UI-safe error, no row/frame, draft preserved and first invalid field focused | P0 |
| viewer-contracts / singleton | Open twice and race two opens | One active row; loser gets 409; no duplicate announcement | P0 |
| viewer-contracts / restart | Stop after open, restart, activate Contracts | Same snapshot shown; no automatic alert replay | P0 |
| viewer-contracts / repeat | Repeat current, then repeat stale id | One fresh alert without timestamp mutation; stale request gets 409/no frame | P0 |
| reward snapshot | Open, edit/delete award, repeat and settle | Original name/points/presentation values used; missing media falls back safely | P0 |
| winner settlement | Award known Twitch, YouTube, VK, and merged canonical fixtures | Contract terminal once; exact XP in all/session/day; one award event/history row; normal award/leaderboard frames | P0 |
| duplicate/failure settlement | Race award/close and inject event/commit failure | Exactly one terminal result; loser 409; failure leaves active with no partial XP/event/frame | P0 |
| missing/hidden winner | Submit unknown and hidden merge-source ids | 404; active contract unchanged; picker clears stale selection | P0 |
| close without result | Confirm close, then retry | Active clears; no XP/event/history/alert; retry 409 | P0 |
| reward history privacy | Query global/viewer history after win | Ordinary award row only; no contract id/title/objective or new kind | P0 |
| WebSocket compatibility | Feed contract alert to all existing clients; connect after open | Alert page handles it; chat/dock/leaderboard stay unchanged; reconnect does not replay | P0 |
| protected queue | Visible command + waiting commands + contract; fill mixed/protected queues | No preemption; award/contract FIFO precedes commands; documented displacement and capacity hold | P0 |
| alert rendering | Render plain/custom/broken media, HTML-like and 280-code-point Cyrillic/Latin text | Text nodes only, readable fallback, no script execution, no empty media hole | P0 |
| themes/rectangles | Snapshot every theme in landscape, square, portrait, narrow banner; toggle reduced motion | Transparent outside chrome, no scrollbars/clipped frame, usable wrapping/clamp, static reduced-motion emphasis | P1 |
| Live UI states | Exercise loading, empty catalog/search, 400/404/409/500/network, retry and tab leave/return | Correct localized state; draft/active data retained; late requests ignored | P0 |
| keyboard/focus | Navigate four Live tabs; operate form, picker and both confirmations without pointer | Roving tab semantics, trapped modal focus, no selection-implies-submit, Cancel/Escape focus restoration | P0 |
| scaling/layout | Use approximately 700 px height and 125–150% scaling/narrow width | Scrollable dialog body, pinned actions, visible scrollbar, no unreachable control/horizontal clip | P1 |
| localization | Run i18n parity and inspect EN/RU long labels/timestamps | Catalog parity, no raw keys, controls and live announcements remain understandable | P0 |
| observability/privacy | Open/repeat/award/close/conflict/failure with debug and normal logs | Required ids/actions/levels present; no objective/chat/token/path leak; WS drops use existing counter | P0 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Run with default desktop data locations and with a temporary explicit `-config` path; confirm the existing SQLite file alone gains schema 15 and no new config/file location appears.
- Start with the data directory writable, open a contract, terminate cleanly, restart, and verify recovery. Repeat with process interruption after committed response and confirm the durable result is authoritative.
- Make a disposable database/data directory read-only or inject store failures; startup/action must fail with a wrapped error and must not recreate, truncate, or partially settle data.
- Connect multiple local WebSocket clients, stall one queue, announce a contract, and verify other clients continue while `pipeline.websocket_drops.alert` accounts for pressure.
- Confirm no native dialog, child process, external network request, connector publish, clipboard, notification, tray/menu, or new permission prompt occurs.
- Put OBS alert source offline during open, reconnect, verify no replay, then use Announce again and verify one splash.

## Persistence Migration / Corruption / Recovery

Create disposable fixtures for: fresh store; version-14 populated store with viewers/awards/history; version-15 store with active contract; catalog edit/delete after snapshot; hidden and merged viewers; equal timestamps; and custom/broken media filenames.

Automate 14→15 and fresh→15 schema assertions, unique/check/foreign-key enforcement, unchanged existing data, null `contract_id` for old events, then 15→14→15 on a copy. Run the simulated version-14 writer against the additive version-15 schema and verify its named-column award insert remains readable after returning to the new binary. Use `PRAGMA foreign_key_check` and table/index inspection. Corrupt/truncated fixtures are not repaired automatically: prove startup fails without deleting them and document backup restoration as recovery.

For settlement, compare viewer totals, period rows, contract row, event row, and reward-history output before/after both success and injected rollback. Race tests run under `-race`; repeat enough times to expose duplicate-grant or lock errors.

## Install / Upgrade / Downgrade / Packaged-App Smoke

For each available release artifact: preserve an existing data-directory copy, launch the packaged app, wait for `/health`, open Live → Contracts, open and repeat a contract, restart, award a viewer, verify Journal/leaderboard, then open and close another without result. Load `/overlay/alert` from OBS or an equivalent CEF host and inspect transparency/audio/queue. Confirm no install instructions, artifact names, desktop icon, signing warning, or Linux menu behavior changed.

On a disposable copy, launch the prior binary after migration only if compatibility tests passed; verify it starts and ordinary chat/award writes still work while contracts remain untouched. Treat schema downgrade separately and verify it removes only the new table/column after backup. Do not perform signing, notarization, publishing, or destructive testing against the operator's real data.

## Automated Commands / Manual Setup / Fixtures

Run from repository root:

```bash
npm ci
npm run lint
npm test
go test ./...
go test -race -count=1 ./...
golangci-lint run ./...
go build ./...
openspec validate viewer-contracts-experiment --strict
git diff --check
```

Add focused Go suites for migration 15, store lifecycle/atomic settlement, handler status/JSON contracts, wire payloads, hub broadcast/drop behavior, reward history, and router POST-action guards. Add Node suites for contract form/state helpers, tab markup/keyboard behavior, alert scheduling/render/media/XSS/reduced motion, i18n parity, and dock/chat ignore behavior. Extend the seed command or test-only fixtures only if needed to create duplicate-name, merged, hidden, multi-platform, and reward-history data without real connector access.

Manual setup uses a temporary data directory, development server with loose `web/`, two browser windows for conflict checks, and OBS/browser viewport presets for visual/audio smoke. Never copy real OAuth tokens or live chat text into fixtures/evidence.

## Evidence and Explicit Skips

Attach command output for all automated checks, migration fixture/version results, API/WebSocket sample envelopes with synthetic text, and screenshots for Live empty/active/picker/error states plus each theme/rectangle matrix. Record OS, architecture, webview/OBS version, scale, locale, and any unavailable matrix cell; do not imply an unrun platform passed.

Live Twitch/YouTube/VK connector sessions are explicitly skipped because the feature consumes canonical viewer rows and adds no connector behavior or scopes; synthetic platform fixtures are normative. Signing/notarization, auto-update, native notification/clipboard/tray/protocol handling, network proxy behavior, and installer changes are skipped because they are unaffected. Performance load beyond bounded concurrent lifecycle requests is not required; existing WebSocket slow-client/drop tests cover the only streaming-pressure boundary.
