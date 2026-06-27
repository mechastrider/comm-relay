---
name: web-static-frontend
description: Static admin and OBS overlay for comm-relay (HTML/CSS/JS under web/). Use when editing control panel, overlay, or client WebSocket code — no React on MVP.
---

# Static frontend — web/

Stack (MVP):

- Plain HTML, CSS, JavaScript (ES modules optional)
- No React, Vue, or Svelte until explicitly approved in concept

## Layout

```text
web/
├── admin/
│   ├── index.html
│   ├── app.js          # status, config, OAuth links
│   └── styles.css
├── dock/
│   ├── index.html
│   ├── messages.js     # recent history + live WebSocket messages
│   └── messages.css    # compact dark OBS dock layout
└── overlay/
    ├── index.html
    ├── overlay.js      # WebSocket client, message list DOM
    └── overlay.css     # transparent background, animations
```

## OBS overlay

- `html, body { background: transparent; }` — required for Browser Source.
- Connect to `ws://` or `wss://` same host, path `/ws`.
- Reconnect with exponential backoff on close/error.
- Cap DOM nodes (remove oldest); CSS transition for fade-in.
- Configurable max messages and TTL via query string or injected `window.__OVERLAY_CONFIG__` from server template.

## Admin panel

- Fetch `/api/status` and config endpoints with `fetch`.
- Show per-platform connection state (connected / reconnecting / error).
- Link to OAuth start URL for YouTube; show channel name when configured.
- Keep layout usable at ~1280px width; no marketing chrome.

## OBS message dock

- Serve the messages-only operator view at `/dock/messages`.
- Keep the dock useful at narrow widths and separate from the scene overlay.
- Restore recent messages, then consume live messages from `/ws` with reconnect.
- Preserve manual scroll position while the operator reads older messages.

## JavaScript style

- Prefer small functions; avoid global pollution except one `init()` entry.
- `async/await` for API calls; handle `response.ok` and parse `{"error":"..."}`.
- No build step required for MVP (optional minify later).

## Security

- Admin is localhost-trusted; still avoid `innerHTML` with unsanitized chat text — use `textContent` or escape.
- Overlay displays chat from WebSocket: escape HTML entities in usernames and messages.

## Related

- Forms: [ux-form-practices](../ux-form-practices/SKILL.md)
- Wire format: [comm-relay](../comm-relay/SKILL.md), [api-conventions](../api-conventions/SKILL.md)

## Checklist

- [ ] Overlay background transparent
- [ ] WebSocket reconnect
- [ ] Message limit and TTL behavior match concept
- [ ] XSS-safe text rendering
- [ ] API field names snake_case
