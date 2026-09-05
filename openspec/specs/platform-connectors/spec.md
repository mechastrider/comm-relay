# Platform Connectors

## Purpose

Ingests Twitch, YouTube Live, and VK Live chat into the unified bus with per-connector reconnect, live status, and optional SOCKS5 — without coupling platforms together.

## Requirements

### Requirement: Disabled connectors stay idle
A connector whose `enabled` flag is false SHALL report state `disabled` and MUST NOT open a platform session. Enabling it in config SHALL start ingest without requiring a process restart.

#### Scenario: Twitch disabled
- **WHEN** `twitch.enabled` is false
- **THEN** `/api/status` reports Twitch as `disabled` and no IRC session is opened

### Requirement: Twitch uses anonymous read-only IRC
When Twitch is enabled with a channel, the connector SHALL join that channel over anonymous IRC, map PRIVMSG lines into unified chat events, and reconnect with exponential backoff (1s–30s). Twitch MUST NOT require OAuth for public chat.

#### Scenario: Valid channel
- **WHEN** Twitch is enabled for channel `example`
- **THEN** the connector connects and publishes `platform` `twitch` messages from that channel

#### Scenario: Missing channel
- **WHEN** Twitch is enabled with an empty channel
- **THEN** status is `error` asking the operator to set a channel

### Requirement: YouTube supports simple page mode and API OAuth mode
YouTube SHALL default to connection mode `page` (channel handle / video URL, no Google Cloud). Mode `api` SHALL use stored OAuth tokens. `POST /api/youtube/oauth/start` SHALL open the system browser for Google consent and persist tokens in `config.json`. Tokens MUST never be logged. Redirect URI SHALL be `http://127.0.0.1:<server_port>/oauth/youtube/callback`.

#### Scenario: Simple mode
- **WHEN** YouTube is enabled with connection mode `page` and a channel handle
- **THEN** the connector reads public live chat without requiring a refresh token

#### Scenario: OAuth start
- **WHEN** the operator starts YouTube API connect with client credentials present
- **THEN** the system browser opens the Google authorization URL and the API returns `opened` plus `authorization_url`

### Requirement: VK Live is read-only without OAuth
When VK is enabled with a channel slug, the connector SHALL attach to the public VK Live WebSocket API and publish unified `vk` messages. No VK OAuth SHALL be required.

#### Scenario: Channel slug set
- **WHEN** VK is enabled with slug `example`
- **THEN** the connector connects and publishes `platform` `vk` messages

### Requirement: Per-connector reconnect and isolation
Each connector SHALL retry on disconnect with exponential backoff up to 30 seconds. A failure in one connector MUST NOT stop other connectors or the HTTP server. Connectors SHALL watch the config store so admin saves take effect without restart.

#### Scenario: YouTube disconnect
- **WHEN** the YouTube session drops while Twitch is connected
- **THEN** YouTube enters `reconnecting` or `error` and Twitch keeps publishing

### Requirement: Optional SOCKS5 applies per platform
Global SOCKS5 settings SHALL live under `network.socks5`. YouTube and VK MAY set `use_proxy`. When `use_proxy` is true, that connector SHALL dial through the configured SOCKS5 proxy. Twitch IRC SHALL remain direct in the current product.

#### Scenario: VK via proxy
- **WHEN** SOCKS5 address is set and `vk.use_proxy` is true
- **THEN** the VK connector uses that proxy

#### Scenario: Proxy not selected
- **WHEN** `youtube.use_proxy` is false
- **THEN** YouTube dials directly even if SOCKS5 settings exist

### Requirement: Connector status is queryable
`GET /api/status` and `GET /api/diagnostics` SHALL report per-platform state (`disabled`, `connecting`, `connected`, `reconnecting`, `error`), optional detail and last error, and message counts. Diagnostics SHALL also include app version, uptime, WebSocket client count, enabled connector ids, and emote cache health.

#### Scenario: Diagnostics while live
- **WHEN** Twitch is connected and overlay clients are attached
- **THEN** `GET /api/diagnostics` includes Twitch `connected`, a Twitch message count, and `websocket_clients` ≥ 1

### Requirement: YouTube API author photos map into avatar_url
When YouTube connection mode is `api` (or any path that uses Live Chat `AuthorDetails`), the connector SHALL copy a non-empty author `ProfileImageUrl` into the unified message `avatar_url`. Page-mode chat SHALL keep mapping the public page thumbnail when present. Empty photos SHALL omit `avatar_url` so later hub resolution can fill a cached or custom portrait.

#### Scenario: OAuth live chat with photo
- **WHEN** a YouTube API live chat item includes `AuthorDetails.ProfileImageUrl`
- **THEN** the published unified message has that URL as `avatar_url`

#### Scenario: Missing photo
- **WHEN** `ProfileImageUrl` is empty
- **THEN** the unified message omits `avatar_url` and ingest still counts the line
