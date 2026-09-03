# Implementation Slices

## Slice: Streamer name and splash templates

> **Outcome**: Settings stores `streamer_display_name`. Command and award splashes resolve `{viewer}`, `{name}`, `{streamer}`, `{points}`, and `{message}` on the server. Editors insert variables and preview with sample data.
> **Acceptance**: `go test ./internal/command/... ./internal/api/... ./internal/config/...`; `npm test`; `npm run test:i18n`; save Jake and see it in `!hi` / award preview and overlay text.
> **Skills**: `comm-relay`, `api-conventions`, `golang-tests`, `web-static-frontend`, `ux-form-practices`, `changelog`
> **Scope**: config public JSON, `SubstituteTemplate`, ingest/grant, Audience editors, Settings field, locales.
> **Allowed fallout**: Fixtures, changelog, concept/FAQ only if template docs are wrong.
> **Blocked**: Preset override, Credits, Reward Library, signing.

- [x] 1.1 Persist `streamer_display_name` (trim, ≤ 64), public GET, field errors; default empty.
- [x] 1.2 Resolve `{viewer}`/`{name}`/`{streamer}`/`{points}`/`{message}` (quote, else `!line`, else empty); keep unknown tokens; command `{points}` 0.
- [x] 1.3 Settings field + catalog variable chips and preview (Alice / current or sample streamer); EN/RU.

## Slice: Custom alert images, sounds, and layout

> **Outcome**: Operators upload a static image and/or MP3/WAV onto a command or award, set volume and card/banner/fullscreen layout, and the OBS alert plays that media from `/overlay/assets/`.
> **Acceptance**: `go test ./internal/api/... ./internal/overlayassets/... ./internal/store/...`; `npm test`; PNG on `!gg` replaces avatar; MP3 plays without built-in; GIF upload 400; in-use delete 400; layouts visible on `/overlay/alert`.
> **Skills**: `comm-relay`, `api-conventions`, `golang-tests`, `web-static-frontend`, `obs-overlay-themes`, `web-constrained-layout`, `changelog`
> **Scope**: overlay-assets `kind`, Goose volume/layout, command/award write path, alert client, catalog editor upload/play.
> **Allowed fallout**: Shared upload helper, overlay CSS layouts, changelog.
> **Blocked**: GIF/video/SVG alerts, media library page, ffmpeg, signing, publishing.

- [x] 2.1 Extend upload with `kind` `alert_image` / `alert_sound` (limits, sniff, dimensions, duration); keep panel 512 KiB behavior; serve audio from `GET /overlay/assets/{filename}`.
- [x] 2.2 Goose `sound_volume` default 70 and `layout` default `card`; create/update accept filenames, volume, layout; reject paths; `POST /api/overlay/assets/delete` only when unreferenced.
- [x] 2.3 Alert frames include optional media/layout/volume; overlay uses custom image else avatar, custom sound else built-in, volume, and layout classes; broken media does not stall the queue.
- [x] 2.4 Catalog editor: image upload/clear, custom sound + Play/Stop, volume, layout; height-capped scroll; EN/RU errors.
- [x] 2.5 Russian `[Unreleased]` bullets for streamer name, template variables, custom media, and layouts.

## Gate: qa

- [ ] Q.1 Execute `qa_plan.md`; record coverage and skips.
- [ ] Q.2 Run `npm ci`.
- [ ] Q.3 Run `npm test`.
- [ ] Q.4 Run `npm run test:i18n`.
- [ ] Q.5 Run `npm run lint`.
- [ ] Q.6 Run `go test ./...`.
- [ ] Q.7 Run `go test -race ./internal/api/... ./internal/overlayassets/... ./internal/command/...`.
- [ ] Q.8 Run `golangci-lint run ./...`.
- [ ] Q.9 Run `go build ./...`.
- [ ] Q.10 Run `openspec validate interactive-media-and-templates --strict`.
- [ ] Q.11 Run `git diff --check`.

## Gate: review

- [ ] R.1 Fresh diff review; CRITICAL=0; checks green.
- [ ] R.2 Confirm no filesystem paths on the wire, no GIF/SVG alerts, no preset streamer override.

## Gate: distribution-readiness

- [ ] D.1 Existing package names; backup note includes `overlay-assets`; do not sign or publish.
- [ ] D.2 Manual smoke: Settings name, command image+sound, award layout, OBS alert.
