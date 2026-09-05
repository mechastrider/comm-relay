# Implementation Slices

## 1. Slice: Local portrait cache on every chat surface

> **Outcome**: Connector photos (including YouTube API `ProfileImageUrl`) are stored as overlay assets; empty `avatar_url` on `/ws` messages, history, alerts, and leaderboard is filled from cache.
> **Acceptance**: `go test ./internal/connector/youtube/... ./internal/store/... ./internal/api/...`; private-IP fetch rejected; ingest succeeds when fetch fails.
> **Skills**: `comm-relay-backend-golang`, `golang-errors`, `golang-logging`, `runnable-background-processes`, `golang-tests`
> **Scope**: YouTube mapper, Goose columns on identities, overlayassets `viewer_avatar` sniff for cache writes, ingest/hub resolve, leaderboard SQL avatar.
> **Allowed fallout**: tests, fixtures, worker wiring in bootstrap
> **Blocked**: Helix, chat-command avatars, UI upload (slice 2)

- [x] 1.1 Map YouTube API `ProfileImageUrl` into unified `avatar_url`; keep empty when missing.
- [x] 1.2 Goose: `viewer_identities.avatar_cache`; store helpers to record filename and resolve portrait URL.
- [x] 1.3 Bounded HTTPS fetch worker (SSRF-safe, sniff PNG/JPEG/WebP, size cap); enqueue on identity URL change only.
- [x] 1.4 After ingest, fill empty chat `avatar_url` from resolve(cache, remote) before `/ws` and history; leaderboard entries use the same resolve.

## 2. Slice: Custom portraits and Audience faces

> **Outcome**: Operator uploads/clears a custom face on the viewer card; Settings can ignore custom files; Audience table/card show resolved portraits with initials fallback.
> **Acceptance**: `go test ./internal/api/... ./internal/overlayassets/...`; `npm test`; `npm run test:i18n`; card upload PNG succeeds, GIF 400.
> **Skills**: `api-conventions`, `web-static-frontend`, `ux-form-practices`, `web-constrained-layout`
> **Scope**: overlayassets kind `viewer_avatar`, viewers avatar POST actions, config flag, Audience JS/CSS, Settings, EN/RU catalogs
> **Allowed fallout**: list JSON `avatar_url` / `custom_avatar`, changelog later in docs slice
> **Blocked**: leaderboard title/cap/hide (slice 3)

- [x] 2.1 `kind` `viewer_avatar` (512 KiB, 1024 px, no SVG/GIF); `POST /api/viewers/avatar/upload` and `/clear`; `viewers.custom_avatar`; resolve custom-over-cache when `custom_avatars_enabled`.
- [x] 2.2 Config `custom_avatars_enabled` default true; Settings checkbox; public GET includes the flag.
- [x] 2.3 Audience table portraits + card upload/clear; decorative images; constrained sheet layout; i18n keys.

## 3. Slice: Leaderboard title, rank cap, and hide

> **Outcome**: Studio sets overlay heading and max ranks (default 5); viewer card can hide someone from ranking; Live/OBS re-rank without removing them from Audience.
> **Acceptance**: `go test ./internal/config/... ./internal/store/... ./internal/api/...`; overlay sample preview row count follows cap; hide omits and re-ranks.
> **Skills**: `comm-relay`, `web-static-frontend`, `obs-overlay-themes`
> **Scope**: preset surface fields, leaderboard query `limit`, store filter, Studio + overlay JS/CSS, viewer update `leaderboard_hidden`
> **Allowed fallout**: overlay_settings / leaderboard flush on hide and cap change
> **Blocked**: show/hide automation modes, dock control panel

- [x] 3.1 `surfaces.leaderboard.title` (≤64) and `max_entries` (1–20, default 5); URL `limit` override; replace hard-coded 20.
- [x] 3.2 `viewers.leaderboard_hidden`; update API; leaderboard SQL omits and re-ranks; Audience card checkbox.
- [x] 3.3 Overlay heading (blank = none); Studio fields; Live leaderboard uses the same snapshot.

## 4. Docs

> **Outcome**: Streamers see the behavior in `[Unreleased]`; backup note includes assets.
> **Skills**: `changelog`
> **Blocked**: README unless install/setup steps actually change

- [x] 4.1 Russian `[Unreleased]` bullets: Audience faces, custom portrait + disable, cache, leaderboard title, default top-5, hide from ranking, Twitch-only limitation if needed.

## Gate: qa

- [ ] Q.1 Execute `qa_plan.md`; record matrix coverage and evidence.

## Gate: review

- [ ] R.1 Fresh diff review; CRITICAL=0; affected checks green.

## Gate: distribution-readiness

- [ ] D.1 Validate package/update readiness without signing or publishing.

## Verification

```bash
npm ci
npm test
npm run test:i18n
npm run lint
go test ./...
go test -race ./internal/api/... ./internal/store/... ./internal/overlayassets/... ./internal/connector/youtube/...
golangci-lint run ./...
go build ./...
openspec validate viewer-avatars-and-leaderboard-customize --strict
git diff --check
```
