# Emoji and Rich Media Provider Research

Date: 2026-06-05

External references checked on 2026-06-05:

- Twitch Helix chat emotes reference: <https://dev.twitch.tv/docs/api/reference#get-channel-emotes>
- Twitch Helix global emotes reference: <https://dev.twitch.tv/docs/api/reference#get-global-emotes>
- Twitch IRC/EventSub emote fragments notes: <https://dev.twitch.tv/docs/chat/irc-migration/#emotes>
- FFZ developer/API docs: <https://www.frankerfacez.com/developers>
- FFZ OpenAPI docs: <https://api.frankerfacez.com/>
- BTTV cached v3 endpoint discussion and support caveat: <https://github.com/night/betterttv/issues/3593>
- SevenTV old API repository archive notice: <https://github.com/SevenTV/API>
- SevenTV current monorepo: <https://github.com/SevenTV/SevenTV>
- SevenTV EventAPI archive/reference: <https://github.com/SevenTV/EventAPI>

## Goal

Plan Twitch emotes, BTTV, FFZ, 7TV, and safe image link previews without turning Chat Relay into an image cache or a remote-content proxy.

This document uses "emote" for platform chat images and "emoji" only as the broader user-facing feature name.

## Current Product Fit

Chat Relay currently sends plain chat text through the unified `ChatMessage` model and the `/ws` payload. The OBS overlay renders message text with DOM text nodes, which is the right security baseline. Rich message rendering should preserve that model:

- keep `message` as plain text for compatibility;
- add optional structured fragments later;
- render fragments with DOM APIs, not `innerHTML`;
- keep provider-specific API details out of overlay code where possible.

## Provider Sources

### Twitch

Recommended first provider.

Sources:

- IRC message tags, already parsed by `github.com/gempir/go-twitch-irc/v4` as `PrivateMessage.Emotes`.
- Helix `GET /helix/chat/emotes` for broadcaster emotes.
- Helix `GET /helix/chat/emotes/global` for Twitch global emotes.
- Helix `GET /helix/chat/emotes/set` for known emote sets.

Notes:

- Native Twitch emotes in live chat should be rendered from IRC positions first, because they prove the sender was allowed to use that emote in that message.
- Helix metadata requires Twitch app/user authentication. It is useful for global/channel catalog refreshes, but not required for the first native-emote renderer.
- Twitch image URLs can be built from the documented template: `https://static-cdn.jtvnw.net/emoticons/v2/{id}/{format}/{theme_mode}/{scale}`.

### FFZ

Recommended second provider.

Sources:

- `GET https://api.frankerfacez.com/v1/room/{roomName}`
- `GET https://api.frankerfacez.com/v1/room/id/{twitchID}`
- `GET https://api.frankerfacez.com/v1/set/global`
- `GET https://api.frankerfacez.com/v1/set/{setID}`

Notes:

- FFZ has public documentation for room, set, and global set endpoints.
- Channel room responses include the relevant emote sets, which fits the local one-channel-per-platform MVP shape.
- FFZ supports modifier emotes. First implementation may ignore modifiers and render them as ordinary emotes, but the limitation should be documented in UI/release notes.

### BTTV

Recommended after FFZ.

Sources:

- `GET https://api.betterttv.net/3/cached/emotes/global`
- `GET https://api.betterttv.net/3/cached/users/twitch/{twitchID}`

Notes:

- BTTV's owner has stated that these APIs are not officially supported for third-party clients and may change.
- The cached v3 endpoints are the practical integration surface used by third-party tools.
- Treat BTTV as best-effort. Failure should set provider diagnostics and leave chat text intact.

### 7TV

Recommended after Twitch, FFZ, and BTTV.

Sources:

- Current practical REST surface: `GET https://7tv.io/v3/users/twitch/{twitchID}` and `GET https://7tv.io/v3/emote-sets/global`.
- Emote images are normally loaded from `https://cdn.7tv.app/emote/{id}/{scale}.webp`.
- The old `SevenTV/API` repository is archived; newer work moved to the `SevenTV/SevenTV` monorepo.
- Event updates are available through the 7TV event API, but polling is simpler and safer for first support.

Notes:

- 7TV API stability is the highest risk among the planned providers.
- First implementation should poll and cache. Realtime event subscriptions can be a later enhancement.
- Keep the adapter isolated behind a provider interface so endpoint changes do not leak into overlay code.

## Unified Fragment Model

Add optional structured fragments after the current plain message path:

```json
{
  "type": "message",
  "platform": "twitch",
  "user": "Commander",
  "message": "Hello Kappa https://example.com/image.png",
  "fragments": [
    { "type": "text", "text": "Hello " },
    {
      "type": "emote",
      "text": "Kappa",
      "provider": "twitch",
      "id": "25",
      "url": "https://static-cdn.jtvnw.net/emoticons/v2/25/static/dark/2.0",
      "width": 28,
      "height": 28,
      "animated": false
    },
    { "type": "text", "text": " " },
    {
      "type": "image_link",
      "text": "https://example.com/image.png",
      "url": "https://example.com/image.png",
      "width": 320,
      "height": 180
    }
  ]
}
```

Rules:

- `message` remains required and plain.
- `fragments` is optional and clients that do not understand it ignore it.
- Fragment text is always escaped by DOM text nodes.
- Fragment URLs must be absolute `https://` URLs after normalization.
- Unknown fragment types are ignored or rendered as text.

## Matching Strategy

Native Twitch:

- Use IRC emote positions from `PrivateMessage.Emotes`.
- Convert positions to ordered text/emote fragments.
- Prefer this over dictionary matching for Twitch native emotes.

Third-party providers:

- Build per-channel dictionaries: `code -> EmoteMetadata`.
- Merge dictionaries in deterministic priority order.
- Recommended priority for duplicate codes: Twitch native positions first, then channel-specific 7TV/BTTV/FFZ, then provider globals.
- Token matching should operate on chat tokens, not arbitrary substrings. Sort codes by length only within a token-safe matcher.

## Caching Plan

Backend metadata cache:

- Scope: active channels only, plus selected global provider sets.
- Data stored: provider, scope, code, id, CDN URL template/final URLs, width, height, animated, last refresh, source ETag/Last-Modified when available.
- Data not stored: image bytes.
- Default TTLs:
  - channel sets: 10-15 minutes;
  - global sets: 6-24 hours;
  - error retry: exponential backoff up to 5 minutes.
- Refresh triggers:
  - connector enable/start;
  - channel change;
  - stale TTL;
  - manual refresh button later.

Overlay/browser cache:

- Use normal browser image caching.
- Set `loading="lazy"` and `decoding="async"` on non-critical image fragments where supported.
- Keep max visible messages and TTL as the primary memory bound.
- Do not prefetch entire provider catalogs in the overlay.

## Memory Budget

Target budget for emote metadata in the Go process:

- normal case: under 10 MB for one active Twitch channel with Twitch, FFZ, BTTV, and 7TV enabled;
- upper target: under 25 MB for several active channels or unusually large 7TV sets;
- hard behavior: evict inactive channel metadata rather than growing unbounded.

Rationale:

- metadata maps are small compared with image bytes;
- image bytes should stay in the OBS browser process cache, not in the Go process;
- bounded visible messages plus TTL limits the number of live `<img>` nodes.

Implementation guardrails:

- cap provider response size before decoding when possible;
- cap emotes per provider/scope in config defaults;
- expose provider cache counts in diagnostics;
- never retain raw provider JSON after normalizing metadata.

## Safe Image Link Previews

Goal: if a chat message contains a direct image link, the overlay can show the image without creating SSRF or local network probing risks.

Threats:

- SSRF through a backend image proxy or metadata fetcher.
- Browser-side requests from OBS to `localhost`, private LAN hosts, router admin pages, cloud metadata IPs, or DNS-rebinding destinations.
- Tracking pixels and hostile oversized images.
- Mixed content and non-image URLs disguised as image links.

Security policy:

- No backend fetch/proxy for user-posted image URLs in the first implementation.
- Default to `https://` only.
- Default allowlist for automatic previews, for example known public image/CDN hosts. Unknown hosts render as text links or disabled placeholders.
- Reject localhost, `.local`, raw private/reserved IPs, non-standard ports, credentials in URL, and suspicious schemes.
- Reject redirects in any future backend validator unless every hop is revalidated against public IP and scheme rules.
- Add config switches:
  - `overlay.image_previews.enabled`;
  - `overlay.image_previews.allowed_hosts`;
  - `overlay.image_previews.max_width_px`;
  - `overlay.image_previews.max_height_px`;
  - `overlay.image_previews.max_per_message`.
- Set `referrerpolicy="no-referrer"` on preview images.
- Use CSS max dimensions and object fit so images cannot blow up the overlay layout.

Practical first version:

- Parse direct image URLs ending in `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, or `.avif`, with query strings allowed.
- Only render if host is in `allowed_hosts`.
- Render with `<img>` built through DOM APIs.
- Add `alt` text equal to a short sanitized label like `chat image`.
- Keep original URL visible as text when preview is blocked.

## Recommended Implementation Phases

1. Add optional message fragments to the Go model and WebSocket wire format.
2. Add a safe overlay fragment renderer that can render text, emotes, and blocked/unknown fragments without `innerHTML`.
3. Render Twitch native IRC emotes using existing `go-twitch-irc` emote positions.
4. Add emote metadata cache interfaces, diagnostics, and config.
5. Add FFZ provider.
6. Add BTTV provider as best-effort.
7. Add 7TV provider behind an isolated adapter.
8. Add safe image link previews with strict defaults.
9. Add admin toggles for providers and image previews.

## Follow-Up Backlog

- `CR-015`: Add rich message fragments to chat model and WebSocket payload.
- `CR-016`: Add safe overlay fragment renderer.
- `CR-017`: Render Twitch native IRC emotes.
- `CR-018`: Add emote provider metadata cache.
- `CR-019`: Add FFZ and BTTV emote providers.
- `CR-020`: Add 7TV emote provider.
- `CR-021`: Add safe image link previews.
- `CR-022`: Add admin controls and diagnostics for rich chat rendering.
