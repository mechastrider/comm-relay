## 1. Backend

- [x] 1.1 Add `modernc.org/sqlite` and `pressly/goose/v3`; embed Goose SQL under `internal/store/migrations` with the 6a schema (viewers, identities, sessions, session/day stats, merge audit)
- [x] 1.2 Open `comm-relay.db` beside `config.json` with WAL, foreign keys, busy timeout; run Goose `Up` on start; fail bootstrap if migrate fails; cover open/migrate with temp-dir tests
- [x] 1.3 Implement store mutex APIs: upsert identity + increment counters (skip empty `user_id`), day-key helper for `day_reset_hour`, ensure open session, merge (reject self-merge), list/search/get, display-name update, hide merged sources
- [x] 1.4 Add `points_per_message` (default 1) and `day_reset_hour` (default 6, range 0–23) to config load/validate/public JSON; additive defaults for legacy files
- [x] 1.5 Register a bus runnable that applies counted chat lines and coalesces leaderboard snapshots (`session`, `day`, `all`, top 20) onto the WebSocket hub
- [x] 1.6 Wire POST `/api/viewers/merge`, `/api/viewers/update`, `/api/sessions/start` and GET `/api/viewers`, `/api/viewers/get`, `/api/leaderboard`; keep POST-action rules; extend router guard tests
- [x] 1.7 Serve `web/leaderboard/` at `/overlay/leaderboard` (with and without trailing slash) registered before `/overlay/`; handler tests for chat overlay vs leaderboard URLs

## 2. Frontend

- [x] 2.1 Admin main canvas: Monitor vs Viewers tabs; Viewers split pane (search, list, card, merge picker) using existing cockpit CSS and constrained-layout scroll
- [x] 2.2 Header New stream control with confirm dialog; call `POST /api/sessions/start`; refresh viewers/session totals
- [x] 2.3 Interface fields for `points_per_message` and `day_reset_hour`; OBS setup card for leaderboard URL with period select and copy
- [x] 2.4 Leaderboard page: transparent HUD list, `period` query, fetch snapshot then `/ws` `leaderboard` frames, reconnect backoff; chat overlay still ignores unknown types
- [x] 2.5 Russian/English i18n for new chrome; `npm run test:i18n`; ESLint coverage for new modules

## 3. Docs

- [x] 3.1 CHANGELOG `[Unreleased]` streamer bullets: durable viewers, merge, New stream, day reset, leaderboard Browser Source
- [x] 3.2 README (RU/EN): `comm-relay.db` beside config, leaderboard URL, no extra DB server

## 4. Verification

- [x] 4.1 `go test ./...` and `go test ./... -race` for store/ingest/API packages
- [x] 4.2 `golangci-lint run ./...`
- [x] 4.3 `npm ci` if needed, `npm run lint`, `npm test`
- [ ] 4.4 Manual smoke: ingest two platforms, merge in Viewers, New stream confirm, OBS `/overlay` vs `/overlay/leaderboard?period=session|day|all` (transparent backgrounds)
