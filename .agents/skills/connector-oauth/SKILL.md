---
name: connector-oauth
description: OAuth flows for platform connectors (YouTube MVP). Use when implementing authorization URLs, callbacks, token storage, and admin connect buttons.
---

# Connector OAuth

Patterns adapted from knowledge-db (`internal/oauthcommon`, `internal/googleoauth`) — simplified for a single-user local app.

## Goals

- Minimal steps: user clicks **Connect** in admin → **system browser** → provider → redirect back to localhost callback.
- Never navigate the CommRelay admin webview (Wails) to the provider login page.
- Tokens stored on disk in config (or encrypted sidecar); never logged.
- Refresh tokens used automatically before Live Chat API calls expire.

## Flow

1. `POST /api/youtube/oauth/start` — generate `state`, open Google authorize URL in the OS browser, return `{ "opened", "authorization_url" }` to admin JS.
2. Legacy `GET /oauth/youtube/start` — same browser open, redirect admin to `/?oauth=pending` (do **not** redirect the client to Google).
3. `GET /oauth/youtube/callback?code=...&state=...` — verify `state`, exchange `code` for tokens, persist refresh token, render a short HTML completion page in the browser tab.
4. Admin polls `/api/diagnostics` (connectors) until `oauth_connected` is true.
5. Connector reads tokens from config on `Run`.

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
- Use `internal/browser.OpenURL` (xdg-open / open / rundll32) for provider login — not embedded webview.

## Error handling

- User denies consent → HTML result page in browser tab; admin may show `?oauth_error=denied` for legacy GET start failures.
- Token exchange failure → Error log without response body secrets; HTML error page on callback.
- Browser open failure → `opened: false` in POST response; admin shows authorization URL or error banner.

## Twitch (MVP)

- May use token or IRC nick/channel from config without full OAuth in MVP — document in connector package.
- When adding Twitch OAuth later, reuse the same `oauthcommon`-style state and callback layout under `/oauth/twitch/...`.

## Related

- [api-conventions](../api-conventions/SKILL.md)
- [ux-form-practices](../ux-form-practices/SKILL.md)
- [golang-logging](../golang-logging/SKILL.md) — no token logging
