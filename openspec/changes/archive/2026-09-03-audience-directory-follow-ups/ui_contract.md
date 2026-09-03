# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Audience viewers table | Find, sort, and inspect canonical viewers | Admin `/` → Audience → Viewers | Same in browser and Wails WebView |
| Viewer card | See identities, counters, merge, display name | Inspector (≥1024px) or compact sheet | Existing wide/compact split; no native window |
| Live toolbar New stream | Reset session counters | Admin `/` → Live | Unchanged; not restyled here |
| Audience New stream | Same session reset from the people workspace | Audience viewers toolbar | Must not sit inside the filter group |

## Menus / Tray / Commands / Shortcuts

No native menu, tray, global shortcut, or new hotkey. Sort is activated from Score and Messages column headers. The name button, row click, and existing Enter/Space open the card. New stream remains the existing confirmed dialog.

## View / Flow: Audience directory

### Layout and Components

The table keeps Viewer, Platforms, Score, and Messages. The Actions column is removed. The header uses a distinct surface or edge from the body. Score and Messages are sort buttons with a visible direction cue. Each Platforms cell shows compact SVG icons, not permanent text labels. The display name is a button; an optional chevron is decorative. Existing search, period select, Refresh, and Open leaderboard remain.

### Data / Forms / Actions

Rows render `GET /api/viewers`. Platforms come from `platforms`, or `[last_seen.platform]` when the field is absent. Score/Messages values follow the selected period. First header click sorts descending, second ascending, third restores last-activity order. Preference is local to the browser/WebView. A single click on the row or name opens `GET /api/viewers/get` in the existing inspector or sheet. Merge, display-name save, and search keep current forms.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Keep the existing table loading treatment; do not invent sorted rows before the list arrives |
| empty | Existing none / no-matches empty states; sort headers remain visible and inert on zero rows |
| error/retry | Existing table error + Retry; previous rows may remain; sort preference is not discarded |
| offline/degraded | Failed localhost fetch uses the existing cannot-reach error; do not claim a new sort was persisted on the server |
| permission denied | Not applicable; localhost API has no extra prompt |
| interrupted/recovered | Reload restores the stored sort if valid; selected viewer reopens only through existing selection logic |

## Accessibility / Keyboard / Focus

- Sort buttons expose `aria-sort` (`none`, `descending`, `ascending`) and a localized accessible name.
- Name control is a real button; Enter/Space on the focused row still open the card.
- Platform icons have a localized accessible name and tooltip; meaning is not color-only. Unknown ids use the raw id as the name.
- The chevron is `aria-hidden`.
- Existing row arrow-key roving and card/sheet focus return remain.
- New stream stays in toolbar tab order and keeps confirmation focus return.

## Scaling / Theme / Localization / Reduced Motion

English and Russian catalogs cover sort, empty platforms, and any new control names. Long viewer names wrap in the name cell. Header contrast must hold in current admin light/dark tokens at 100% and 150% zoom. Narrow layout still opens the sheet on row activation. Sort and selection do not require motion; `prefers-reduced-motion` introduces no extra animation.

## Explicit Non-Goals

- No Audience avatars, custom viewer images, tab-taxonomy rewrite, Live Leaderboard/Statistics redesign, or overlay/dock changes.
- No server-driven sort UI, pagination, or live catalog updates from WebSocket leaderboard frames.

## Not applicable

Native windows, tray/menu commands, OS notifications, file dialogs, and platform permission prompts are unaffected because every changed interaction stays inside the existing admin web surface.
