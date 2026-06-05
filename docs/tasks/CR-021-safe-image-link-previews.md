# CR-021: Add Safe Image Link Previews

Status: `done`

## Goal

Render direct image links from chat as images in the overlay while avoiding SSRF and local network probing risks.

## Context

Users may post image links in Twitch, YouTube, or VK chat. The overlay should be able to show trusted direct images, but user-controlled URLs are dangerous if fetched by the backend or blindly loaded by OBS.

Research plan: [Emoji and Rich Media Provider Research](../emoji-provider-research.md).

## Scope

- Parse direct image links from chat messages into `image_link` fragments.
- Add safe default config for image previews:
  - disabled or strict by default;
  - `https://` only;
  - host allowlist;
  - max previews per message;
  - max rendered dimensions.
- Reject localhost, private/reserved IPs, `.local`, credentials in URL, non-standard ports, and non-HTTP schemes.
- Render allowed previews in overlay with DOM-created `<img>` nodes.
- Set `referrerpolicy="no-referrer"` and layout-safe CSS.
- Keep blocked URLs visible as text.

## Out Of Scope

- Backend image proxy.
- Backend downloading or resizing remote images.
- OpenGraph/card previews.
- Video embeds.

## Acceptance Criteria

- Allowed direct image links render as bounded overlay images.
- Blocked or unknown-host links render as text only.
- The Go backend does not fetch user-posted image URLs.
- Tests cover URL validation edge cases.

## Checks

- `go test ./...`
- Static UI smoke for `/overlay`.

## Completion note

2026-06-05: Added `overlay.image_previews` config (disabled by default), `internal/imagelink` validation/enrichment, connector wiring, overlay `image_link` renderer with HTTPS/allowlist checks and bounded CSS. `go test ./...` passed. Manual overlay smoke not run in agent environment.

