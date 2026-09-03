# Implementation Slices

## Slice: Contribution is XP with silent activity

> **Outcome**: Session/day/all contribution is XP. Counted chat lines no longer add unbounded points. A configurable silent activity grant (interval + session cap) writes XP without an alert. Admin, dock, API, WebSocket, and OBS leaderboard say `xp` / XP.
> **Acceptance**: `go test ./internal/store/... ./internal/api/... ./internal/config/...`; `npm test`; `npm run test:i18n`; Settings activity save; two chat lines inside the interval add XP once; award still adds `points` to XP and alerts; leaderboard JSON has `xp` and omits `score`.
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `api-conventions`, `golang-tests`, `golang-errors`, `web-static-frontend`, `ux-form-practices`, `changelog`
> **Scope**: Goose `00003` column rename + session activity fields; config activity settings; ingest/award/merge/leaderboard JSON; admin Settings/Audience/Live; overlay leaderboard; locales.
> **Allowed fallout**: Fixtures, public config JSON, localStorage sort-key mapping, concept/roadmap wording, changelog.
> **Blocked**: Credits, levels, achievements UI, command media/templates, community awards, signing, publishing.

### Backend

- [ ] 1.1 Add Goose `00003` renaming `score` → `xp` on viewer/session/day tables and adding `activity_grants` / `last_activity_at` on `viewer_session_stats`; cover a pre-migration fixture.
- [ ] 1.2 Persist `activity_interval_seconds` (default 300), `activity_session_limit` (default 10), and `activity_xp` (default 1); ignore `points_per_message` as progress; validate integers ≥ 0; expose them on public config.
- [ ] 1.3 Ingest identified lines with +1 `message_count` only, then grant activity XP in the same transaction when eligible (first line, interval, cap, zeros disable); persist session counters across restart; no alert.
- [ ] 1.4 Switch award, merge, new-stream, list, card, and leaderboard store/API/WebSocket fields from `score` to `xp`; keep award `points` as the grant delta; append `activity` interaction events; merge sums activity counters.

### Frontend

- [ ] 1.5 Replace Settings points-per-message with labeled activity fields (EN/RU helper text: silent, per viewer, session cap); wire save/validation.
- [ ] 1.6 Relabel Audience/Live/card/dock/leaderboard Score → XP; read `xp`; treat stored sort `score` as `xp`; keep Reward `+points` copy.

### Documentation

- [ ] 1.7 Update `docs/concept.md` and `docs/roadmap.md` 6c language to XP-only windows (Credits still later); append concise Russian `[Unreleased]` bullets for XP rename, activity, and no per-message progress.

## Slice: Extra contribution award seeds

> **Outcome**: Reward pickers include Spotter, Intel, Expert, Meme, Clutch Help, and MVP on databases that lacked those ids, without rewriting Joke/Advice or resurrecting deletes.
> **Acceptance**: `go test ./internal/store/... ./internal/api/...`; catalog/picker list the new types; delete Spotter + restart does not restore it.
> **Skills**: `comm-relay`, `golang-tests`, `web-static-frontend`
> **Scope**: Same Goose `00003` seed inserts (or follow-up statements in that migration); award list JSON already generic.
> **Allowed fallout**: Seed splash strings, catalog tests.
> **Blocked**: Changing Joke/Advice values, Active as a picker type, media fields, signing, publishing.

- [ ] 2.1 Insert missing seed ids (`spotter` 25, `intel` 30, `expert` 40, `meme` 20, `clutch` 50, `mvp` 100) with `{name}`/`{points}` templates; do not update existing rows; prove delete-stays-deleted.

## Gate: qa

- [ ] Q.1 Execute `qa_plan.md`; record matrix coverage, migration fixture, and explicit skips.
- [ ] Q.2 Run `npm ci`.
- [ ] Q.3 Run `npm test`.
- [ ] Q.4 Run `npm run test:i18n`.
- [ ] Q.5 Run `npm run lint`.
- [ ] Q.6 Run `go test ./...`.
- [ ] Q.7 Run `go test -race ./internal/store/... ./internal/api/...`.
- [ ] Q.8 Run `golangci-lint run ./...`.
- [ ] Q.9 Run `go build ./...`.
- [ ] Q.10 Run `openspec validate xp-contribution-foundation --strict`.
- [ ] Q.11 Run `git diff --check`.

## Gate: review

- [ ] R.1 Fresh diff review; CRITICAL=0; affected checks green.
- [ ] R.2 Confirm no `score` on new HTTP/WS payloads, no Credits/levels, and activity never alerts.

## Gate: distribution-readiness

- [ ] D.1 Confirm existing package names; migration/rollback note is in changelog; do not sign, notarize, upload, or publish.
- [ ] D.2 Manual smoke: Settings activity, Audience XP, award grant, `/overlay/leaderboard` after reload (Windows or browser; OBS if available).
