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
├── panel/
│   ├── index.html
│   ├── app.js          # status, config, API calls
│   └── styles.css
└── widget/
    ├── index.html
    ├── widget.js       # WebSocket client, message list DOM
    └── widget.css      # transparent background, animations (when embedded)
```

## Overlay / widget pages

Static pages embedded in another host (browser source, iframe, kiosk display):

- `html, body { background: transparent; }` when the host requires transparency.
- Connect to `ws://` or `wss://` on the same host, path `/ws` (or project-specific path).
- Reconnect with exponential backoff on close/error.
- Cap DOM nodes (remove oldest); CSS transition for fade-in.
- Configurable limits via query string or injected `window.__WIDGET_CONFIG__` from a server template.

## Control panel

Admin or operator UI served as static HTML:

- Fetch `/api/status` and config endpoints with `fetch`.
- Show connection state (connected / reconnecting / error) for each integration.
- Link to OAuth or setup URLs when the backend exposes them.
- Keep layout usable at desktop widths (~1280px); avoid marketing chrome.

## JavaScript style

- Prefer small functions; avoid global pollution except one `init()` entry.
- `async/await` for API calls; handle `response.ok` and parse `{"error":"..."}`.
- No build step required for MVP (optional minify later).

## Security

- Treat admin pages as trusted only in their intended deployment context; still avoid `innerHTML` with unsanitized user content — use `textContent` or escape.
- Widget pages displaying live messages over WebSocket: escape HTML entities in usernames and message bodies.

## Related

- Forms: [ux-form-practices](../../ux/ux-form-practices/SKILL.md)
- API shape: [api-conventions](../../../backend/go/api-conventions/SKILL.md)

## Checklist

- [ ] Overlay/widget background transparent when required by host
- [ ] WebSocket reconnect with backoff
- [ ] Message limit and TTL behavior documented
- [ ] XSS-safe text rendering
- [ ] API field names snake_case
