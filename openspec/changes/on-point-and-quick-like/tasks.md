# Implementation Slices

## Slice: seed On Point and Sync

> **Outcome**: Fresh databases include award `on_point` (В точку / On Point, 20 XP). Existing databases gain `on_point` and achievement `achievement_on_point` (Синхрон / In Sync, 10 grants) once if those ids are absent. Deleted seeds stay gone. Manual grant via existing `POST /api/awards/grant` works on any identified line. Reward pickers list On Point without UI changes in this slice.
> **Acceptance**: `go test ./internal/store ./internal/api -count=1` and `go test ./internal/store -race -count=1` pass; `golangci-lint run ./internal/store ./internal/api`.
> **Skills**: `comm-relay-backend-golang`, `backend-structure`, `golang-errors`, `golang-tests`, `comm-relay-observability`
> **Scope**: `internal/store` starter awards, on-point bootstrap marker, progression achievement seed, grant/progression tests
> **Allowed fallout**: starter catalog tests, catalog list tests, progression unlock tests
> **Blocked**: dock Like icon, picker filter, overlay operator chrome, auto-grant, Goose tables, signing

- [ ] 1.1 Add `on_point` to locale starter awards (20, ping, 5000 ms, RU/EN names and splash).
- [ ] 1.2 One-time bootstrap: insert-if-absent `on_point` and `achievement_on_point`; pending locale then `1`; never rewrite or recreate after delete.
- [ ] 1.3 Tests: fresh ten-award catalog; upgrade insert; keep existing `on_point`; delete+restart; tenth grant unlocks Sync without extra XP; ru-RU vs en-GB copy.

## Slice: Streamer Like icon and stable dock actions

> **Outcome**: Live Messages and `/dock/messages` show a thumbs-up Streamer Like when catalog id `like` exists; one click grants `like`. Reward picker omits `like`. Grant success/error does not wrap Reward/Like/Delete. RU/EN copy and streamer-visible changelog.
> **Acceptance**: `npm ci` if needed; `npm test`; `npm run lint`; `npm run test:i18n`.
> **Skills**: `web-static-frontend`, `web-constrained-layout`, `ux-form-practices`, `changelog`
> **Scope**: `web/shared/reward-picker.js` + CSS, `web/admin/js/messages.js`, `web/dock/messages.js` / `messages.css`, locales, `CHANGELOG.md`
> **Allowed fallout**: reward-picker tests, dock CSS nowrap, i18n tests
> **Blocked**: second On Point icon, picker reorder, overlay buttons, hotkeys, concept/roadmap expansion

- [ ] 2.1 Prefetch awards on Live/dock load; render Like icon with aria-label when `like` exists; hide when absent or no `user_id`.
- [ ] 2.2 Like posts the same grant body as Reward with `award_id` `like`; picker lists remaining types only.
- [ ] 2.3 Move success/error out of wrapping `.message-list__actions` so the action cluster stays on one line in a narrow dock.
- [ ] 2.4 RU/EN tooltip/aria and success copy; Russian `[Unreleased]` bullets for В точку, Синхрон, quick Like, and the dock jump fix.

## Verification

```bash
go build ./...
go test ./...
go test ./internal/store ./internal/api -race -count=1
golangci-lint run ./...
npm ci
npm test
npm run test:i18n
npm run lint
openspec validate on-point-and-quick-like --strict
```

## Gate: qa
- [ ] Q.1 Execute `qa_plan.md` P0 Live + `/dock/messages` + overlay transparency; record no-wrap evidence or skip OBS packaging.

## Gate: review
- [ ] R.1 Fresh diff review; CRITICAL=0; affected checks green.

## Gate: distribution-readiness
- [ ] D.1 Confirm no installer/signing/package-layout change; `go build ./...` succeeds; `openspec validate on-point-and-quick-like --strict`.
