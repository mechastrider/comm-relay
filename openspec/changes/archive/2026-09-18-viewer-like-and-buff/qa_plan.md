# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Headless Go server | CI host | HTTP/WS fixtures | yes — CI gate |
| Current Chromium-family browser | host | Admin Commands/Settings/Levels; Live + dock; overlay 1920×1080 | yes — UI/P0 |
| Overlay `/overlay` and `/overlay/alert` | host | transparent chat; like alert | yes — P0 |
| OBS Browser Source | host when available | unchanged URLs | skip unless already running |
| Packaged desktop | release runners | unchanged packaging | skip |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| like requires nick | `!like` from a known viewer | `rejected` `missing_arg`; no XP; overlay freeze 5 s | P0 |
| like unique nick | Two session viewers; `!like bob` exact | Bob +5 (or bound points); Alice XP unchanged; award alert; journal row for Bob | P0 |
| like self | `!like` own nick | `rejected` `self`; quota unchanged | P0 |
| like not in session | Known Audience viewer, no session activity | `rejected` `not_found` | P0 |
| like ambiguous fuzzy | Alice and Alicia; `!like alicx` | `rejected` `ambiguous`; label «уточни»/clarify; no names listed | P0 |
| like same-platform exact | Twitch Bob + YouTube Bob; Twitch `!like bob` | Twitch Bob wins | P0 |
| `!gg bob` | Alert command with extra words | Ordinary chat; no outcome | P0 |
| buff no nick | Operator Spotter to Carol, then Dave `!buff` | Carol XP += buff points; no second Spotter alert; no extra Spotter history row | P0 |
| buff own latest | Recipient sends `!buff` | `rejected` `self`; no skip to older award | P0 |
| buff named no award | Viewer with messages, no operator award | `rejected` `no_award` | P0 |
| already_buffed | Same viewer `!buff` twice on same award | Second `already_buffed`; quota not consumed | P0 |
| award_full | Six distinct buffers, cap 5 | Sixth `award_full`; quota not consumed | P0 |
| quota | Level like_quota 1; second like | `rejected` `quota` | P0 |
| new stream | Spend quota; New stream; like again | Quota restored | P0 |
| restart | Spend one like; restart process; like again | Remaining quota preserved | P0 |
| Cheerleader | Ten successful likes | Achievement unlocks; rejected likes do not count | P1 |
| Chat Favorite | Ten received viewer_like | Unlock on recipient | P1 |
| Copilot | Ten successful buffs | Unlock on giver | P1 |
| admin editor | Create like/buff; invalid award_id / points | Field errors; constrained scroll | P0 |
| settings caps | Set unique cap 0; `!buff` | `award_full`; buffing disabled | P0 |
| overlay hide flag | `hide_command_cooldown_overlay` true; rejected like | Overlay omits freeze; admin/dock still show | P1 |
| gg regression | `!gg` fire/cooldown | Unchanged splash and cooldown chrome | P0 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Migration creates no extra files beyond SQLite.
- No connector send; Twitch/YouTube/VK chat has no bot reply.
- Two admin clients see the same `command_outcome`.
- Process restart: SQLite quotas survive; overlay freeze map does not.

## Persistence Migration / Corruption / Recovery

Upgrade a DB at 00020: commands/levels/events migrate; seeds insert when ids free. Corrupted/missing parent award → `no_award`, ingest continues. Concurrent buffs at cap 5: exactly five successful.

## Install / Upgrade / Downgrade / Packaged-App Smoke

Skip installer/signing. `go build ./...` is enough. Rollback note: delete like/buff commands if an older binary cannot open the DB.

## Automated Commands / Manual Setup / Fixtures

```bash
go test ./internal/store ./internal/command ./internal/api -count=1
go test ./... -race -count=1
go build ./...
golangci-lint run ./...
npm ci
npm test
npm run test:i18n
npm run lint
openspec validate viewer-like-and-buff --strict
```

Manual: `go run ./cmd/comm-relay-server -config ./var/data/config.json -web ./web`. Need two session identities and one operator award.

## Evidence and Explicit Skips

Required: API/WS snippets for fired/rejected reasons; overlay freeze screenshot; like alert screenshot; admin editor screenshot. Skip OBS and packaged desktop unless already running. Signing/tray/notifications skipped.
