# QA Evidence — audience-directory-follow-ups

Date: 2026-09-03
Branch: `cursor/audience-directory-follow-ups-8b77`
Implementation: `9106688` plus this evidence file.

## Environment

- Linux amd64 Cloud Agent; Go `1.26.3`; Node `v22.22.2`; OpenSpec `1.12.0`; golangci-lint `v2.12.2`.
- Headless server: `go run ./cmd/comm-relay-server -config /tmp/comm-relay-qa/config.json -web /workspace/web -addr 127.0.0.1:17877`
- Seeded SQLite (not committed): merged Alice (YouTube+Twitch), Carol (VK), Bob (Twitch).
- Browser: Chromium at `/#audience`, wide desktop and 400px compact.

## Required automated commands

| Command | Result |
|---|---|
| `npm ci` | **PASS** |
| `npm test` | **PASS** — 87 tests, 0 failed. Includes a one-line alignment of pre-existing icon-button shadow assertions with current chrome (`icon-actions-markup.test.js`); that CSS was not changed in this slice. |
| `npm run test:i18n` | **PASS** — 635 keys |
| `npm run lint` | **PASS** — `eslint web/` |
| `go test ./...` | **PASS** |
| `golangci-lint run ./...` | **PASS** — 0 issues |
| `go build ./...` | **PASS** |
| `openspec validate audience-directory-follow-ups --strict` | **PASS** — Change is valid |
| `git diff --check` | **PASS** |

## Behavior matrix

| Scenario | P0/P1 | Result | Evidence |
|---|---|---|---|
| Merged list JSON unique last-seen-first, no identities | P0 | **PASS** | `GET /api/viewers` Alice `platforms: ["youtube","twitch"]`; identities omitted. Artifact `api_viewers_list.json`. Store tests for merge/duplicates. |
| Duplicate platform collapsed | P0 | **PASS** | `TestList_WhenDuplicatePlatformIdentities_ExpectSinglePlatformID` |
| `GET /api/viewers/get` identities | P0 | **PASS** | Alice get payload includes twitch+youtube identities. Artifact `api_viewers_get_alice.json`. |
| First Score sort descending | P0 | **PASS** | Browser: Alice 11, Bob 5, Carol 1; `aria-sort=descending`. Video + `audience_score_sort_descending.webp`. |
| Third Score click restores activity | P0 | **PASS** | Browser: Alice, Carol, Bob; `aria-sort=none`. |
| Messages desc persists across reload | P0 | **PASS** | Browser reload kept Messages descending. |
| Period change keeps sort column | P0 | **PASS** | Session → day → all; Messages stayed the active sort. |
| Wide click opens inspector, no Actions | P0 | **PASS** | Alice card with Twitch+YouTube identities. Video. |
| Compact click opens sheet | P0 | **PASS** | 400px Bob sheet `audience_compact_sheet.webp`. |
| Keyboard Enter/Space + arrow roving | P0 | **PASS** | Enter opens Alice; ArrowDown+Space opens Carol. `audience_keyboard_enter_alice.webp`, `audience_keyboard_space_carol.webp`. |
| Merged icons, accessible names, no text labels | P0 | **PASS** | Alice YouTube+Twitch `aria-label`; Carol VK; Bob Twitch. `audience_platform_icons.webp`. |
| Unknown platform id | P1 | **PASS (unit)** | `viewerPlatformsList` + `normalizePlatformId` / generic glyph helper. Not injected in live UI. |
| New stream outside filters; cancel then confirm | P0 | **PASS** | Button in `.audience-toolbar__actions`. Cancel then confirm; session counters reset. Video. |
| Header contrast at 150% zoom | P0 | **PASS** | Dark admin only (no light theme exists). `audience_header_150pct_zoom.webp`. |
| Missing `platforms` fallback | P0 | **PASS (unit)** | `viewerPlatformsList({ last_seen: { platform: "youtube" } })` → `["youtube"]`. |

## Filesystem / persistence

- No Goose migration added (`internal/store/migrations` unchanged).
- Sort key `commRelay.audienceSort` only; invalid JSON fallback covered by `audience-sort.test.js`.
- `config.json` not modified in the repo.

## Explicit skips

- Overlay, dock, OBS Browser Source: admin-only change.
- Connector network tests: connectors unchanged.
- Installer, signing, notarization, tray, protocol-handler: out of scope.
- Full directory live-sync from leaderboard frames: out of scope.
- Light admin theme: product has a single dark admin `color-scheme`; contrast checked in that theme at 100% and 150%.
- Packaged Wails Windows/macOS/Linux installers: not available on this Cloud Agent. Headless+Chromium smoke used instead (`D.2` skip).
