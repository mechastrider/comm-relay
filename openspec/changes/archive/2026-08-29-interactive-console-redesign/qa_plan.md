# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Windows 11 Wails/WebView2 | amd64 | Product themes, 100% and 200% text/scale, mouse and keyboard | yes, release smoke |
| Windows 11 external Chromium/Firefox | amd64 | 1440x900, 1100x700, 390x844 emulation; mouse, keyboard, touch emulation | yes, primary browser QA |
| macOS current Wails/WebKit | universal 64-bit | 100% and increased text, mouse/trackpad and keyboard | yes, release smoke |
| Linux supported desktop Wails/WebKit | amd64 | X11 or supported desktop session, 100% and increased text, mouse and keyboard | yes, release smoke |
| Linux external Chromium/Firefox | amd64 | All target viewports, reduced motion, keyboard | yes, implementation QA |
| OBS Browser Source / supported release | release architecture | Transparent chat/leaderboard, pinned and unpinned URLs | yes, program-output smoke |

Dark/light rows are required only for themes the implementation exposes. Browser-specific font rasterization is not a failure; clipping, overlap, missing focus, inaccessible controls, or changed behavior is.

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| admin-and-dock / shell | Open `/`, visit all hash routes, use Back/Forward, reload each route | Live is default; route, active nav, and heading remain synchronized without reload loops | P0 |
| admin-design-system / accessibility | Navigate all primary controls using keyboard; inspect roles/names; open and close dialogs | Visible focus, correct tab/dialog behavior, focus restoration, no unnamed icon controls | P0 |
| admin-design-system / responsive | Capture 1440x900, 1100x700, 768x900, and 390x844 screenshots for every workspace | No overlap, clipped actions, horizontal page scroll, nested cards, or bottom-nav occlusion | P0 |
| admin-and-dock / feature inventory | Exercise every pre-redesign connection, proxy, sound, locale, diagnostics, viewer, preset, asset, data, and message action | Every implemented workflow remains reachable and functional; no mock-only action appears | P0 |
| admin-and-dock / isolation | Fail leaderboard API while messages load, then retry | Messages remain usable; leaderboard has scoped error and recovers | P0 |
| admin-and-dock / Live facts | Connect browser clients without OBS scene knowledge | UI reports connected clients only and makes no scene visibility claim | P1 |
| admin-and-dock / current statistics | Load fixtures with session/day/all counters but no samples | Supported aggregates render; no invented time-series is shown | P1 |
| Studio draft flow | Edit several appearance fields, preview, navigate away/cancel, then Publish | Live output is unchanged before Publish; dirty warning works; successful Publish clears dirty state | P0 |
| Settings save flow | Dirty one section, save it, induce validation failure, retry | No global Save; unrelated sections remain unchanged; errors focus and retain input | P0 |
| config-store / atomic activation | Persist concurrent non-overlay changes, activate valid/invalid presets, compare files | Only active ID changes on success; invalid activation changes nothing; secrets survive | P0 |
| http-api / activation | Send valid, blank, unknown, malformed, and extra-field requests | Status/body follow API spec; success returns public config and broadcasts once | P0 |
| obs-overlay / unpinned | Load chat and leaderboard without `preset`, activate another preset | Both apply the active preset without URL replacement | P0 |
| obs-overlay / pinned | Load sources with a valid `preset`, activate another preset | Pinned sources retain the URL-selected preset | P0 |
| Studio source copy | Copy primary and pinned URLs; deny clipboard permission | Primary omits `preset`; pinned includes it; denial leaves selectable URL and reports failure | P0 |
| localization | Switch RU/EN and inspect shell, tabs, forms, errors, empty states, dock | No missing keys or mixed-language chrome; time remains 24-hour | P1 |
| reduced motion / zoom | Enable reduced motion and 200% zoom; repeat navigation and save flows | State remains visible, animation is nonessential, controls/text do not overlap | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Start headless and Wails builds with a temporary config directory; verify the redesign writes no unexpected file or browser secret cache.
- Make `config.json` read-only, attempt activation and Settings save, then restore permission and retry. Both failures must be explicit and must not claim persistence.
- Stop and restart the server while the browser is open. Shell state may remain visible as stale, WebSocket/polls reconnect, and authoritative data refreshes without a page crash.
- Open two admin clients. Save a cold setting in client A, then activate a preset in client B. Client A's saved value and stored secrets must remain intact; both receive the activation broadcast.
- Deny clipboard access in a browser context. URL text stays visible and no native permission loop occurs.
- Sleep/wake smoke on one Wails platform verifies reconnect behavior; no power-management assertion is required.

## Persistence Migration / Corruption / Recovery

No migration is expected. Tests must assert Goose schema version and `config.json` structure are unchanged by the implementation.

- Load representative legacy-defaulted, current multi-preset, secret-bearing, and asset-bearing configs; activate a preset and deep-compare all fields except active ID.
- Use an unknown active ID request and a forced write failure; confirm both in-memory and on-disk authoritative config remain at the prior valid state.
- Open existing viewer SQLite fixtures with sessions, merges, and leaderboard rows; render Audience/Live without database writes caused by viewing.
- Start with corrupt JSON and corrupt/unopenable SQLite using existing recovery expectations. The redesigned UI does not silently reset either store.
- Downgrade smoke loads the post-redesign files with the previous release; no conversion or cleanup step is needed.

## Install / Upgrade / Downgrade / Packaged-App Smoke

For each release artifact in `distribution_plan.md`:

1. Launch with an existing configuration and viewer database copied from the prior release.
2. Verify the health endpoint and all four admin workspaces.
3. Activate a preset, Publish one harmless appearance edit, Save one cold setting, and restart.
4. Verify persistence, secret-presence indicators, viewer data, and both pinned/unpinned source URLs.
5. Open chat overlay, leaderboard, and messages dock in the available browser/OBS environment.
6. Replace the app with the previous release and confirm it reads the same data.

The package smoke must use packaged/embedded static assets, not a repository `web` directory, so missing CSS/JS files are detected.

## Automated Commands / Manual Setup / Fixtures

Required automated commands:

```bash
go test ./...
go test -race ./...
golangci-lint run ./...
npm ci
npm run lint
npm test
go build ./...
```

Add focused Go tests for the config mutation, handler error mapping, secret omission, broadcast, route guard, and static asset serving. Add dependency-free Node tests for route parsing, source URL construction, draft composition/dirty comparison, and locale parity where logic can be extracted into pure modules.

Browser smoke uses a temporary config plus deterministic fixtures: disconnected/all-connected connector states, recent messages with and without stable IDs, zero/populated viewer rows, session/day/all leaderboard data, multiple presets, an uploaded asset, validation errors, slow responses, and forced endpoint failure. Manual OBS smoke sends sample messages so transparency, queue limits, and preset updates are visible.

## Evidence and Explicit Skips

Retain command logs, focused test names, and screenshots for each workspace at 1440x900, 1100x700, and 390x844 in both RU and EN for the final review; include OBS captures for pinned/unpinned chat and leaderboard. Record the packaged artifacts and OS versions actually exercised.

Explicit skips:

- Signing, notarization, installer, auto-update, and store testing: unchanged and not authorized.
- Native mobile, global shortcut, OS notification, deep-link, and multiwindow testing: no such behavior is added.
- OBS scene visibility/control: excluded because there is no OBS WebSocket integration.
- Historical analytics accuracy: excluded because no historical series is introduced; current aggregate rendering is covered.
- New database migration performance: no migration or schema change exists.
