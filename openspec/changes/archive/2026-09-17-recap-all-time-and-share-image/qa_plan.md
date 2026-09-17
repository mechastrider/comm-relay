# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Headless Go server | CI host | HTTP/WS fixtures | yes — CI gate |
| Current Chromium-family browser | host | Admin Recap dialog 1280×800 and ~700px height; overlay 1920×1080 and 1080×1920 | yes — UI/P0 |
| Overlay `/overlay/recap` | host | transparent hidden; session and all-time visible | yes — P0 |
| Overlay `/overlay` | host | transparent regression | yes — P0 |
| OBS Browser Source | host when available | unchanged | skip unless already running |
| Packaged desktop | release runners | unchanged packaging | skip |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| stream-recaps / no-row all-time | Uncaptured session; Show all-time | Overlay visible all-time; `stream_recaps` count unchanged | P0 |
| stream-recaps / immutable switch | Capture session, note snapshot JSON, Show all-time, Show session again | Stored snapshot identical; overlay session view restores achievements | P0 |
| stream-recaps / unique viewers | Viewer with XP and 0 messages plus a messaging viewer | all-time `viewer_count` 1; XP total includes both | P0 |
| stream-recaps / reshow refresh | Show all-time, grant XP, Show all-time again | Overlay totals increase | P0 |
| stream-recaps / restart | Show all-time, restart process | Overlay hidden; session snapshot still in GET current if captured | P0 |
| http-api / show-all | `POST /api/stream-recaps/show-all` `{}` | 200 `visible` true `window` `all`; extra fields 400 | P0 |
| http-api / current | GET current hidden/uncaptured | `window` null, `snapshot` null, `all_time` object | P0 |
| websocket-feed | Show all-time, reconnect `/ws` | Same `window` `all` payload; `snapshot` null | P0 |
| obs-recap / labels | Show session vs all-time | Session copy and achievements vs all-time copy and no achievements | P0 |
| obs-recap / hidden | Load overlay while hidden | Fully transparent; no download control | P0 |
| admin-and-dock / confirm | First session Show | Permanence dialog still appears; all-time Show skips it | P0 |
| admin-and-dock / download session | After capture, window=session, Download image | PNG saved; opaque background | P0 |
| admin-and-dock / download all-time | No snapshot, window=all-time, Download image | PNG saved; no recap row | P0 |
| admin-and-dock / session download gated | Window=session, no snapshot | Download unavailable or explains missing capture | P0 |
| admin-and-dock / height | Dialog ~700px | Header/footer pinned; body scrolls | P1 |
| dock/overlay regression | Show all-time with `/overlay` and `/dock/messages` open | Chat overlay transparent and functional; dock unchanged | P0 |
| New stream | All-time visible, New stream | Recap hidden; session counters reset as today | P0 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- No new files under the data directory after show-all or download (PNG lands in the browser download folder only).
- No save dialog, clipboard permission prompt, or notification.
- Multiple admin clients: show-all on one converges overlay and the other admin via WS.
- Process restart hides recap; SQLite recap rows unchanged.

## Persistence Migration / Corruption / Recovery

Skip. No migration. Invalid extra JSON on old binaries is ignored.

## Install / Upgrade / Downgrade / Packaged-App Smoke

Skip installer/signing. `go build ./...` is enough. Rollback: revert the branch/binary.

## Automated Commands / Manual Setup / Fixtures

```bash
go test ./internal/store ./internal/api ./internal/recap -count=1
go test ./... -race -count=1
go build ./...
golangci-lint run ./...
npm ci
npm test
npm run test:i18n
npm run lint
openspec validate recap-all-time-and-share-image --strict
```

Manual: `go run ./cmd/comm-relay-server -config ./var/data/config.json -web ./web` (or `-addr` if 17877 is taken). Seed at least one messaging viewer and one XP-only viewer when the local DB is empty.

## Evidence and Explicit Skips

Required: API/WS test log or JSON snippets; Recap dialog screenshot of window switch; overlay session vs all-time screenshots; PNG file or screenshot of opaque share-card; overlay hidden transparency smoke. Skip OBS and packaged desktop unless already running. Signing/tray/notifications skipped.
