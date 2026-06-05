# CR-018: Add Emote Provider Metadata Cache

Status: `todo`

## Goal

Add a bounded backend cache for third-party emote metadata.

## Context

BTTV, FFZ, and 7TV require provider dictionaries. The Go process should cache metadata only, never image bytes.

Research plan: [Emoji and Rich Media Provider Research](../emoji-provider-research.md).

## Scope

- Define provider interfaces for global and channel-scoped emote metadata.
- Add an in-memory cache with TTL, per-provider counts, and bounded size.
- Add refresh/backoff behavior for provider failures.
- Add diagnostics fields for cache health and counts.
- Add unit tests for TTL, eviction, and failure behavior.

## Out Of Scope

- Concrete BTTV, FFZ, or 7TV implementations.
- Overlay rendering changes.
- Persisting cache to disk.

## Acceptance Criteria

- Cache stores normalized metadata only.
- Cache is bounded and evicts inactive/stale entries.
- Provider failures do not block chat message delivery.

## Checks

- `go test ./...`

