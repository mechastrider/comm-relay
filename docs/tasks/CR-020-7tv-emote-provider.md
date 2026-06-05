# CR-020: Add 7TV Emote Provider

Status: `done`

## Goal

Add 7TV metadata support behind an isolated provider adapter.

## Context

7TV is important for Twitch chat quality, but the API surface has changed over time and the old v3 API repository is archived. Keep this integration easy to replace.

Research plan: [Emoji and Rich Media Provider Research](../emoji-provider-research.md).

## Scope

- Load active Twitch channel 7TV emote set metadata.
- Load global 7TV emote metadata if practical.
- Normalize 7TV payloads into the cache model from CR-018.
- Match 7TV emote codes into message fragments.
- Document endpoint assumptions in code comments or provider package docs.

## Out Of Scope

- 7TV Event API realtime updates.
- 7TV OAuth or emote management.
- Downloading or proxying image bytes.

## Acceptance Criteria

- 7TV emotes render in overlay when enabled and known for the active channel.
- Endpoint/API failures are isolated to 7TV diagnostics.
- Original chat text remains visible when metadata is unavailable.

## Checks

- `go test ./...`
- Static UI smoke for `/overlay`.

## Completion Note

Added `internal/emote/seventv` fetcher (v3 global + Twitch channel endpoints, isolated adapter with documented assumptions). Wired into bootstrap, periodic refresh, and third-party enricher lookup (channel 7TV before FFZ/BTTV). `go test ./...` passed; overlay unchanged (no UI edits).

