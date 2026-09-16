## 1. Server-authoritative command outcomes

> **Outcome**: Ingest is the only `TryFire` site; matched commands broadcast `command_outcome` and recent GET can restore status from a process-local map.
> **Acceptance**: `go test -race ./internal/command ./internal/api ./internal/config ./internal/observability`
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `api-conventions`, `golang-errors`, `golang-logging`, `comm-relay-observability`, `golang-tests`
> **Scope**: matcher cooldown remaining + outcome map, viewer ingest, wire frame, recent messages, config flag, overlay_settings
> **Allowed fallout**: diagnostics counters/tests, public config DTO, handler tests
> **Blocked**: platform chat send, aliases/typos, SQLite cooldown, overlay/admin markup (slice 2–3)

- [x] 1.1 Keep `Lookup` on the hub for `is_command` and consume cooldown only in ingest; add matcher remaining-ms plus a bounded in-memory outcome map keyed by platform + source id. Verify with `go test ./internal/command`.
- [x] 1.2 After `TryFire`, record `fired` or `cooldown`, broadcast `/ws` `command_outcome` (`message_platform`, `message_id`, `trigger`, `status`, `cooldown_remaining_ms`), and skip the frame when platform or id is missing. Verify with `go test ./internal/api` including two `!gg` within cooldown (one alert, second outcome `cooldown`).
- [x] 1.3 Persist `hide_command_cooldown_overlay` (default false) in `config.json` / public GET / `POST /api/config/update` / `overlay_settings`, rejecting non-booleans. Verify with `go test ./internal/config ./internal/api`.
- [x] 1.4 Attach optional `command_outcome` on recent-message GET from the in-memory map with remaining ms refreshed at read time. Verify reload-style API tests and that a new matcher has no outcomes.

## 2. Overlay frozen cooldown row

> **Outcome**: `/overlay` flashes a 5 s frozen cooldown line with no timer, independent of hiding successful commands.
> **Acceptance**: `npm run lint` and overlay node tests covering hide flags + 5 s freeze
> **Skills**: `web-static-frontend`, `obs-overlay-themes`
> **Scope**: `web/overlay/overlay.js`, overlay CSS, overlay settings, reward-highlight-style attach
> **Allowed fallout**: overlay node tests, reduced-motion frozen style
> **Blocked**: admin/dock countdown, Studio duration control

- [x] 2.1 Apply frozen cooldown chrome for 5000 ms when `command_outcome` is `cooldown` and `hide_command_cooldown_overlay` is false, buffering late message frames by platform+id. Verify overlay tests for attach-before-message and 5 s removal.
- [x] 2.2 Hide successful command lines with `hide_command_messages` while still showing default cooldown flashes; honor `hide_command_cooldown_overlay`. Verify tests for both flag combinations. Run `npm run lint`.

## 3. Admin and dock countdown

> **Outcome**: Live and dock mark accepted vs frozen (including `show_leaderboard`), tick remaining seconds only there, restore after F5, and expose the Settings checkbox.
> **Acceptance**: `npm run lint && npm run test:i18n && go test ./internal/api`
> **Skills**: `web-static-frontend`, `ux-form-practices`, `web-constrained-layout`
> **Scope**: admin messages, dock messages, Settings checkbox, EN/RU copy
> **Allowed fallout**: shared message-row helper if it removes duplication without extra features
> **Blocked**: overlay timer, diagnostics UI redesign

- [ ] 3.1 Mark Live and dock rows accepted on `fired` (including `show_leaderboard`) and frozen with a ticking countdown on `cooldown`; restore from recent `command_outcome`. Verify message-list tests or equivalent node coverage.
- [ ] 3.2 Add Settings control for `hide_command_cooldown_overlay` next to hide-command-messages with EN/RU labels/hints. Verify `npm run test:i18n` and settings helper tests.

## 4. Product documentation

> **Outcome**: Streamer-visible changelog and INT-034 stay aligned with shipped overlay/admin behavior.
> **Acceptance**: `openspec validate command-outcome-feedback --strict`
> **Skills**: `changelog`, `interactive-research`
> **Scope**: `CHANGELOG.md` `[Unreleased]`, backlog status when behavior ships
> **Allowed fallout**: existing Settings hint if it would misdescribe hide-command-messages vs cooldown
> **Blocked**: concept/roadmap expansion, packet 4 aliases

- [ ] 4.1 Add concise Russian `[Unreleased]` bullets for fired/cooldown chrome, default overlay freeze, and the new hide-cooldown setting. Verify the new bullets sit under `[Unreleased]` without rewriting versioned sections.
- [ ] 4.2 After implementation, mark INT-034 `in_progress` then `implemented` only when specs are synced/archived; do not claim aliases. Verify `openspec validate command-outcome-feedback --strict`.

## 5. QA

- [ ] 5.1 Execute `qa_plan.md` P0 scenarios (two `!gg`, overlay freeze vs hide flags, admin/dock countdown, reload restore, leaderboard accepted). Record evidence or explicit environment skips.
- [ ] 5.2 Run `go test ./...` and `go test -race ./internal/command ./internal/api ./internal/config`.
- [ ] 5.3 Run `golangci-lint run ./...`.
- [ ] 5.4 Run `npm ci`, `npm run lint`, and `npm run test:i18n`.

## 6. Review

- [ ] 6.1 Fresh independent diff review against proposal/specs/design; CRITICAL=0.
- [ ] 6.2 Confirm the diff has no connector send path, no SQLite cooldown table, no overlay countdown, and no alias/typo matcher.
