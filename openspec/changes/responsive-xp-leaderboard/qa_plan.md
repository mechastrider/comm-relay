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
