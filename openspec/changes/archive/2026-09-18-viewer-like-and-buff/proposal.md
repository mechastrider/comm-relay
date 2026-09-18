## Why

Viewers can fire splash commands and the operator can grant awards, but chat cannot amplify a streamer award or give a peer like. Streamers need bounded, configurable viewer-to-viewer actions that keep the operator as the source of contribution awards.

## Users and Supported Platforms

Local streamers and OBS operators on the existing Windows desktop and headless server. Viewers use current Twitch, YouTube Live, and VK Live ingest. No new OS, connector, or installer surface.

## What Changes

- Catalog actions `buff` and `like`. `!buff` targets the latest operator award this session; `!buff <nick>` that viewer’s latest operator award. Buff adds catalog `points` to the recipient only and MUST NOT count as another original award id. `!like <nick>` grants deletable starter award `viewer_like`; missing nick is rejected, not ordinary chat.
- Self-target is forbidden. Independent session like/buff quotas come from the giver’s level (starter 1…5). Per-award defaults: one buff per viewer, five unique buffers (configurable; zero unique cap disables buffing).
- Nick resolution uses session-active viewers (message or operator award): normalize, exact, unique same-platform exact, then unique Damerau ≤ 1 when length ≥ 4. Ambiguous matches reject with “уточни” / “clarify”.
- `command_outcome` `rejected` plus reason on the chat line. No platform replies.
- Starter achievements: Cheerleader / Болельщик, Chat Favorite / Любимец чата, Copilot / Второй пилот.

## Capabilities

### New Capabilities

- `viewer-social-commands`: like/buff, nick resolution, quotas, caps, rejections.

### Modified Capabilities

- `chat-commands`: parameterized social actions; other commands stay whole-line.
- `viewer-stats`: like/buff MAY add XP to another viewer; giver XP unchanged.
- `operator-rewards`: deletable `viewer_like` starter; buff is not an operator grant.
- `viewer-progression`: per-level quotas; three starter achievements.
- `interaction-events`: like grants and buff facts (not a second original award id).
- `viewer-reward-history`: `viewer_like` rows as ordinary awards.
- `websocket-feed`, `obs-overlay`, `admin-and-dock`: rejected outcomes and policy UI.
- `http-api`, `config-store`: policy and catalog DTOs.
- `overlay-alerts`: like uses award alerts; buff MUST NOT replay the original splash.

## Scope / Non-Goals

Not in scope: buffing likes or activity XP; Community Awards; Credits; rules engine; transliteration; “did you mean” lists; self-target toggle; skipping older awards on `self`/`award_full`; connector replies; new OBS URLs.

## Impact

Matcher, ingest, SQLite, like grant reuse, WebSocket, overlay/admin/dock, EN/RU copy, counters, tests, and `[Unreleased]` changelog. Localhost boundary unchanged. Additive migration; older binaries ignore unknown actions and outcome statuses.
