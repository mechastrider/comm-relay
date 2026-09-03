# QA Evidence — interactive-media-and-templates

Date: 2026-09-03
Branch: `cursor/interactive-media-a5b9`

## Environment

- Linux amd64 Cloud Agent; Go `1.26.3`; Node `v22.22.2`; OpenSpec `1.12.0`; golangci-lint `v2.12.2`.
- Headless server: `go run ./cmd/comm-relay-server -config /tmp/comm-relay-media-qa/config.json -web /workspace/web -addr 127.0.0.1:17877`
- Browser: Chromium admin (RU) and `/overlay/alert`.

## Required automated commands

| Command | Result |
|---|---|
| `npm ci` | **PASS** |
| `npm test` | **PASS** — 98 tests, 0 failed |
| `npm run test:i18n` | **PASS** — 669 keys |
| `npm run lint` | **PASS** — `eslint web/` |
| `go test ./...` | **PASS** |
| `go test -race ./internal/api/... ./internal/overlayassets/... ./internal/command/...` | **PASS** |
| `golangci-lint run ./...` | **PASS** — 0 issues (blank-import comments on image decoders) |
| `go build ./...` | **PASS** |
| `openspec validate interactive-media-and-templates --strict` | **PASS** — Change is valid |
| `git diff --check` | **PASS** |

## Behavior matrix

| Scenario | P0/P1 | Result | Evidence |
|---|---|---|---|
| Save streamer name `Jake` | P0 | **PASS** | `POST /api/config/update`; Settings → Данные field shows Jake |
| `{name}` alias of `{viewer}` | P0 | **PASS** | `internal/command/template_test.go`; catalog preview Alice |
| `{message}` award quote | P0 | **PASS** | `internal/api/awards_grant_test.go` |
| `{message}` command line | P0 | **PASS** | `internal/api/command_fire_test.go`; preview used `!gg` |
| Empty streamer substitution | P0 | **PASS** | command template unit tests |
| Alert PNG on `gg` | P0 | **PASS** | Upload 200 `asset_*.png`; editor thumbnail; GET `/overlay/assets/` |
| Missing image avatar fallback | P0 | **PASS** | `web/alert/alert-media.test.js` |
| Alert WAV/MP3 | P0 | **PASS** | 3 s WAV upload 200; GET `audio/wav` |
| Built-in + volume | P0 | **PASS** | overlay `playAlertAudio` tests; editor volume 55 |
| GIF `alert_image` rejected | P0 | **PASS** | HTTP 400 `file type is not allowed` |
| Path rejected | P0 | **PASS** | `image_asset` `C:\photos\gg.png` → 400 field error |
| Layout banner/fullscreen | P0 | **PASS** | `gg` saved `banner`; Joke editor shows card/banner/fullscreen; overlay CSS classes in tests |
| In-use delete | P0 | **PASS** | HTTP 400 `overlay asset is still in use` |
| Editor chips/preview | P0 | **PASS** | Browser: chips insert; preview `Hi from Jake, Alice!` |
| Play in editor | P0 | **PASS** | Play/Stop controls present; no overlay splash from Play |
| Panel upload unchanged | P0 | **PASS** | overlayassets panel tests still cover 512 KiB / SVG |
| Overlay page transparent | P0 | **PASS** | `/overlay/alert` empty (no admin chrome); sample preview splash |
| Long RU template | P1 | **PASS** | RU admin catalogs wrap; preview text nodes |
| Reduced motion | P1 | **SKIP** | No award splash live fire this session |
| Windows + OBS | P0 matrix | **SKIP** | Cloud Linux browser only; OBS not available |
| Linux/macOS OBS | P1 | **SKIP** | OBS not installed |
| Signing / notarize / publish | — | **SKIP** | Distribution plan forbids |

## Manual smoke (D.2)

- Settings streamer name Jake, save, field remains: **PASS**
- Command `gg` custom red PNG thumbnail, WAV controls, volume 55, layout banner: **PASS**
- Award Joke layout radios including fullscreen: **PASS**
- `/overlay/alert?preview=sample` shows Spotter / Nova splash: **PASS**
- Live `!gg` with Twitch: **SKIP** (no connector)

## Explicit skips

Signing, GIF-as-supported, video, preset streamer override, Windows/macOS OBS, live `!gg` without a chat connector.

## Follow-up fixed during QA

Admin catalog modules originally imported `../../alert/alert-render.js`, which 404s when served from `/js/` and blocked SPA hydration. Filename checks now live in `catalog-media-core.js`; built-in preview loads `/overlay/alert/alert-sound.js`.
