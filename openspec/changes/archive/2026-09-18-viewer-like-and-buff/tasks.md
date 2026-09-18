# Implementation Slices

## Slice: infra — social catalog persistence and policy

> **Outcome**: Goose migration adds command `like`/`buff` fields, level quotas, buff event columns, and config cap defaults. Bootstrap inserts missing `viewer_like`, `like`/`buff` commands, and three achievements without colliding with existing triggers.
> **Acceptance**: `go test ./internal/store ./internal/config ./internal/api -count=1` and `go test ./internal/store ./internal/config -race -count=1` pass; `golangci-lint run ./internal/store ./internal/config ./internal/api`.
> **Skills**: `comm-relay-backend-golang`, `backend-structure`, `api-conventions`, `database-migrations`, `golang-errors`, `golang-tests`, `golang-validation`
> **Scope**: next Goose migration after `00020`, `commands.go`, `progression.go`, `interaction_events.go`, starter catalog, `config` public fields, commands/levels handlers
> **Allowed fallout**: store tests, config defaults tests, router guard still green
> **Blocked**: matcher remainder, ingest grants, admin UI, overlay chrome

- [x] 1.1 Add migration: `commands.points` / `award_id`, expanded `action`, `progression_levels` quotas, `interaction_events.kind` `buff` plus recipient/parent columns and indexes.
- [x] 1.2 Validate like/buff pairing on create/update; GET/POST JSON includes `action`, `points`, `award_id`; HTTP 400 field errors.
- [x] 1.3 Additive config `buffs_per_award_per_viewer` (1) and `buff_max_unique_viewers` (5); reject negatives; public GET/update.
- [x] 1.4 Level JSON `like_quota` / `buff_quota` 0–100; seed 1…5 on starter rows in the migration.
- [x] 1.5 One-time social bootstrap: `viewer_like` award, `like`/`buff` commands (skip colliding triggers), achievements `cheerleader` / `chat_favorite` / `copilot`.
- [x] 1.6 Tests: migrate from 00020 fixture; collision skip; config omit defaults; invalid action pairing.

## Slice: domain-api — resolve, like, buff, reject

> **Outcome**: Ingest parses social remainder, resolves nicks, applies self/quota/caps, grants likes, buffs operator awards, publishes `command_outcome` `rejected` reasons, and logs without chat bodies. Non-social extra words stay ordinary chat.
> **Acceptance**: `go test ./internal/command ./internal/store ./internal/api -count=1` and `go test ./internal/command ./internal/api ./internal/store -race -count=1` pass; `golangci-lint run ./internal/command ./internal/store ./internal/api`.
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `comm-relay-observability`, `golang-logging`, `golang-errors`, `golang-tests`
> **Scope**: `internal/command` parse/lookup, nick resolver, ingest social path, award grant reuse, outcome map, WS `reason`, diagnostics counters
> **Allowed fallout**: fire tests, interaction event tests, progression tests for command/award metrics
> **Blocked**: admin editor markup, overlay CSS beyond consuming new status, platform chat send

- [x] 2.1 Parse first bang token + remainder; social actions match remainder; `alert`/`show_leaderboard` extra words remain ordinary chat; typo still unique on token only.
- [x] 2.2 Nick pipeline: session-active pool, normalize, exact, unique same-platform exact, Damerau ≤ 1 when length ≥ 4; `not_found` / `ambiguous`.
- [x] 2.3 Like: required nick, bound award grant to recipient, giver command event, no giver XP, `missing_arg` / `self` / `quota`.
- [x] 2.4 Buff: latest operator award (optional nick), XP + `buff` event, not a second original award id, `no_award` / `self` / `already_buffed` / `award_full` without consuming quota; 0 unique cap disables buffing.
- [x] 2.5 Session quotas from current level; persist via events; New stream resets; process restart keeps remaining uses.
- [x] 2.6 `command_outcome` `rejected` + `reason` / `reason_label`; overlay freeze shares cooldown flag; Info logs trigger/reason/ids only.
- [x] 2.7 Tests for every reason, same-platform exception, concurrent cap, like journal, buff not inflating spotter count, `!gg alice` ordinary.

## Slice: webapp — operator UI, overlay chrome, changelog

> **Outcome**: Command editor Like/Buff fields, Settings caps, level quotas, rejected chat chrome in admin/dock/overlay, RU/EN copy, streamer-visible changelog.
> **Acceptance**: `npm ci` if needed; `npm test`; `npm run lint`; `npm run test:i18n`.
> **Skills**: `web-static-frontend`, `web-constrained-layout`, `ux-form-practices`, `changelog`
> **Scope**: `web/admin` commands/settings/progression, `web/dock/messages.js`, `web/overlay` cooldown overlay, `web/shared/command-outcome-ui.js`, locales, `CHANGELOG.md`
> **Allowed fallout**: i18n tests, overlay command tests
> **Blocked**: nick autocomplete, buff splash designer, docs/concept expansion, Community Awards

- [x] 3.1 Command editor actions Like/Buff; award select and points; hide splash; field errors; constrained scroll.
- [x] 3.2 Settings cap fields and level quota fields; RU/EN labels/helpers.
- [x] 3.3 Rejected frozen chrome + reason label (уточни/clarify); overlay 5 s; hide flag shared with cooldown.
- [x] 3.4 Russian `[Unreleased]` bullets for viewer like/buff, quotas, and caps (streamer-visible).

## Verification

```bash
go test ./internal/store ./internal/command ./internal/api -count=1
go test ./... -race -count=1
go build ./...
golangci-lint run ./...
npm ci
npm test
npm run test:i18n
npm run lint
openspec validate viewer-like-and-buff --strict
```

## Gate: qa
- [x] Q.1 Execute `qa_plan.md` P0 admin + overlay/dock scenarios in Chromium; record evidence or explicit skip for OBS/packaged desktop.

## Gate: review
- [x] R.1 Fresh diff review; CRITICAL=0; affected checks green.

## Gate: distribution-readiness
- [x] D.1 Confirm no installer/signing/package-layout change; `go build ./...` succeeds; `openspec validate viewer-like-and-buff --strict`.
