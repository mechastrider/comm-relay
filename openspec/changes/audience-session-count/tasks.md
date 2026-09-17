# Tasks

## 1. Backend

- [x] 1.1 Add `SessionCount` on `store.Viewer`. Share the Veteran participation predicate (`viewer_session_stats.message_count > 0`) between progression `session_count` and list/get. List joins a grouped `COUNT(*)` subquery; Get returns the same integer; missing rows are 0. Verify with store tests that three chatting sessions yield 3 and an award-only session yields 0.
- [x] 1.2 Map integer `session_count` on `viewerSummaryResponse` for `GET /api/viewers` and `GET /api/viewers/get` without changing period field names or adding REST id paths. Verify list and get JSON agree in `internal/api` handler tests.
- [x] 1.3 Add merge coverage: after merging two viewers, the target `session_count` equals `ProgressionMetricSessionCount` for that viewer. Verify with `go test ./internal/store ./internal/api -count=1`.

## 2. Frontend

- [x] 2.1 Add the Audience Streams/Эфиры column (`audience.colStreams`), colgroup, and `#audience-sort-streams`. Sort id is `streams` on lifetime `session_count`, using the existing three-click cycle and localStorage; it MUST NOT use `viewerPeriodMetrics`. Update `audience.periodHint`. Verify with `audience-helpers` / `audience-sort` / markup tests.
- [x] 2.2 Add `viewers.statStreams` on the wide inspector and compact sheet after the three period lines. Period changes must not rewrite it. Add EN/RU keys. Verify with viewer-detail or equivalent JS tests plus `npm run test:i18n`.
- [x] 2.3 Register any new JS test files in `package.json` `test`. Verify `npm test && npm run lint` pass.

## 3. Docs

- [x] 3.1 Append a Russian `[Unreleased]` **Добавлено** bullet that a streamer would notice: Audience → Зрители shows how many streams the viewer wrote in (skill `changelog`). Verify the existing versioned CHANGELOG sections are untouched.
- [x] 3.2 Set INT-035 to `in_progress` in `docs/interactive/backlog.md`. Do not mark `implemented` until archive. Verify the registry row matches this change slug.

## 4. Verification

- [x] 4.1 `gofmt` / `goimports` on touched Go files; `go test ./internal/store ./internal/api -count=1`
- [x] 4.2 `go test ./... -race -count=1` and `go build ./...`
- [x] 4.3 `golangci-lint run ./...`
- [x] 4.4 `npm ci && npm test && npm run test:i18n && npm run lint`
- [x] 4.5 `openspec validate audience-session-count --strict`
- [ ] 4.6 Browser smoke per `qa_plan.md` (P0): directory column, period independence, sort, card row; `/overlay` remains transparent.

## Scope / Blocked

**Blocked:** overlay/recap/leaderboard, denormalized `viewers.session_count`, counting XP-only sessions, progression catalog UI, command-outcome work.
