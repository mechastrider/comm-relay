---
name: connector-oauth
description: OAuth flows for platform connectors (YouTube MVP). Use when implementing authorization URLs, callbacks, token storage, and admin connect buttons.
---

# Connector OAuth

Patterns adapted from knowledge-db (`internal/oauthcommon`, `internal/googleoauth`) — simplified for a single-user local app.

## Goals

- Minimal steps: user clicks **Connect** in admin → browser → provider → redirect back to localhost.
- Tokens stored on disk in config (or encrypted sidecar); never logged.
- Refresh tokens used automatically before Live Chat API calls expire.

## Flow

1. `GET /oauth/youtube/start` — generate `state`, store in memory or short-lived cookie, redirect to Google authorize URL with `access_type=offline` and required scopes for YouTube Live Chat.
2. `GET /oauth/youtube/callback?code=...&state=...` — verify `state`, exchange `code` for tokens, persist refresh token, redirect to `/` with success query flag.
3. Connector reads tokens from config on `Run`.

## State parameter

- Cryptographically random `state` (e.g. 32 bytes hex).
- Validate exact match on callback — reject missing or mismatched state with 400 and log Warn.

## Redirect URI

- Fixed localhost callback matching Google Cloud console: `http://127.0.0.1:8080/oauth/youtube/callback` (or configured port).
- Document port alignment with `server_port` in README.

## Security (local app)

- Bind HTTP to `127.0.0.1` by default.
- Do not expose admin on `0.0.0.0` without explicit flag.
- `config.json` in `.gitignore`; example file without secrets.

## Error handling

- User denies consent → redirect with `?oauth_error=denied` and friendly admin message.
- Token exchange failure → Error log without response body secrets; 500 on callback with generic message.

## Twitch (MVP)

- May use token or IRC nick/channel from config without full OAuth in MVP — document in connector package.
- When adding Twitch OAuth later, reuse the same `oauthcommon`-style state and callback layout under `/oauth/twitch/...`.

## Related

- [api-conventions](../api-conventions/SKILL.md)
- [ux-form-practices](../ux-form-practices/SKILL.md)
- [golang-logging](../golang-logging/SKILL.md) — no token logging
