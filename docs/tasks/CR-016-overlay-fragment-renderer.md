# CR-016: Add Safe Overlay Fragment Renderer

Status: `done`

## Goal

Render structured chat fragments in the OBS overlay safely, without using `innerHTML`.

## Context

Fragments will be introduced by CR-015. Overlay rendering must preserve the current XSS-safe behavior.

Research plan: [Emoji and Rich Media Provider Research](../emoji-provider-research.md).

## Scope

- Render text fragments as DOM text nodes.
- Render emote fragments as `<img>` nodes with safe attributes.
- Render unsupported fragments as text fallback where possible.
- Preserve message TTL, max visible messages, scrolling, and current themes.
- Add CSS for inline emotes that does not shift layout aggressively.

## Out Of Scope

- Provider metadata loading.
- Image link preview policy.
- Admin controls.

## Acceptance Criteria

- Plain messages render exactly as before.
- Fragment messages render safely without `innerHTML`.
- Broken image loads do not break the message row.

## Checks

- Static UI smoke for `/overlay`.
- Documentation review.

## Completion Note

- Implemented DOM-only fragment rendering in the overlay: text fragments use text nodes, emote fragments use constrained `<img>` nodes, and unsupported or failed emote fragments fall back to text.
- Verified with Go tests/build, `innerHTML` search, and a browser smoke harness for plain, emote, and fallback rows.

