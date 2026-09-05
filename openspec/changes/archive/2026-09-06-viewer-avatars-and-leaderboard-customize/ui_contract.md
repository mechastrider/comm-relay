# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Audience viewers table | Recognize people by face | Admin `/` → Audience → Viewers | Same in browser and Wails WebView |
| Viewer card | Upload/clear custom portrait; hide from ranking | Inspector (≥1024px) or compact sheet | Existing wide/compact split; HTML file input, no native picker |
| Settings → Data | Disable custom portraits globally | Admin `/` → Settings | Same checkbox in both runtimes |
| Studio leaderboard inspector | Set overlay title and rank cap | Studio → Leaderboard surface | Preview iframe; Publish as today |
| `/overlay`, `/overlay/leaderboard`, `/overlay/alert`, Live, dock | Show resolved portraits / title / cap | Existing OBS URLs and Live tabs | OBS CEF must load local `/overlay/assets/` |

## Menus / Tray / Commands / Shortcuts

No native menu, tray, or global shortcut. File pickers are the browser `<input type="file">`. Hide and custom-portrait save use existing card buttons plus the new checkbox. Studio title and max-entries publish with the current overlay draft.

## View / Flow: Audience portraits and card

### Layout and Components

Viewer cell: circular (or rounded square) portrait, then the existing name button and chevron. Portrait size must not collapse the name. Card: large portrait, upload control, clear when a custom file exists, hide-from-leaderboard checkbox above or beside display name. Platform identities stay as text rows.

### Data / Forms / Actions

Table uses list `avatar_url`. Card uses get payload (`avatar_url`, `custom_avatar`, `leaderboard_hidden`). Upload multipart `id` + `file`. Clear JSON `id`. Hide via `POST /api/viewers/update`. After success, refetch list and card; schedule is server-side for leaderboard.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Existing table/card loading; disable upload/hide while in flight |
| empty | No portrait URLs: initials fallback on every row |
| error/retry | Upload 400/413 shows field error on the card; list stays |
| offline/degraded | Existing cannot-reach banner; do not claim the portrait saved |
| permission denied | Not applicable (localhost) |
| interrupted/recovered | Reload restores hide/custom from SQLite; in-flight upload does not retry automatically |

## View / Flow: Studio leaderboard title and cap

### Layout and Components

Text field for title (placeholder localized, e.g. empty heading). Number field 1–20 for max entries, default 5. Sit with existing font/layout/period fields.

### Data / Forms / Actions

Draft → Publish existing overlay preset path. Blank title stores empty string. Invalid cap blocked by existing field-error pattern.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Existing Studio draft load |
| empty | Blank title preview has no heading; cap 5 |
| error/retry | Field errors on title/max_entries keys |
| offline/degraded | Existing publish failure |
| permission denied | Not applicable |
| interrupted/recovered | Unpublished draft rules unchanged |

## Accessibility / Keyboard / Focus

- Portrait images are decorative; name button stays the accessible name.
- File input has a visible label. Hide checkbox has a visible label, not icon-only.
- Studio title and max-entries have labels and `aria-invalid` on validation failure.
- Initials fallback must keep contrast in light/dark admin themes.
- Overlay heading is a visible text node, not `innerHTML`.

## Scaling / Theme / Localization / Reduced Motion

EN/RU catalogs for new labels, errors, Settings copy, Studio fields. Long titles wrap on the overlay. 150% zoom must not clip the card upload control (`web-constrained-layout`). No required motion for portraits. Overlay themes keep existing avatar slots.

## Explicit Non-Goals

- No chat-command UI for self-serve avatars.
- No Helix connect UI.
- No leaderboard show/hide automation or dock control panel.
- No native OS file dialogs.

## Not applicable

Native windows, tray/menu commands, OS notifications, and platform permission prompts: interactions stay in the existing admin web surface plus OBS Browser Sources.
