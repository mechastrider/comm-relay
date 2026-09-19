# Implementation Slices

## Slice: reject the same award type on one chat line

> **Outcome**: `POST /api/awards/grant` returns HTTP 409 when `(platform, message_id, award_id)` already has a durable award event. Different types on that line still succeed. Grants without `message_id` stay unrestricted. `GET /api/messages/recent` includes `granted_award_ids` when any awards exist for that source message. Duplicate grants log award id and message id without chat text.
> **Acceptance**: `go test ./internal/store ./internal/api -count=1` and `go test ./internal/store ./internal/api -race -count=1`; `golangci-lint run ./internal/store ./internal/api`.
> **Skills**: `comm-relay-backend-golang`, `api-conventions`, `golang-errors`, `golang-tests`, `comm-relay-observability`
> **Scope**: `internal/store` GrantAward, `internal/api` grant handler and recent messages
> **Allowed fallout**: store/API tests, error sentinel, recent-message JSON
> **Blocked**: Goose UNIQUE index, session XP caps, new routes, overlay buttons

- [x] 1.1 In the grant transaction, conflict when a non-empty source message already has that `award_id`; map to HTTP 409 with a UI-safe body; no XP/event/alert.
- [x] 1.2 Attach `granted_award_ids` (oldest-first unique award ids) on recent messages that have matching award events; omit when none.
- [x] 1.3 Tests: Like twice → 409; Joke then Advice both succeed; missing `message_id` allows repeats; concurrent same-type one 409; recent JSON shape.

## Slice: dock icon actions and command status glyphs

> **Outcome**: `/dock/messages` shows Like, medal Reward, and trash Delete as 28×28 icon buttons with tooltips. Live keeps labeled Reward/Delete. Granted types cannot be granted again on that row (Like dims; picker items not choosable). HTTP 409 uses already-granted copy. Accepted commands show a checkmark; frozen cooldown/rejected show a snowflake plus countdown or reason. Cluster does not wrap.
> **Acceptance**: `npm ci` if needed; `npm test`; `npm run lint`; `npm run test:i18n` if locales changed.
> **Skills**: `web-static-frontend`, `web-constrained-layout`, `ux-form-practices`
> **Scope**: `web/shared/reward-picker.js` + CSS, `web/shared/command-outcome-ui.js`, `web/dock/messages.js` / `messages.css`, `web/admin/js/messages.js`, locales
> **Allowed fallout**: node tests, dock CSS, RU/EN already-granted copy
> **Blocked**: Live icon-only Reward/Delete, overlay operator chrome, hotkeys

- [x] 2.1 Dock-only icon Reward (simple medal) and Delete (trash); Live labels unchanged; aria-label + tooltip.
- [x] 2.2 Apply `granted_award_ids` and local/409 grants: disable Like for `like`; keep Reward; mark granted picker types not choosable.
- [x] 2.3 Replace accepted text chip with a non-button checkmark; frozen rows get a snowflake plus existing compact countdown or reject label; not in tab order as a button.
- [x] 2.4 Node tests for picker granted state, dock icon markup, and check/snowflake chrome; dock ~400px nowrap.

## Slice: streamer-facing notes

> **Outcome**: Russian `[Unreleased]` bullets for uniqueness, dock icons, and check/snowflake status. Mockup may stay as planning reference.
> **Acceptance**: `CHANGELOG.md` `[Unreleased]` updated; no versioned sections rewritten.
> **Skills**: `changelog`
> **Scope**: `CHANGELOG.md`
> **Allowed fallout**: none
> **Blocked**: concept/roadmap/OQ-005 edits

- [x] 3.1 Add concise Russian Unreleased bullets for: one award type per chat line; dock medal/trash icons; checkmark vs snowflake command status.

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
openspec validate message-award-once-and-dock-icons --strict
```

## Gate: qa
- [x] Q.1 Execute `qa_plan.md` P0 Live + `/dock/messages` + overlay transparency; screenshot dock icons and check/snowflake; skip OBS packaging.

## Gate: review
- [x] R.1 Fresh diff review; CRITICAL=0; affected checks green.

## Gate: distribution-readiness
- [x] D.1 Confirm no installer/signing/package-layout change; `go build ./...` succeeds; `openspec validate message-award-once-and-dock-icons --strict`.
