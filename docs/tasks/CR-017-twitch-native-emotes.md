# CR-017: Render Twitch Native IRC Emotes

Status: `done`

## Goal

Render native Twitch emotes from IRC message metadata.

## Context

`go-twitch-irc` already parses Twitch IRC emote IDs, names, and positions. This should be the first emote implementation because it does not require matching by provider dictionaries.

Research plan: [Emoji and Rich Media Provider Research](../emoji-provider-research.md).

## Scope

- Map `twitch.PrivateMessage.Emotes` into chat message fragments.
- Build Twitch CDN image URLs from emote IDs.
- Preserve the original plain message text.
- Add mapper tests for repeated emotes and mixed text/emote messages.

## Out Of Scope

- Twitch Helix emote catalog sync.
- BTTV, FFZ, and 7TV.
- Emote picker UI.

## Acceptance Criteria

- Twitch native emotes appear in overlay for live IRC messages.
- Messages without emotes behave as before.
- Malformed or overlapping positions fall back to plain text safely.

## Checks

- `go test ./...`
- Static UI smoke for `/overlay`.

## Completion Note

- Twitch `MapPrivateMessage` maps IRC `Emotes` positions into ordered `fragments` with Twitch CDN URLs; plain `message` is unchanged. Invalid or overlapping positions omit fragments. Overlay already renders emote fragments from CR-016; no UI changes required.

