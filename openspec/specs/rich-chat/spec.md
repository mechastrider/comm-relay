# Rich Chat

## Purpose

Enriches unified messages with emotes and optional safe image-link previews without fetching operator-untrusted URLs on the server.

## Requirements

### Requirement: Emote providers are independently togglable
`overlay.emotes` SHALL control Twitch, YouTube, VK, FFZ, BTTV, and 7TV. When a provider is disabled, connectors and enrichers MUST NOT attach that provider's emote fragments. Provider fetch failures SHALL leave plain `message` text intact.

#### Scenario: Third-party disabled
- **WHEN** `overlay.emotes.ffz`, `bttv`, and `7tv` are false
- **THEN** Twitch lines still show native IRC emotes if `overlay.emotes.twitch` is true, without FFZ/BTTV/7TV fragments

#### Scenario: Provider outage
- **WHEN** a third-party emote catalog request fails
- **THEN** chat continues with plain text (and any still-cached fragments) rather than dropping the message

### Requirement: Native emotes map from platform metadata
Twitch IRC emote positions SHALL become `emote` fragments with CDN URLs. Overlapping or out-of-bounds positions SHALL omit fragments and keep plain `message`. YouTube and VK native emotes SHALL follow the same fragment contract when those providers are enabled.

#### Scenario: Mixed text and Twitch emote
- **WHEN** IRC tags mark an emote span inside a message
- **THEN** fragments contain text blocks plus an `emote` block for that span

### Requirement: Image previews are opt-in and host-allowlisted
`overlay.image_previews.enabled` SHALL default to false. When enabled, connectors MAY add `image_link` fragments only for HTTPS URLs whose host is on `allowed_hosts`, without userinfo, with image file extensions, and within `max_per_message`. The backend MUST NOT fetch those user URLs. Private, loopback, and non-allowlisted hosts SHALL be rejected.

#### Scenario: Allowlisted image URL
- **WHEN** previews are enabled and a message contains `https://i.imgur.com/x.png`
- **THEN** an `image_link` fragment may be attached

#### Scenario: SSRF-like URL
- **WHEN** a message contains `http://127.0.0.1/secret.png`
- **THEN** no `image_link` fragment is attached

### Requirement: Overlay images are constrained
Clients SHALL render image-link fragments with bounded CSS size from `max_width_px` and `max_height_px`, `referrerpolicy="no-referrer"`, and no `innerHTML`.

#### Scenario: Preview image in overlay
- **WHEN** the overlay receives an `image_link` fragment
- **THEN** it shows a capped `<img>` and not a raw HTML snippet
