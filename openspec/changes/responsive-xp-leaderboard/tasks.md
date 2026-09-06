# Implementation Slices

## Slice: `Persist a backward-compatible leaderboard presentation`

> **Outcome**: Presets and public config resolve automatic/fixed sizing, theme/custom/hidden titles, optional message count, and rank cap without rewriting legacy intent.
> **Acceptance**: `go test ./internal/config ./internal/api`
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `golang-tests`, `api-conventions`
> **Scope**: `internal/config`, config/public API fixtures, preset defaults and merge rules
> **Allowed fallout**: API fixtures, validation-field mappings, test helpers
> **Blocked**: visibility policy, ranking rules, SQLite, unrelated preset fields

- [ ] 1.1 Add the leaderboard presentation fields and presence-aware default/legacy resolution to config and public DTOs.
- [ ] 1.2 Add field validation for sizing/title modes, custom title, message flag, and bounds while preserving alert and opacity semantics.
- [ ] 1.3 Cover fresh defaults, legacy font/title cases, round trips, unchanged Publish, invalid values, and secret omission with focused Go tests.

## Slice: `Render a rectangle-responsive XP leaderboard`

> **Outcome**: Every leaderboard theme/layout scales as one composition from width and fits only complete rows from height, with XP primary and messages optional.
> **Acceptance**: `npm test` plus the P0 rectangle smoke matrix in `qa_plan.md`
> **Skills**: `obs-overlay-themes`, `web-static-frontend`
> **Scope**: `web/leaderboard`, shared overlay-setting resolution, frontend unit fixtures
> **Allowed fallout**: semantic leaderboard markup, CSS variables, theme selectors, pure fit helpers and tests
> **Blocked**: ranking data shape/order, visibility animation/controller, chat/alert redesign

- [ ] 2.1 Introduce a pure bounded fit calculation and coalesced resize lifecycle with deterministic fixed fallback and complete-row clipping.
- [ ] 2.2 Refactor leaderboard markup/CSS so text, avatars, gaps, padding, borders, and chrome derive from one scale across all five themes and both layouts.
- [ ] 2.3 Replace generated/duplicate headings with one theme-owned title slot implementing theme, custom, and hidden modes.
- [ ] 2.4 Redesign rows around prominent labelled XP, optional secondary message count, long-name truncation, and compact suppression priority.
- [ ] 2.5 Add frontend tests for scale bounds, fit thresholds/hysteresis, title resolution, query compatibility, sample isolation, and message-count suppression.

## Slice: `Configure composition visually in Studio`

> **Outcome**: Operators can preview and publish responsive sizing, themed title behavior, message visibility, and a maximum row cap without pixel guesswork.
> **Acceptance**: `npm test` and keyboard/200% zoom smoke
> **Skills**: `web-static-frontend`, `ux-form-practices`, `obs-overlay-themes`
> **Scope**: Studio leaderboard inspector, preview URL/state helpers, EN/RU catalogs
> **Allowed fallout**: admin markup/styles, pure helper tests, preview fixtures
> **Blocked**: a global Save flow, dock controls, new theme, unrelated Studio surfaces

- [ ] 3.1 Add Automatic/Fixed, From theme/Custom/Hidden, Show messages, and maximum-ranks controls with conditional accessible fields.
- [ ] 3.2 Carry draft values through preview, section/theme switching, Reset-to-theme, Publish, and failed-save recovery without materializing untouched legacy defaults.
- [ ] 3.3 Add localized labels/help/errors and frontend tests for normalization, conditional focus, preview URL state, and EN/RU parity.

## Slice: `Document and release the new sizing model`

> **Outcome**: Streamers understand that Browser Source width sets scale, height sets visible rows, and fixed font size is a compatibility/manual mode.
> **Acceptance**: README links/URLs smoke-tested; `[Unreleased]` contains one coherent Russian leaderboard entry
> **Skills**: `changelog`, `comm-relay`
> **Scope**: `README.md`, `README.en.md`, `CHANGELOG.md`
> **Allowed fallout**: OBS setup and Studio field wording
> **Blocked**: release versioning, roadmap promises, signing or publishing

- [ ] 4.1 Update Russian and English OBS/Studio documentation, including title modes, XP/message hierarchy, sizing examples, and transform-vs-viewport troubleshooting.
- [ ] 4.2 Refine the existing Russian `[Unreleased]` leaderboard bullet without rewriting released sections.

## Gate: verification

- [ ] V.1 Run `gofmt` and `goimports` on touched Go files.
- [ ] V.2 Run `go test ./...`.
- [ ] V.3 Run `golangci-lint run ./...`.
- [ ] V.4 Run `npm ci`, `npm test`, `npm run lint`, and `npm run test:i18n`.
- [ ] V.5 Run `openspec validate responsive-xp-leaderboard --strict` and confirm the implementation diff matches the delta specs.

## Gate: qa

- [ ] Q.1 Execute `qa_plan.md`; record platform/rectangle coverage, exact runtime versions, and screenshot evidence.

## Gate: review

- [ ] R.1 Obtain a fresh diff review; resolve every CRITICAL finding and rerun affected checks.

## Gate: distribution-readiness

- [ ] D.1 Smoke existing headless/Wails artifacts and upgrade/downgrade fixtures without signing, notarizing, uploading, or publishing.
