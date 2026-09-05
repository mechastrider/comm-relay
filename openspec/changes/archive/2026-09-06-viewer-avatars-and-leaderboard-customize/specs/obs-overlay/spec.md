## ADDED Requirements

### Requirement: Empty chat avatars use the resolved viewer portrait
When a chat overlay row has a non-empty `avatar_url`, the overlay SHALL render that image with `referrerPolicy` `no-referrer` and fall back to the existing theme placeholder if the image fails. When `avatar_url` is empty, the overlay SHALL still render the theme avatar slot using the same placeholder. Live `/ws` `message` frames and `GET /api/messages/recent` history SHALL already carry a resolved `avatar_url` when the hub knows a cached or custom portrait for that identity, so Twitch lines without a platform photo can still show a face after a cache or custom upload exists.

#### Scenario: Twitch line after custom portrait
- **WHEN** a Twitch PRIVMSG has no platform avatar and the canonical viewer has a custom portrait enabled
- **THEN** the overlay row `avatar_url` is the local `/overlay/assets/{filename}` and the theme shows that image

#### Scenario: No portrait yet
- **WHEN** a first Twitch line arrives for an identity with no cache and no custom file
- **THEN** the overlay shows the existing placeholder avatar and does not invent a remote URL
