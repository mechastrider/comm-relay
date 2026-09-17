# Implementation Slices

## Slice: domain-api — windowed recap state and all-time presentation

> **Outcome**: Server computes bounded all-time recap status, shows it without inserting `stream_recaps`, keeps session capture immutable, and broadcasts `window` plus `all_time` on HTTP and production `/ws`.
> **Acceptance**: `go test ./internal/store ./internal/api ./internal/recap -count=1` and `go test ./internal/api ./internal/store -race -count=1` pass; `golangci-lint run ./internal/store ./internal/api ./internal/recap ./internal/bootstrap`.
> **Skills**: `comm-relay`, `backend-structure`, `comm-relay-backend-golang`, `api-conventions`, `golang-errors`, `golang-logging`, `golang-tests`, `comm-relay-observability`
> **Scope**: `internal/store` all-time recap query, `internal/recap` controller/window DTO, `internal/api` current/show/hide/show-all and `stream_recap_state` wire, bootstrap logging fields
> **Allowed fallout**: router registration, handler tests, WS hub tests, store tests, diagnostics log fields
> **Blocked**: overlay/admin UI, PNG encode, SQLite migration, season window, historical replay

- [x] 1.1 Add a store query for all-time recap presentation: unique viewers with `message_count > 0`, summed all-time XP/messages over non-hidden canonical viewers, Top 5 matching `period=all` eligibility/order/portraits/titles, empty achievement list.
- [x] 1.2 Extend recap runtime state with `window` (`session` \| `all`) and last all-time presentation; Show session still captures/reuses snapshot; show-all computes without INSERT; Hide/New stream clear both; restart hidden.
- [x] 1.3 Add `POST /api/stream-recaps/show-all` (`{}` only) and extend GET current / show / hide JSON with `window` and `all_time` per specs; keep POST-action router guard green.
- [x] 1.4 Broadcast and seed `stream_recap_state` with `window`, null `snapshot` on all-time, null `all_time` on session; reconnect restores last all-time payload; log `window` on visibility changes.
- [x] 1.5 Tests: no row on show-all; snapshot bytes unchanged across switch; unique-viewer rule; reshow refreshes; extra JSON 400; hide after all-time; WS reconnect; Show vs New stream races.

## Slice: webapp — overlay windows, Recap switcher, opaque PNG

> **Outcome**: `/overlay/recap` renders session vs all-time from the wire, Live Recap switches windows without capturing on all-time, and Download image saves an opaque 16:9 PNG of the selected window from presentation data.
> **Acceptance**: `npm test` and `npm run lint` pass (run `npm ci` once if needed); `npm run test:i18n` pass.
> **Skills**: `web-static-frontend`, `web-constrained-layout`, `ux-form-practices`, `obs-overlay-themes`, `api-conventions`, `changelog`
> **Scope**: `web/recap/*`, `web/admin/js/live-recap*`, admin markup/CSS, locales, share-card encode helper, CHANGELOG `[Unreleased]`, backlog INT-036 status only if the change lands
> **Allowed fallout**: shared recap model helpers, admin markup/state tests, overlay surface-contract tests
> **Blocked**: html2canvas of OBS, square export, dock recap UI, Studio PNG, native save dialog

- [x] 2.1 Overlay: parse `window`/`all_time`; session path unchanged; all-time labels and no achievements; hidden remains transparent; unknown frames ignored.
- [x] 2.2 Recap dialog: session vs all-time switch, show-all without permanence confirm, session confirm preserved, WS updates, constrained header/footer, RU/EN strings.
- [x] 2.3 Download image: opaque 16:9 share-card from selected payload; Canvas PNG + local download; session gated until snapshot exists; errors accessible; overlay unchanged.
- [x] 2.4 Tests for model/wire guards, markup, download gating, XSS-safe share-card text; overlay surface contract; i18n parity.
- [x] 2.5 Append streamer-visible Russian `[Unreleased]` bullets for all-time recap window and PNG download.

## Gate: browser
- [x] Q.1 Execute `qa_plan.md` P0 admin + overlay scenarios in Chromium; record evidence or explicit skip for OBS/packaged desktop.

## Gate: review
- [x] R.1 Fresh diff review; CRITICAL=0; affected checks green.

## Gate: distribution-readiness
- [x] D.1 Confirm no installer/signing/package-layout change; `go build ./...` succeeds.
