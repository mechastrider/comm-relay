# Implementation Slices

## Slice: Operator reward terminology and command audio

> **Outcome**: Clear viewer reward labels and optional command audio throughout the app, enabled by default.
> **Acceptance**: Fresh/legacy config enables audio; saved false persists; live clips/tones play with correct volume; disable and shutdown cancel playback.
> **Skills**: comm-relay, comm-relay-backend-golang, golang-tests, ux-form-practices, web-static-frontend
> **Scope**: Go config, React runtime/settings, shared locales, alert media/scheduling helpers
> **Allowed fallout**: tests, config compatibility, docs
> **Blocked**: unrelated features, native audio routing, signing, publishing

### Backend
- [x] 1.1 Add default-enabled config preference with omitted-update preservation and fresh/upgrade/false round-trip tests.

### Frontend
- [x] 1.2 Add settings checkbox, localized help, types/serialization, and save regression coverage.
- [x] 1.3 Add a global command audio consumer, existing scheduler/media reuse, source filtering, cancellation, and autoplay recovery.
- [x] 1.4 Verify audio media choice, volume/silence, burst ordering, disable races, reconnect, and navigation lifecycle.
- [x] 1.5 Rename visible Contracts terminology consistently in RU/EN and check existing reward flows.

## Slice: Top-aligned leaderboard

> **Outcome**: Ranking starts at the top of every OBS rectangle.
> **Acceptance**: All themes and panel/chips layouts preserve top anchoring, transparency, and complete-row fitting.
> **Skills**: obs-overlay-themes, web-static-frontend
> **Scope**: Leaderboard CSS and relevant regression coverage
> **Allowed fallout**: fitting tests, preview fixtures
> **Blocked**: ranking rules, visibility redesign, new themes

### Frontend
- [x] 2.1 Change alignment and verify theme overrides across live/sample layouts and viewport shapes.

### Docs
- [x] 3.1 Update Russian Unreleased notes and sync delta requirements into canonical specs after implementation.

## Gate: qa

### Verification
- [x] Q.1 Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and relevant `npm run test:e2e -- --grep <focused-pattern>`; record results in qa_plan.md.
- [ ] Q.2 Run `gofmt` on touched Go files, `go test ./...`, `golangci-lint run ./...`, and `git diff --check`.
- [ ] Q.3 Verify desktop/browser audio and leaderboard geometry per qa_plan.md; record unavailable checks honestly.

## Gate: review
- [x] R.1 Review fresh diff for compatibility, lifecycle cancellation, scope, and complete requirement coverage; resolve critical findings.

## Gate: distribution-readiness
- [x] D.1 Validate existing build/package readiness without signing or publishing.

Implementation and automated browser verification are complete. Q.2 remains open because the full Go suite intermittently fails Windows temporary-directory cleanup; targeted config/API checks and rebuilt Go lint pass. Q.3 remains open for manual Wails/OBS listening. See qa_plan.md for exact results and environment limitations.
