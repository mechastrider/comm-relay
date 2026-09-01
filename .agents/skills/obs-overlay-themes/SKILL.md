---
name: obs-overlay-themes
description: Design and implement CommRelay OBS overlay themes for on-stream surfaces (chat, leaderboard, and /overlay/alert). Use when creating, refining, or debugging overlay themes, HUD panels, popup message styles, alert splashes, Browser Source rectangle behavior, message queue layout, leaderboard panel/chips layouts, clipping, fading, animation, and stream-readability issues in web/overlay, web/leaderboard, and web/alert.
---

# OBS Overlay Themes

Use this together with `web-static-frontend` for static files and `comm-relay` for product behavior. This skill captures the practical rules learned while building cockpit-style stream themes.

## Surfaces

A **theme** is the on-stream visual language (tokens, chrome, body classes `overlay-theme--*`). It is not limited to chat.

- Chat (`/overlay`), leaderboard (`/overlay/leaderboard`), and alert splashes (`/overlay/alert`, `web/alert/`) share the same theme id and style tokens.
- A **new theme** must cover every on-stream surface that uses themes (today: chat + leaderboard + alert).
- A **new surface** must implement every existing theme (same body classes; surface-specific CSS selectors).
- Do not theme `/dock/messages` — that is operator chrome, not an on-stream surface.
- Leaderboard layout (`panel` | `chips`) is a surface override, not a new theme id. Popup chat themes do not force chips on the ranking.

## Preview sample rules

- Admin Appearance preview for leaderboard uses `preview=sample` with a built-in fictitious top-5.
- Admin Appearance preview for alert uses `preview=sample` with a built-in fictitious splash; it must not rely on live `/ws` alert frames as the only preview.
- Sample mode must not fetch live `/api/leaderboard` or paint live `leaderboard` WebSocket frames.
- Shared `preview_background` values match chat (`white`, `checker`, `scene`, `dark`; legacy `busy` → `scene`).
- Outside preview, `html`/`body` stay transparent for OBS on every themed surface (chat, leaderboard, alert).

## Workflow

1. Inspect the current overlay structure before editing:
   - `web/overlay/index.html`, `web/overlay/overlay.js`, `web/overlay/overlay.css`
   - `web/leaderboard/` when the change affects ranking
   - `web/alert/` when the change affects command/award splashes
   - admin/config files if the theme must be selectable
2. Decide whether the request is:
   - a mockup only, usually under `docs/mockups/`;
   - a real selectable theme, requiring config validation, admin options, JS theme mapping, CSS for **all** themed surfaces, README/changelog updates;
   - a refinement of an existing theme, usually CSS-only unless behavior changes.
3. Treat the OBS Browser Source as the frame. Theme containers should usually fill `position: fixed; inset: 0; width: auto; height: auto;` so users can place and resize the source rectangle in OBS.
4. Verify the stream-state cases:
   - no messages / empty ranking;
   - one short message;
   - many rapid messages;
   - long multi-line messages;
   - messages leaving by TTL;
   - overlay reload with recent-message restore, when relevant;
   - leaderboard `panel` and `chips` for each theme when touching ranking CSS;
   - alert splash sample preview and live queue for each theme when touching alert CSS.

## Theme Registration

For a new selectable theme, update all theme surfaces consistently:

- `internal/config`: add the theme constant and validation.
- Config tests: cover known theme validation.
- `web/admin/index.html`: add the select option and theme label mapping in appearance JS.
- `web/overlay/overlay.js`, `web/leaderboard/leaderboard.js`, and `web/alert/alert.js`: body class mapping (`overlay-theme--*`).
- `web/overlay/overlay.css`: chat visual style and shared HUD tokens.
- `web/leaderboard/leaderboard.css`: panel and chips rules for the new theme.
- `web/alert/alert.css`: splash visual style for the new theme.
- `README.md` / `README.en.md`: user-facing behavior and OBS sizing expectations.
- `CHANGELOG.md`: Russian `[Unreleased]` notes for streamer-visible overlay behavior.

Prefer snake_case config values and kebab-case CSS classes, for example `cockpit_panel` -> `overlay-theme--cockpit-panel`.

When a theme is branded or game-specific, keep these concerns separate:

- Admin labels and hints may include the game/product prefix, for example `MW5 Mercs Cockpit panel`.
- Persisted config values should stay stable unless the user explicitly asks for a migration.
- In-overlay HUD labels should only change when the user asks for visible overlay copy changes. Do not add a game prefix to the panel itself just because the admin theme name includes it.

## Layout Rules

- Keep `html, body` transparent for OBS.
- Design from the user's OBS rectangle, not from a full-page website mindset.
- Make fixed-format HUD frames responsive with stable dimensions: `inset`, `padding`, `minmax(0, 1fr)`, `box-sizing: border-box`, and explicit gaps.
- Avoid left rails or headers consuming too much chat space. Decorative HUD parts must stay small unless the user asks for a framed panel.
- Do not let titles overlap messages. Put panel titles in their own layer (`::before` can work), give messages a lower `z-index`, and add a gradient curtain if old messages scroll underneath.
- Do not draw page-level cards inside other cards. For popup themes, each message may be a card; the container should not look like an extra shared panel.
- Leave tiny internal padding on clipped HUD shapes so right edges and cut corners remain visible inside OBS.
- Use the OBS preview screenshots as layout evidence: if spacing looks wrong in OBS, tune the theme CSS rather than explaining it away as editor chrome.

## Chat Message Anatomy

- Keep `ChatMessage` rendering generic: platform metadata, display name, avatar URL, badges/fragments, and message text should map to theme-level CSS without platform-specific overlay branches.
- If adding avatars to a theme, reuse the admin behavior where practical: real `avatar_url` first, deterministic SVG fallback by identity, `referrerPolicy = "no-referrer"`, and broken-image fallback.
- Avoid loading avatar images in themes that do not display them. Use a hidden placeholder or conditional element creation so default/text-only themes do not start extra network requests.
- For per-author color, prefer a stable identity hash from platform + username/display name. Use it as an accent variable such as `--message-accent`.
- When the request says "indicators only", apply author color to rails, borders, glows, avatars, or small marks. Do not tint the full message background unless explicitly requested.
- Keep platform color and author color distinct: platform color can remain on names/icons, while author color drives small identity indicators.

## Message Queue Behavior

- Anchor new messages at the bottom of the rectangle so the latest message remains visible.
- Let old messages move upward as a queue; avoid motion loops. Animation should happen on entry and exit only.
- Use `overflow: hidden` on the queue container to keep the overlay inside the OBS rectangle.
- Avoid hard clipping where users will notice it:
  - panel themes: fade old text under the title/header with a gradient overlay;
  - popup themes: apply a top alpha mask on the queue container so old cards fade out near the upper edge;
  - long text: prefer wrapping over ellipsis for message bodies.
- If a single message is taller than the entire Browser Source, the rectangle physically cannot show all of it. In that case, preserve the newest/bottom part and fade the top rather than hiding the latest message.

## Text And Animation

- Chat text must be readable over game footage: strong font weight, moderate shadow, restrained glow.
- User names can be compact and uppercase; body text should wrap naturally.
- Avoid fixed-width username columns unless deliberate alignment is more important than density. For cockpit panel layouts, prefer `fit-content(<limit>)` plus `max-width` and ellipsis so short names do not create a large gap before message text.
- For long/multi-line message bodies, align the username to the first text line, not to the top edge of the avatar or entire row. CSS grid `align-items: baseline` often gives the right result; set avatars to `align-self: start` and rails to `align-self: stretch` if they should not participate in baseline alignment.
- Preserve wrapping for message bodies. Use ellipsis for compact metadata such as display names, not for chat text.
- Avoid moving existing text during idle display. Use short `fade/blur/translate` only for appearing and leaving states.
- Do not use viewport-scaled font sizes that can become unpredictable. Prefer existing overlay font variables plus clamps already used by the repo.

## Changelog Notes

- For user-visible overlay theme work, update `CHANGELOG.md` with the `changelog` skill.
- Before adding a new `[Unreleased]` bullet, scan current unreleased overlay entries. If the work refines an unreleased theme, edit that existing bullet instead of creating a new adjacent bullet.
- Be precise about where visible copy changes appear: "in settings" means admin labels/hints, not the OBS panel itself.

## Visual Iteration Checklist

Before calling a theme done:

- Check right, top, and bottom edges for clipped borders or decorative extra strips.
- Check that header/title text never covers messages.
- Check that admin theme names match the intended product/game prefix while HUD labels remain intentionally chosen.
- Check long messages with Cyrillic and Latin text.
- Check short and long display names: short names should not leave awkward empty space, long names should truncate cleanly before the message body.
- Check multi-line messages: username baseline should line up with the first line of chat text.
- Check avatar presence and fallback behavior, including missing or broken `avatar_url`.
- Check author accent behavior: color should be stable per user and limited to indicators unless the user asked for background tinting.
- Check rapid-message overflow: latest message visible, older messages fade or leave gracefully.
- Check empty state: panel themes may show only the frame if intended; popup themes should show nothing.
- Run `git diff --check`.
- Run relevant Go tests when config/admin behavior changes; for CSS-only refinements, state if no browser smoke was run.
