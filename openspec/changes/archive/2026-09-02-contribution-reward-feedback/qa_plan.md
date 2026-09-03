# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Linux CI/headless browser smoke | amd64 | All themes; keyboard; reduced motion; 100% and 150% browser zoom | yes, P0 |
| Windows 11 packaged Wails + OBS | amd64 | Default plus one panel and one popup theme; mouse/keyboard; 100%/150% display scaling | yes before release, P0 |
| Linux packaged Wails + OBS when Browser Source/dock are available | amd64 | Default plus one HUD theme; X11/Wayland limitation documented | yes before release where supported, P1 |
| macOS packaged Wails/browser | universal | Admin/config/API smoke; OBS smoke when available | yes before release, P1 |

Theme-focused browser/OBS coverage SHALL include `default`, `dashboard`, `cockpit_panel`, `cockpit_popups`, and `g_rebels_popups`; leaderboard checks include both `panel` and `chips`.

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| operator-rewards / API | Grant with id and short Cyrillic quote | Score/event succeed; alert contains name, points, exact reference, bounded text | P0 |
| operator-rewards / bounds | Grant text over 280 code points with emoji near boundary | Valid UTF-8 truncation; no request failure or broken glyph | P0 |
| operator-rewards / fallback | Grant with viewer identity but no message id/text | Score and alert succeed; no chat highlight fields | P0 |
| interaction-events / privacy | Inspect store event/schema and captured logs after quoted grant and restart | Platform/id persist; quote does not exist in DB/logs/config/diagnostics | P0 |
| websocket-feed / compatibility | Decode command and award frames with old-field-only fixture and new fixture | Optional fields do not break consumers; command has no award context | P0 |
| obs-overlay / exact match | Show same user with two messages, reward one exact id | Only selected visible row highlights for 2.5s; no layout shift | P0 |
| obs-overlay / missing row | Reward a row after TTL/removal | No row is restored or guessed | P0 |
| overlay-alerts / priority | Show command A; queue commands B/C; grant award D | A completes, D shows, then non-expired commands in FIFO order | P0 |
| overlay-alerts / expiry | Hold command pending past 10s | Command never renders or plays sound | P0 |
| overlay-alerts / cap | Fill 20 pending awards, then command; separately fill mixed queue then award | Command cannot displace award; new award displaces oldest command first | P0 |
| overlay-alerts / variants | Preview/live award with long quote, no quote, missing/broken avatar, silence, each built-in sound | Award hierarchy remains readable; no empty quote slot; queue advances after audio failure | P0 |
| admin-and-dock / success | Grant from admin and constrained OBS dock | Picker busy state prevents duplicate; success visible and announced; focus returns | P0 |
| admin-and-dock / error | Force HTTP 400/500/network failure | No false success; retry works without reload | P0 |
| live ranking | Select session/day/all and inject matching/nonmatching frames | Only matching period renders; HTTP recovery and manual Refresh remain | P0 |
| live Statistics | Burst multiple leaderboard frames while active/hidden | At most one refresh per second when active; refresh on open when hidden | P0 |
| config-store / opacity | Round-trip 0, 0.35, 1 independently for three surfaces | Exact values preserved; invalid values reject atomically | P0 |
| legacy config | Load a normal preset with only shared opacity and each cockpit theme with shared zero; preview all surfaces and publish without edits | Normal surfaces retain shared opacity; cockpit surfaces retain historical glass; no override is materialized | P0 |
| explicit cockpit opacity | Set one cockpit surface to 0, 0.35, and 1 while the other surfaces remain omitted | The edited surface follows the explicit value and omitted surfaces retain historical glass | P0 |
| OBS transparency | Check opacity 0/0.35/1 on all surfaces | Only chrome changes; page, text, avatars, emotes stay unaffected | P0 |
| catalogs / selection | Select, hover away, save error, delete selected using keyboard | Selected state remains distinct; focus recovery is predictable | P1 |
| Live toolbar | Check New stream at desktop/narrow widths and cancel/confirm | Alignment fixed; confirmation and reset semantics unchanged | P1 |
| accessibility | Keyboard picker/catalog/opacity flows; inspect live regions and reduced motion | No focus trap/loss; non-color meaning; static reduced-motion emphasis | P0 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Start with a copied legacy `config.json`, publish per-surface values, restart, and confirm values and unrelated secrets/settings survive.
- Connect chat, leaderboard, alert, admin, and dock clients to one `/ws`; verify each ignores unrelated frames and one slow/reloaded client does not stall others.
- Reload `/overlay/alert` during a visible item: it starts empty and does not replay. Reload `/overlay` during/after highlight: recent-message restore follows existing behavior and does not invent a reward highlight.
- Restart the server while Live Leaderboard is open: stale rows remain understandable, reconnect occurs, and HTTP/current frames reconcile.
- Suspend/resume or background the browser long enough for command expiry: overdue commands do not play on resume.
- Denied audio autoplay yields visual-only alerts and does not block scheduling. No filesystem, camera, microphone, elevation, firewall, or native notification permission scenario is required.

## Persistence Migration / Corruption / Recovery

- Unit-test omitted, explicit, and malformed surface opacity on config load/update; malformed operator updates fail without replacing the last valid file.
- Confirm no Goose migration file is added and `interaction_events` columns remain unchanged.
- Verify backup/restore of the existing config directory preserves new surface fields and old SQLite data.
- Downgrade smoke: run/read the updated config with the previous binary where practical; shared opacity remains available and unknown additive fields do not prevent startup.
- Corrupt-config recovery follows existing behavior; no special queue/quote cleanup exists because all such state is memory-only.

## Install / Upgrade / Downgrade / Packaged-App Smoke

- Build the existing Windows amd64, macOS universal, and Linux amd64 packages through the release workflow or equivalent Wails commands; compare artifact names/content with the prior release shape.
- Upgrade a package over a user-data copy containing multiple custom presets, commands, awards, and viewer events. Confirm no reset/reseed and no OBS URL changes.
- In packaged Wails, grant an award and verify admin success/live ranking. In OBS CEF, verify chat highlight, award-priority alert, sound fallback, and independent opacity.
- Restore the prior binary and confirm startup, existing score/interaction data, and shared-opacity fallback; no database restore should be necessary.

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
openspec validate contribution-reward-feedback --strict
git diff --check
```

Add focused fixtures/tests for:

- Unicode quote truncation and absence from durable/logged values;
- alert lane insertion, selection, expiry, and all capacity branches using a fake clock;
- exact message-reference matching and repeated highlight timer reset;
- latest leaderboard snapshot per period plus Statistics debounce/cancellation;
- legacy/shared opacity, historical cockpit glass, explicit cockpit zero, and per-surface normalization/round-trip;
- English/Russian catalog parity and Studio markup bindings.

Manual OBS setup uses one chat, one leaderboard, and one alert Browser Source against the same local server, plus the message dock. Feed synthetic short/long Latin and Cyrillic messages, missing/stable ids, missing/broken avatars, rapid commands, and operator awards.

## Evidence and Explicit Skips

Required evidence: automated command output, config before/after excerpts without secrets, API/WebSocket fixture assertions, screenshots or short captures for every theme's award/highlight at representative opacity, queue timing log using fake time, and packaged Windows OBS smoke notes.

Explicit skips:

- No database migration load/performance test because SQLite schema is unchanged.
- No connector-specific network test beyond stable/missing normalized ids because connectors are unchanged.
- No installer, signing, notarization, tray, protocol-handler, media-file, cloud, or OBS scene-control test because those areas are out of scope.
- Real-stream validation of the 10-second command budget is follow-up evidence; it does not replace the deterministic P0 scheduler tests.
