# Implementation Slices

## Slice: Recognizable viewer levels and remaining social uses

> **Outcome**: Server-authoritative, configurable visual status in chat, leaderboard and Audience.
> **Acceptance**: Store/API/config tests, browser smoke and frontend checks in qa_plan.md.
> **Skills**: comm-relay-backend-golang, api-conventions, database-migrations, obs-overlay-themes, web-static-frontend, ux-form-practices, golang-tests, changelog.
> **Scope**: Existing local store/API, shared visuals, overlay, leaderboard, React Studio/Audience.
> **Allowed fallout**: Tests, fixtures, migration, locale keys, specs and changelog.
> **Blocked**: Unrelated gameplay changes, publishing, native platform expansion.

- [x] 1.1 Backend: persist allowlisted emblems, expose bounded canonical viewer status and viewer detail quotas, and verify accounting/migration behavior.
- [x] 1.2 Frontend: shared badge/ammo renderer, authoritative status refresh and isolated preview fixtures across chat, leaderboard and viewer detail.
- [x] 1.3 Configuration and forms: independent default-on switches, preset round trips, level emblem selector and localized accessible labels.
- [x] 1.4 Docs: Russian Unreleased note and canonical specification sync.

## Gate: qa
- [x] Q.1 Run gofmt, go test ./..., golangci-lint run ./..., npm ci, npm run typecheck, npm run lint, npm test, npm run build, relevant npm run test:e2e and browser matrix; record evidence.

## Gate: review
- [x] R.1 Review the final diff for stale-state races, preview isolation, bounds, accessibility and preserved gameplay; resolve critical findings.

## Gate: distribution-readiness
- [x] D.1 Verify ordinary embedded build and migration readiness without signing or publishing.
