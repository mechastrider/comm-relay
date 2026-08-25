---
name: ux-form-practices
description: Form UX — labels, validation, errors, accessibility, mobile-friendly inputs. Use when adding or reviewing forms.
---

# Form UX

Apply when working on forms in page components and related UI.

## Workflow

1. List fields and types (text, URL, select, boolean).
2. Use controlled inputs with clear labels.
3. Validate on submit; optional soft checks on blur for format fields.
4. Show errors next to fields; support keyboard and screen readers.
5. On mobile, set `inputMode` and adequate tap targets (~44px).

## Baseline rules

- Every control has a visible `<label>` or correct `aria-label`
- Do not use placeholder as the only label
- Disable submit while `loading` or when required fields are empty
- After failed submit, focus the first invalid field
- Clear field-level error when the user fixes input

## Text and URL fields

- **Long text**: textarea with a clear label; type or category selector when the domain has variants
- **URLs**: trim whitespace; show readable validation ("Enter a valid URL")
- Do not expose raw server stack traces in the UI

## Server errors

Map HTTP status to short user-facing messages in the API client or page:

| Status | User message (example) |
|--------|-------------------------|
| 401 | Session expired — sign in again |
| 403 | Not allowed |
| 404 | Not found |
| 409 | Conflict — refresh and retry |
| 422 | Validation failed (field messages when available) |
| 5xx | Server error — try again later |
| Network | Connection problem |

Backend returns `{"error":"..."}` (snake_case body fields on success payloads). Normalize in the API client before showing toasts or inline errors.

## Accessibility

- `htmlFor` / `id` on label + input
- `aria-invalid` and `aria-describedby` when showing errors
- `role="alert"` or `aria-live="polite"` for dynamic error banners

## Icon-only controls

Every icon-only button or control **must** show a hover/focus tooltip with a short
label.

- Pair tooltip text with an accessible name (`aria-label` or visible text) for
  screen readers.
- Localize tooltip copy when the app supports i18n.
- Show tooltips on pointer hover and keyboard focus (`:focus-visible`).
- Implement markup and styles in the **consumer repository** — hub skills state
  the requirement, not CSS class names or file paths.

See [skill-authoring](../../../devtools/skill-authoring/SKILL.md) for what belongs
in hub skills vs project docs.

## Numeric fields

- `inputMode="decimal"` is only a hint — validate in code
- Normalize `,` → `.` for locales
- Keep editing state as string; send parsed number to API

## Forms inside overlays

If the form sits in a height-capped dialog, modal, or drawer, the **fields** must live in a scrollable pane. Sticky Save / Cancel stay in the overlay footer, outside that pane. Do not assume the overlay is tall enough after adding hints or `<details>`.

Layout rules (height chain, `min-height: 0`, visible scrollbar): [web-constrained-layout](../../web/web-constrained-layout/SKILL.md).

## Checklist

- [ ] Controlled inputs with labels
- [ ] Submit disabled during in-flight request
- [ ] Errors visible and associated with fields
- [ ] API errors mapped to friendly text
- [ ] Icon-only controls have hover/focus tooltips
- [ ] Mobile: readable layout without horizontal scroll on primary actions
- [ ] Overlay forms: last fields reachable by scrolling; footer not covering inputs
