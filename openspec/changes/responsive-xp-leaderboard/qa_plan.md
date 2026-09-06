# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Windows supported release target | Packaged architectures | OBS CEF, Wails WebView, 100% and 200% display scaling, mouse/keyboard | yes, P0 |
| macOS supported release target | Packaged architectures | Browser/OBS smoke, system font fallback | release smoke when runner is available, P1 |
| Linux supported release target | Packaged architectures | Browser/OBS smoke, system font fallback | release smoke when runner is available, P1 |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| Bounded composition | Render each of five themes in panel and chips layouts at 320x180, 640x360, 1280x720, and a tall narrow rectangle | Width changes one bounded scale; height adds/removes complete rows; no clipping or scrollbar | P0 |
| Fixed compatibility | Load a legacy preset and a URL with `font_size_px` | The configured/query base size stays fixed and only complete rows render | P0 |
| XP-first rows | Render long Latin/Cyrillic names with message count off and on | XP remains legible; messages are absent by default and disappear first when compact | P0 |
| Theme-owned title | Exercise theme, custom, and hidden modes in every theme/layout | At most one title exists; custom text keeps theme styling; hidden mode releases row space | P0 |
| Studio draft flow | Change sizing/title/message/cap, resize preview, switch inspector sections, then Publish | Preview updates without persistence; values survive navigation and persist only on Publish | P0 |
| Validation/accessibility | Submit blank/overlong custom title, invalid cap/font; keyboard through conditional controls at 200% zoom | Inline associated errors and focus recovery work; labels and EN/RU catalogs stay complete | P0 |
| Sample/live isolation | Open sample preview and live leaderboard while WS updates arrive | Sample stays fictitious; live view uses API/WS and transparent page | P0 |
| Reduced motion | Enable reduced motion and resize/update ranks | No continuous resize animation; any emphasis is suppressed | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- No new filesystem, native IPC, permission, tray, menu, or child-process behavior applies.
- Refresh and WebSocket reconnect MUST recalculate from the current viewport and retain the latest valid ranking snapshot.
- Simulate unavailable resize observation in a browser test or fixture and verify bounded fixed fallback without page scrolling.

## Persistence Migration / Corruption / Recovery

- Unit-test new defaults, legacy font/title presence rules, valid round trips, and invalid enums/bounds/combinations.
- Verify an invalid preset update leaves the prior `config.json` intact and no partial draft becomes baseline.
- Verify old-shaped JSON loads without rewrite and unknown additive keys remain downgrade-safe. SQLite migration/corruption testing is explicitly skipped because SQLite is unchanged.

## Install / Upgrade / Downgrade / Packaged-App Smoke

- Upgrade from a fixture without the new keys and confirm legacy custom font/title semantics plus automatic defaults elsewhere.
- Start the prior binary against a copied new config and confirm it ignores unknown keys without corrupting known preset fields; exact new rendering is not expected on downgrade.
- Smoke the packaged Wails app: open Studio, edit/publish, load the copied leaderboard URL in OBS, resize the Browser Source, restart, and confirm persistence.
- Signing, notarization, installer layout, channels, permissions, and uninstall flows are unchanged and need only the existing release checks.

## Automated Commands / Manual Setup / Fixtures

- Automated: targeted Go config/API tests, existing frontend tests if present, `go test ./...`, `golangci-lint run ./...`, `npm ci`, `npm run lint`, and the repository localization test.
- Fixtures: legacy preset with font/title, default preset with omitted fields, invalid preset payloads, long EN/RU names and titles, 0/1/3/5/20 ranking entries.
- Manual: run the local server with sample preview; capture a rectangle/theme/layout matrix in browser devtools and at least the P0 Windows OBS CEF cases.

## Evidence and Explicit Skips

Attach command output and a compact screenshot/contact sheet for the P0 rectangle matrix to the implementation change or PR. Record the exact OBS/browser versions used. Database migration, remote/network security, native dialogs, connector behavior, signing, and release publication are out of scope because the design does not change them.

## Execution Results — 2026-09-06

### Automated Linux/browser coverage

- Runtime: Go `1.26.3 linux/amd64`; Node.js `24.15.0`; npm `11.12.1`; Playwright `1.62.1`; bundled Chromium `151.0.7922.34`.
- The five themes and both layouts passed all 40 exact viewport cases at `320x180`, `640x360`, `1280x720`, and `360x640`. Assertions covered no document scrollbar, no partial visible row, at most one title, XP on every visible row, and the configured rank cap.
- Automatic width samples resolved to 12, 18, and 36 px at widths 320, 640, and 1280. Height samples fit 1, 3, and 5 complete rows at heights 120, 240, and 480. Fixed 16 px remained 16 px at widths 320 and 1280.
- Theme/custom/hidden title behavior, compact message suppression, sample/live request isolation, and the no-`ResizeObserver` fixed fallback passed scripted browser assertions.
- Studio passed draft retention across surface switching, preview-query state, conditional-field focus recovery, inline blank-title/fractional-cap/font validation, Reset-to-theme, and scroll reachability at a 720x500 CSS viewport with device scale factor 2 (1440x1000 capture).
- Evidence: [`qa-evidence/chromium-leaderboard-matrix.png`](qa-evidence/chromium-leaderboard-matrix.png) and [`qa-evidence/chromium-studio-200-percent.png`](qa-evidence/chromium-studio-200-percent.png).

### Repository and artifact checks

- `go test ./...`, `golangci-lint run ./...`, `npm ci`, `npm test`, `npm run lint`, `npm run test:i18n`, and strict OpenSpec validation passed.
- A Linux headless artifact built, started with embedded assets and a fresh config, returned `200` for `/` and `/overlay/leaderboard`, returned healthy JSON for `/health`, and shut down cleanly.
- Config/API tests cover omitted defaults, legacy font/title resolution, unchanged Publish without mode materialization, invalid atomic rejection, public round trips, and secret omission. SQLite testing remains skipped because the schema is unchanged.

### Explicit skips / remaining release gates

- The required Windows packaged-app and OBS CEF P0 matrix was not available in this Linux workspace. No OBS version can be recorded here.
- macOS browser/OBS and packaged-architecture smoke was unavailable.
- A production-tagged Linux Wails build could not complete because the runner lacks the `pkg-config` executable/WebKit build tooling, so packaged Wails launch/persistence remains unverified.
- A prior released binary was not present, so the executable downgrade smoke against copied new config remains unverified. JSON compatibility is covered by the focused current-code tests, but it is not a substitute for that release-binary check.
