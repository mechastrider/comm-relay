## 1. Backend

- [x] 1.1 Default `g_rebels_popups` platform marker to `both` in Go `defaultOverlayStyleForTheme` and cover it with a unit test

## 2. Frontend

- [x] 2.1 Add `normalizePreviewBackground` (canonical `white|checker|scene|dark`, alias `busy` → `scene`, default `scene`) in overlay-settings and default G-Rebels style to `both`
- [x] 2.2 Put `.message__platform` inside `.message__identity` before the display name; restyle HUD icons on the name row; drop grid auto-placement / `svg { display: none }` leftovers
- [x] 2.3 Apply preview body classes from the canonical set; keep live overlay transparent
- [x] 2.6 Paint preview backdrops on `html` so HUD themes with `position: fixed` queues still fill the rectangle
- [x] 2.4 Admin preview select: white, checker, scene, dark; pass and restore via `normalizePreviewBackground`
- [x] 2.5 i18n: White / Checkerboard / Game footage / Black and Белый / Шахматка / Игровой кадр / Чёрный; bump overlay cache query

## 3. Docs

- [x] 3.1 CHANGELOG `[Unreleased]` for icon placement, G-Rebels default, and preview backdrops
- [x] 3.2 FAQ: mention white/scene backdrops; keep `preview_background=dark` working

## 4. Verification

- [x] 4.1 `go test ./...` and `golangci-lint run ./...`
- [x] 4.2 `npm run lint` and `npm test`
- [x] 4.3 Smoke Appearance preview: HUD icon before nick; four backdrops including white
