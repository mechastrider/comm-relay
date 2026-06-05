# CR-022: Add Rich Chat Admin Controls and Diagnostics

Status: `todo`

## Goal

Expose controls and diagnostics for emote providers and image previews in the admin UI.

## Context

Rich chat rendering should be configurable because third-party provider APIs can fail and image previews have security tradeoffs.

Research plan: [Emoji and Rich Media Provider Research](../emoji-provider-research.md).

## Scope

- Add config fields for enabling Twitch/FFZ/BTTV/7TV rendering.
- Add config fields for image preview allowlist and limits.
- Add admin controls for rich chat settings.
- Show provider cache counts, last refresh time, and last errors.
- Validate settings in API handlers.

## Out Of Scope

- Implementing provider fetchers.
- Full emote picker UI.
- CDN proxy.

## Acceptance Criteria

- Admin UI can enable/disable rich chat features.
- Invalid allowlist/settings return structured validation errors.
- Diagnostics make provider failures understandable without reading logs.

## Checks

- `go test ./...`
- Static UI smoke for admin forms and `/overlay`.

