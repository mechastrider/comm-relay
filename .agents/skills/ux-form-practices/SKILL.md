---
name: ux-form-practices
description: Form UX for comm-relay admin (web/admin). Use when adding connection forms, overlay settings, or OAuth-related UI.
---

# Form UX — admin panel

Apply when working on forms in `web/admin/`.

## Workflow

1. List fields and types (text, toggle, channel name, port).
2. Use controlled inputs with visible labels.
3. Validate on submit; optional format check on blur (channel name, port).
4. Show errors next to fields; keyboard and screen reader friendly.
5. Adequate tap targets on touch devices (~44px).

## Baseline rules

- Every control has a visible `<label>` or correct `aria-label`
- Do not use placeholder as the only label
- Disable submit while request in flight
- After failed submit, focus first invalid field
- Clear field error when user edits the field

## CommRelay fields

| Area | Fields |
|------|--------|
| Server | `server_port` (number, 1024–65535) |
| Twitch | `enabled`, `channel` (lowercase login) |
| YouTube | `enabled`, connect via OAuth button (no manual token paste) |
| Overlay | max messages, message TTL, animation toggles |

Trim whitespace on text inputs. Channel names: reject obvious invalid characters client-side; server validates again.

## Server errors

Map HTTP status to short messages:

| Status | User message (example) |
|--------|-------------------------|
| 400 | Check the highlighted fields |
| 401 | Sign in required (OAuth) |
| 409 | Already connected — disconnect first |
| 503 | Platform not configured on server |
| 5xx | Server error — try again |
| Network | Cannot reach CommRelay — is it running? |

Backend: `{"error":"..."}`. Normalize in `app.js` before showing banners.

## OAuth UX

- Primary action: **Connect YouTube** → navigates to `/oauth/youtube/start`
- After callback, show success or error banner on admin home
- Do not display refresh tokens in the UI

## Accessibility

- `htmlFor` / `id` on label + input
- `aria-invalid` and `aria-describedby` for errors
- `role="alert"` or `aria-live="polite"` for dynamic status

## Checklist

- [ ] Labels on all controls
- [ ] Submit disabled while saving
- [ ] Errors visible and tied to fields
- [ ] No secrets shown in UI
- [ ] Mobile-friendly primary actions
