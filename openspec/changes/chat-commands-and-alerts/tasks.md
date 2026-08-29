# Implementation Slices

## Slice: Catalogs and seeds

> **Outcome**: Operator can list, create, update, and delete chat commands and award types; fresh DB has deletable `gg`/`hi` and Joke/Advice.
> **Acceptance**: `go test` store/API for CRUD, unique trigger, seed-once; admin Audience shows two lists.
> **Skills**: `backend-structure`, `api-conventions`, `golang-tests`, `web-static-frontend`, `ux-form-practices`, `web-constrained-layout`
> **Scope**: Goose `00002`, store mutex APIs, POST/GET command and award routes, Audience UI, i18n
> **Allowed fallout**: router guard tests, public JSON unchanged except later hide flag
> **Blocked**: matcher, overlay, grants, signing

### Backend
- [ ] 1.1 Goose migration: `commands`, `award_types`, nullable media columns, seed four rows
- [ ] 1.2 Store CRUD with unique trigger, points ≥ 1, cooldown ≥ 0; delete does not resurrect on reopen
- [ ] 1.3 HTTP `GET /api/commands`, `GET /api/awards`, POST create/update/delete; router guard

### Frontend
- [ ] 1.4 Audience Commands and Awards editors (list + form, confirm delete, empty state)
- [ ] 1.5 RU/EN strings; `npm run test:i18n`

## Slice: Commands fire queued alerts

> **Outcome**: `!gg` / `!hi` (trim, lower, whole line) enqueue a themed splash; cooldown per viewer; overlay hide flag; commands do not change score.
> **Acceptance**: matcher tests; `/overlay/alert` transparent; hide hides overlay only; `go test ./... -race` on ingest
> **Skills**: `comm-relay`, `runnable-background-processes`, `obs-overlay-themes`, `golang-logging`, `web-static-frontend`
> **Scope**: ingest runnable, config `hide_command_messages`, `web/alert/`, `/ws` `alert`, Studio Alerts card, chat overlay `is_command`
> **Allowed fallout**: overlay theme CSS for alert surface, OBS copy URL
> **Blocked**: awards, achievements, media upload

### Backend
- [ ] 2.1 Config `hide_command_messages` default false; public config + overlay_settings
- [ ] 2.2 Matcher + in-memory cooldown; tag `is_command`; never adjust score; enqueue alert; skip unknown/`gg` without bang
- [ ] 2.3 Serve `/overlay/alert` before `/overlay/`; handler tests

### Frontend
- [ ] 2.4 Alert page: FIFO queue cap 20, avatar + text node + built-in tones, reconnect, no replay, all themes, sample preview
- [ ] 2.5 Chat overlay skips `is_command` when hide is on; Settings checkbox; Studio enables Alerts URL (follow + pinned)

## Slice: Operator rewards from messages

> **Outcome**: Reward picker on admin Live and dock grants Joke/Advice; score + leaderboard update; duplicate grants allowed; no Reward without `user_id`.
> **Acceptance**: grant API tests; dock + admin picker; leaderboard score moves
> **Skills**: `comm-relay`, `api-conventions`, `web-constrained-layout`, `ux-form-practices`
> **Scope**: `POST /api/awards/grant`, score periods, `web/admin` messages, `web/dock/messages.js`
> **Allowed fallout**: coalesced leaderboard snapshot (existing path)
> **Blocked**: forbidding double-reward, catalog in dock

### Backend
- [ ] 3.1 Grant: resolve identity, add points to three periods, alert with `{name}`/`{points}`, 400 on empty user_id / unknown award

### Frontend
- [ ] 3.2 Reward control + picker (progress, empty catalog copy, Escape/focus); dock constrained layout
- [ ] 3.3 Hide Reward when `user_id` missing; keep Delete rules unchanged

## Slice: Interaction event log

> **Outcome**: Successful command fires and grants persist; cooldown skips do not; merge rewrites `viewer_id`.
> **Acceptance**: store tests for insert + merge rewrite; no admin event UI
> **Skills**: `golang-tests`, `golang-errors`
> **Scope**: `interaction_events`, merge transaction
> **Allowed fallout**: none
> **Blocked**: achievements UI, GET events API unless needed by tests

### Backend
- [ ] 4.1 Append events on fire/grant; omit chat body
- [ ] 4.2 Merge transaction updates `interaction_events.viewer_id` from source to target

## Docs

- [ ] 5.1 CHANGELOG `[Unreleased]` Russian streamer bullets (commands, banners, Reward, hide, seeds)
- [ ] 5.2 README RU/EN: `/overlay/alert`, OBS audio, dock Reward, hide setting
- [ ] 5.3 `docs/roadmap.md` / `docs/concept.md`: 6b mechanism (two catalogs, alerts, awards, event log); keep achievements later
- [ ] 5.4 Extend `obs-overlay-themes` skill: alert is an on-stream surface

## Gate: qa
- [ ] Q.1 Execute `qa_plan.md` automated commands and P0 manual smokes

## Gate: review
- [ ] R.1 Fresh diff review; CRITICAL=0; affected checks green

## Gate: distribution-readiness
- [ ] D.1 `go build ./...`; note OBS source + audio; no signing/publish

## Verification

- `go test ./...`
- `go test ./... -race`
- `golangci-lint run ./...`
- `npm ci` if needed, then `npm run lint`, `npm test`, `npm run test:i18n`
