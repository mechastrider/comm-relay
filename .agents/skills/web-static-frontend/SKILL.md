---
name: web-static-frontend
description: Static frontend conventions (HTML/CSS/vanilla JS, no framework) — page structure, client WebSocket, JS style, security.
---

# Static frontend (HTML/CSS/vanilla JS)

Stack:

- Plain HTML, CSS, JavaScript (ES modules optional)
- No React, Vue, or Svelte unless the project explicitly adopts a framework

## Layout

```text
web/
├── shared/
│   └── chat-render.js  # shared fragment/avatar DOM helpers (ES module)
├── admin/
│   ├── index.html
│   ├── app.js          # thin ES module entry (init/wiring)
│   ├── js/             # settings, messages, status, overlay preview, …
│   ├── styles.css      # @import aggregator
│   └── styles/         # section stylesheets
├── dock/
│   ├── index.html
│   ├── messages.js     # recent history + live WebSocket messages
│   └── messages.css    # compact dark OBS dock layout
└── overlay/
    ├── index.html
    ├── overlay.js      # WebSocket client, message list DOM
    └── overlay.css     # transparent background, animations
```

## Overlay / widget pages

Static pages embedded in another host (browser source, iframe, kiosk display):

- `html, body { background: transparent; }` when the host requires transparency.
- Connect to `ws://` or `wss://` on the same host, path `/ws` (or project-specific path).
- Reconnect with exponential backoff on close/error.
- Cap DOM nodes (remove oldest); CSS transition for fade-in.
- Configurable limits via query string or injected `window.__OVERLAY_CONFIG__` from a server template.

## Control panel

Admin or operator UI served as static HTML:

- Fetch `/api/status` and config endpoints with `fetch`.
- Show connection state (connected / reconnecting / error) for each integration.
- Link to OAuth or setup URLs when the backend exposes them.
- Keep layout usable at desktop widths (~1280px); avoid marketing chrome.

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

- Treat admin pages as trusted only in their intended deployment context; still avoid `innerHTML` with unsanitized user content — use `textContent` or escape.
- Overlay pages displaying live messages over WebSocket: escape HTML entities in usernames and message bodies.

## Related

- Forms: [ux-form-practices](../ux-form-practices/SKILL.md)
- Wire format: [comm-relay](../comm-relay/SKILL.md), [api-conventions](../api-conventions/SKILL.md)

## Checklist

- [ ] Overlay/widget background transparent when required by host
- [ ] WebSocket reconnect with backoff
- [ ] Message limit and TTL behavior documented
- [ ] XSS-safe text rendering
- [ ] API field names snake_case
