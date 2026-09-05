# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Windows 10/11 + OBS | x86-64 | Overlay themes; admin 100%/150%; keyboard card | P0 |
| Chromium admin | Host | EN/RU; zoom 100%/125% | P0 |
| Linux/macOS browser | Existing | Default theme | P1 |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| Audience portraits | Open Audience with viewers that have `avatar_url` | Faces beside names; initials when empty | P0 |
| Broken image | Point at a 404 asset | Initials fallback; name still opens card | P0 |
| Custom upload | PNG on card | Table, card, leaderboard, chat overlay use local asset | P0 |
| Custom overrides cache | Viewer has cache + custom | Custom shown while flag on | P0 |
| Disable custom | Settings off | Cached platform face, custom file kept | P0 |
| GIF upload | GIF on card | 400; previous portrait unchanged | P0 |
| Hide streamer | Check hide | Audience row remains; OBS/Live ranking omits and re-ranks | P0 |
| Title | Studio title `Топ эфира`, publish | Overlay heading; blank title hides heading | P0 |
| Cap default 5 | >5 ranked, omitted max_entries | Five rows | P0 |
| Cap / `limit` | max_entries 3; URL `limit=2` | Overlay shows 2 | P0 |
| YouTube ProfileImageUrl | Map API fixture with photo | Unified `avatar_url` set | P0 |
| Twitch fill | Empty connector avatar after custom | `/ws` message has local `avatar_url` | P0 |
| Cache fetch fail | Unreachable CDN | Chat still ingested | P0 |
| Private URL fetch | `127.0.0.1` avatar_url | Not fetched | P0 |
| Alert identity | Award, no image_asset, cached face | Medal primary; avatar_url local if chrome needs it | P1 |
| Narrow card | 375px sheet upload + hide | Controls reachable, no clip | P0 |
| Reduced motion | Overlay ranks + portraits | No extra animation required | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Files only under `overlay-assets`.
- Restart: cached filename still resolves.
- Shutdown during fetch: process exits; next message can retry.
- Cancel file picker: previous custom kept.

## Persistence Migration / Corruption / Recovery

- Pre-migration DB: empty `custom_avatar` / `leaderboard_hidden` 0 / empty `avatar_cache`.
- Missing file: fallback remote then placeholder.
- Invalid max_entries rejected; stored preset unchanged.

## Install / Upgrade / Downgrade / Packaged-App Smoke

- Upgrade, upload one portrait, hide streamer, set title + cap 5, reload OBS leaderboard and chat.
- Backup folder includes assets.
- Skip old-binary-on-new-DB except documented ignore.

## Automated Commands / Manual Setup / Fixtures

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

Fixtures: tiny PNG/JPEG/WebP, GIF, oversize, private-IP URL. Manual: Windows OBS chat + leaderboard; Audience card upload.

## Evidence and Explicit Skips

Record command output and a short OBS capture of titled top-5 plus Audience faces. Skip Helix, viewer chat-commands, Linux OBS if unavailable (P1), signing.
