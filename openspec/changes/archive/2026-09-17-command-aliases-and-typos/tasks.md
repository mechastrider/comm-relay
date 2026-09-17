# Implementation Slices

## Slice: infra — persist unique command aliases

> **Outcome**: Goose `00020` adds `command_aliases`. Create/update/delete and `GET /api/commands` round-trip `aliases`. Collisions on trigger or alias fail with HTTP 400 field errors. Pack YAML `aliases` apply with the same rules. Matching behavior is unchanged in this slice except exact canonical trigger (aliases stored but Lookup not yet extended).
> **Acceptance**: `go test ./internal/store ./internal/api ./internal/packimport -count=1` and `go test ./internal/store ./internal/api -race -count=1` pass; `golangci-lint run ./internal/store ./internal/api ./internal/packimport`.
> **Skills**: `comm-relay-backend-golang`, `backend-structure`, `api-conventions`, `database-migrations`, `golang-errors`, `golang-tests`
> **Scope**: `internal/store/migrations/00020_command_aliases.sql`, `commands.go` / types, `commands_handler.go`, packimport schema/apply, migration test
> **Allowed fallout**: store sentinels, catalogs handler tests, packimport tests, router guard still green
> **Blocked**: matcher fuzzy/alias lookup, admin UI, changelog, overlay/dock markup

- [x] 1.1 Add Goose `00020_command_aliases.sql` (table + UNIQUE alias + ON DELETE CASCADE) and migration round-trip test from 19.
- [x] 1.2 Load/replace `Command.Aliases` in list/get/create/update/delete; validate slug, cap 16, no self-trigger, uniqueness vs all triggers and aliases; map unique failures to field-ready sentinels.
- [x] 1.3 Expose `aliases` on GET/create/update JSON; omitted means `[]`; `DisallowUnknownFields` stays; 400 on `aliases` or `trigger` as specified.
- [x] 1.4 Pack YAML optional `aliases`; apply uses the same validators; invalid pack does not write a partial command.
- [x] 1.5 Tests: empty after migrate; round-trip; cascade delete; collisions; cap; omit field; pack import success/fail.

## Slice: domain-api — alias and unique-typo matching

> **Outcome**: `Lookup` matches enabled exact trigger or alias, then unique Damerau-Levenshtein ≤ 1 for commands whose canonical trigger length is ≥ 4. Cooldown, `is_command`, interaction events, alerts, and `command_outcome.trigger` stay canonical. Short seeds and ambiguous neighbors stay ordinary chat. Debug logs cover fuzzy hits and ambiguous skips.
> **Acceptance**: `go test ./internal/command ./internal/api -count=1` and `go test ./internal/command ./internal/api -race -count=1` pass; `golangci-lint run ./internal/command ./internal/api`.
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `comm-relay-observability`, `golang-logging`, `golang-tests`
> **Scope**: `internal/command/matcher.go` (+ Damerau helper), ingest/hub already using `Lookup`/`cmd.Trigger`, fire tests
> **Allowed fallout**: matcher tests, `command_fire_test.go` alias/typo cases, debug log fields `match`
> **Blocked**: admin editor, overlay CSS, platform chat send, SQLite cooldown

- [x] 2.1 Exact enabled trigger or alias; disabled exact token does not fuzzy; extra words / non-bang unchanged.
- [x] 2.2 Unique Damerau ≤ 1 over canonical trigger plus aliases when canonical length ≥ 4; one command id wins; `gg`/`hi` never win fuzzy.
- [x] 2.3 Confirm fire tests: alias and typo set `is_command`, canonical outcome trigger, shared cooldown; ambiguous and `!go` do not.
- [x] 2.4 Observability: Info fire still canonical `trigger`; Debug `match=exact|alias|fuzzy`; Debug on ambiguous skip (no chat body at Info).

## Slice: webapp — command editor aliases

> **Outcome**: Audience command editor edits aliases (textarea, one slug per line), shows field errors, lists optional secondary alias text, RU/EN copy, constrained pane scroll. Streamer-visible changelog. Backlog INT-016/INT-037 stay `candidate` until archive/sync.
> **Acceptance**: `npm ci` if needed; `npm test`; `npm run lint`; `npm run test:i18n`.
> **Skills**: `web-static-frontend`, `web-constrained-layout`, `ux-form-practices`, `changelog`
> **Scope**: `web/admin/index.html`, `js/commands-catalog.js`, `js/dom.js`, locales, CHANGELOG `[Unreleased]`
> **Allowed fallout**: catalog CSS if the textarea needs existing field styles; i18n tests
> **Blocked**: dock/overlay alias editors, chip widgets, concept/roadmap expansion

- [x] 3.1 Aliases field under trigger; load/save `aliases`; client slug check optional; server errors on the aliases control; preserve input.
- [x] 3.2 List secondary alias text; leaderboard commands keep the field; header/footer pinned, body scrolls.
- [x] 3.3 RU/EN label, hint, and errors; i18n parity.
- [x] 3.4 Russian `[Unreleased]` bullets for extra command names and unique typos on long triggers (not `gg`/`hi`).

## Gate: browser
- [x] Q.1 Execute `qa_plan.md` P0 admin + overlay/dock scenarios in Chromium; record evidence or explicit skip for OBS/packaged desktop.

## Gate: review
- [x] R.1 Fresh diff review; CRITICAL=0; affected checks green.

## Gate: distribution-readiness
- [x] D.1 Confirm no installer/signing/package-layout change; `go build ./...` succeeds; `openspec validate command-aliases-and-typos --strict`.
