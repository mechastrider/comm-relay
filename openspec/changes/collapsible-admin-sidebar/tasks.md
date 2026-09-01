## 1. Frontend

- [x] 1.1 Add consistent decorative SVG icons, localized label spans, and an accessible collapse/expand button to the desktop sidebar markup; verify all five existing `data-workspace-nav` destinations and hashes remain unchanged and the bottom-navigation markup is unaffected.
- [x] 1.2 Add a focused sidebar controller and startup bootstrap for validated local preference restoration, state toggling, persistence failure fallback, and synchronized `aria-expanded`/label/tooltip values; verify pure state/storage helpers with a new Node test included in `npm test`.
- [x] 1.3 Add token-backed expanded and compact sidebar styles, icon alignment, active/focus/hover states, tooltip positioning, and reduced-motion behavior; smoke-check that the compact target remains at least 44 px and that the `<1024px` bottom navigation still replaces the sidebar.
- [x] 1.4 Add matching Russian and English strings for collapse/expand controls and tooltips; run `npm run test:i18n` to verify catalog parity.

## 2. Docs and Product Contract

- [x] 2.1 Add or refine one concise Russian `[Unreleased]` changelog bullet describing the icon sidebar and recovered workspace width; verify all existing versioned sections remain unchanged.
- [x] 2.2 Keep the `admin-design-system` delta accurate after implementation and verify `openspec validate collapsible-admin-sidebar --strict` succeeds before sync/archive.

## 3. Verification

- [x] 3.1 Run `npm ci` if dependencies are not installed, then run `npm run lint && npm test`; verify there are no undefined browser identifiers, locale mismatches, or sidebar helper regressions.
- [x] 3.2 Make the config save-failure fixture and desktop-entry `Exec` expectation portable on Windows; verify both previously failing tests pass in isolation without changing production behavior.
- [x] 3.3 Run `go test ./...` and `golangci-lint run ./...`; verify the embedded static-admin delivery and repository-wide checks remain green.
- [x] 3.4 Smoke-check the admin in RU and EN at 1440x900, 1024x700, and 390x844: toggle with pointer and keyboard, reload both states, navigate every workspace, inspect active/focus/tooltip states, simulate unavailable storage, enable reduced motion, and verify no overlap, clipping, horizontal page scroll, or bottom-navigation regression.
- [x] 3.5 Review `git diff --check` and `git diff --stat`; verify only sidebar-related product files, the two authorized portability test fixes, the OpenSpec change, and the intended `[Unreleased]` line changed, while the pre-existing `go.mod` edit remains untouched.
