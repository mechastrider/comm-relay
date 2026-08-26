## 1. Backend

- [x] 1.1 Add optional `surfaces.leaderboard` on overlay presets (`font_size_px` 12–48, `layout` `panel`|`chips`), inherit font from preset `font_size_px` and default layout `panel` when omitted
- [x] 1.2 Validate surface overrides on config update; reject invalid font/layout with field errors; cover inherit, store, and reject paths in `internal/config` tests
- [x] 1.3 Include `surfaces` in the public overlay/preset JSON used by admin save and by overlay settings (`/ws` `overlay_settings` and any HTTP snapshot the overlay already uses) so the leaderboard page can resolve `preset`

## 2. Frontend — leaderboard page

- [x] 2.1 Honor `preview=sample` (and shared `preview_background` values, `busy`→`scene`): render a built-in fictitious top-5, do not fetch `/api/leaderboard` or paint live `leaderboard` frames in that mode
- [x] 2.2 Resolve appearance from `preset` / active preset, query `theme` / `font_size_px` / `layout` (invalid values fall back as specified), apply the same `overlay-theme--*` body classes as chat
- [x] 2.3 Replace the one-off gold CSS with per-theme leaderboard rules for `panel` and `chips` using shared HUD tokens; keep `html`/`body` transparent outside preview

## 3. Frontend — admin OBS studio

- [x] 3.1 Replace the Connection card grid with a source list + detail pane (chat, leaderboard, dock; banners/alerts disabled with no `/overlay/alert` URL) and one shared Browser Source help block
- [x] 3.2 Single URL builder per surface: chat and leaderboard include `preset`; leaderboard includes `period` and current layout/font query when overriding; wire both the source pane and the preset island
- [x] 3.3 Appearance: Chat / Leaderboard switch retargets the existing preview iframe (size, backdrop, replay); show chat-only vs leaderboard-only fields; sample ranking never uses live stats
- [x] 3.4 Load/save `surfaces.leaderboard` in the appearance form; switching surfaces in preview must not clobber the other surface’s font
- [x] 3.5 Add ru/en strings for sources, studio switch, layout, leaderboard font, and the banners placeholder; keep `npm run test:i18n` in mind

## 4. Docs

- [x] 4.1 Update `obs-overlay-themes` (and a short pointer in `comm-relay`): a theme is the on-stream visual language; new theme covers chat + leaderboard; new surface implements every theme; preview sample rules
- [x] 4.2 README (ru/en) OBS setup: source list, `?preset=` on leaderboard, layout/font, sample preview — plus `CHANGELOG.md` `[Unreleased]` (streamer-visible)

## 5. Verification

- [x] 5.1 `gofmt` / `goimports` on touched Go files; `go test ./...`; `golangci-lint run ./...`
- [x] 5.2 `npm ci` if needed; `npm run lint`; `npm run test:i18n`
- [x] 5.3 Browser smoke: OBS dialog source list (chat/leaderboard/dock copy URLs, banners disabled); Appearance Chat vs Leaderboard sample preview; all five themes × panel and chips; live `/overlay/leaderboard` still transparent and ranked; chat `/overlay` unchanged
