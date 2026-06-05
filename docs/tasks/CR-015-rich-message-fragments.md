# CR-015: Add Rich Message Fragments

Status: `todo`

## Goal

Extend the unified chat model and WebSocket payload with optional structured message fragments while keeping the existing plain `message` field backward-compatible.

## Context

Emoji/emote rendering and image link previews both need structured content. The overlay currently receives only plain text.

Research plan: [Emoji and Rich Media Provider Research](../emoji-provider-research.md).

## Scope

- Add a provider-neutral fragment model under `internal/bus`.
- Support at least `text`, `emote`, and `image_link` fragment types in Go structs.
- Extend `/ws` message JSON with optional `fragments`.
- Keep `message` unchanged for old clients.
- Add tests for JSON shape and backward compatibility.

## Out Of Scope

- Rendering fragments in overlay.
- Fetching provider metadata.
- Detecting links or emotes.

## Acceptance Criteria

- Existing WebSocket clients still receive `message`.
- New clients can read optional `fragments`.
- Unknown/empty fragments do not break message delivery.

## Checks

- `go test ./...`
- Documentation review.

