# CR-019: Add FFZ and BTTV Emote Providers

Status: `todo`

## Goal

Add FFZ and BTTV metadata providers for channel and global emotes.

## Context

FFZ has documented public endpoints. BTTV cached v3 endpoints are practical but unofficial, so BTTV support should be best-effort.

Research plan: [Emoji and Rich Media Provider Research](../emoji-provider-research.md).

## Scope

- Implement FFZ global and channel metadata loading.
- Implement BTTV global and Twitch-channel metadata loading.
- Normalize provider payloads into the cache model from CR-018.
- Match third-party emote codes into message fragments.
- Add connector/provider diagnostics for failures and counts.

## Out Of Scope

- 7TV provider.
- Realtime provider update subscriptions.
- Downloading or proxying image bytes.

## Acceptance Criteria

- FFZ and BTTV emotes render in overlay when enabled and known for the active channel.
- Provider failures leave original chat text intact.
- Cache counts and last errors are visible in diagnostics.

## Checks

- `go test ./...`
- Static UI smoke for `/overlay`.

