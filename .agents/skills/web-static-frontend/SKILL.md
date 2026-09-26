---
name: web-static-frontend
description: Static frontend conventions (HTML/CSS/vanilla JS, no framework) — page structure, client WebSocket, JS style, security, embedded desktop webviews.
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

Consumer repos map their real folders (admin, overlay, dock, etc.) in `AGENTS.md`; keep this skill path-agnostic.

## Overlay / widget pages

Static pages embedded in another host (browser source, iframe, kiosk display):

- `html, body { background: transparent; }` when the host requires transparency.
- Connect to `ws://` or `wss://` on the same host, path `/ws` (or project-specific path).
- Reconnect with exponential backoff on close/error.
- Cap DOM nodes (remove oldest); CSS transition for fade-in.
- Configurable limits via query string or injected `window.__WIDGET_CONFIG__` from a server template.

## Control panel

Admin or operator UI served as static HTML:

- Fetch status and config endpoints with `fetch`.
- Show connection state (connected / reconnecting / error) for each integration.
- Link to OAuth or setup URLs when the backend exposes them.
- Keep layout usable at desktop widths (~1280px); avoid marketing chrome.
- Height-capped dialogs, drawers, and split panes: follow [web-constrained-layout](../web-constrained-layout/SKILL.md). Do not clip overflowing chrome with `overflow: hidden` unless a descendant can scroll.

## JavaScript style

- Prefer small functions; avoid global pollution except one `init()` entry.
- `async/await` for API calls; handle `response.ok` and parse structured error bodies.
- No build step required for MVP (optional minify later).

## Security

- Treat admin pages as trusted only in their intended deployment context; still avoid `innerHTML` with unsanitized user content — use `textContent` or escape.
- Widget pages displaying live messages over WebSocket: escape HTML entities in usernames and message bodies.

## Packaged desktop shell (embedded webview)

When the same static UI runs inside a **desktop wrapper** (Wails, Tauri, Electron, etc.) that loads loopback HTTP or bundled assets:

- **Do not use `alert`, `confirm`, or `prompt`** in operator-facing admin or dock code. Webviews handle them poorly; use in-app `<dialog>` or shared modal helpers instead. Enforce with ESLint (`no-restricted-globals` / `no-restricted-properties`) on those trees — see [references/eslint-packaged-shell.md](references/eslint-packaged-shell.md).
- **Blob and file downloads** — do not scatter `<a download>` or `URL.createObjectURL` across feature modules. Route saves through **one shared module** that:
  - calls a **native save API** when the shell exposes bindings (save dialog + write bytes), and
  - falls back to anchor download in a normal browser.
  Keep `createObjectURL` and `link.download` inside that module only; block them elsewhere with ESLint `no-restricted-syntax`.
- **Native bridge** — document in the consumer repo where bindings live, which origins are allowed for IPC after navigation to loopback URLs, and how contract tests guard the bridge (static reads of shell entry + shared save module are enough for MVP).
- **Project paths and class names** belong in `AGENTS.md` or a product-local skill, not here.

## Related

- Forms: [ux-form-practices](../../ux/ux-form-practices/SKILL.md)
- Capped overlays and split panes: [web-constrained-layout](../web-constrained-layout/SKILL.md)

## Checklist

- [ ] Overlay/widget background transparent when required by host
- [ ] WebSocket reconnect with backoff
- [ ] Message limit and TTL behavior documented
- [ ] XSS-safe text rendering
- [ ] API JSON naming documented in the consumer repo
- [ ] Capped overlays follow `web-constrained-layout` (scroll the body, do not clip)
- [ ] Packaged shell: no native blocking dialogs in admin/dock; centralized blob save + ESLint guards
