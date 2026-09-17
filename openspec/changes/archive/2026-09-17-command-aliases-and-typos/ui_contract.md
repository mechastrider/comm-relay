# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Audience → Commands editor | Add or clear extra names for one command | Existing Commands catalog on `/` | Same localhost UI in Wails and browser |
| Audience → Commands list | See canonical `!trigger` and optional aliases | Existing list pane | Unchanged layout besides secondary alias text |
| Live Messages / dock / overlay | See typed chat and existing command chrome | Existing surfaces | No aliases editor; typed text unchanged |

No new native window, tray item, or dock view.

## Menus / Tray / Commands / Shortcuts

No global shortcut. Aliases save with the existing catalog Save control. Escape still closes nothing extra (editor is a pane, not a modal). Chat bang aliases are not OS commands.

## View / Flow: Command aliases editor

### Layout and Components

Add a labeled field **Aliases** immediately under the canonical trigger field, before Enabled. Use a textarea (one slug per line; blank lines ignored). Placeholder/hint explains slugs without `!`, one per line. Do not mix aliases into the trigger input. Leaderboard-action commands keep this field visible with trigger, enabled, and cooldown. Catalog list may show muted secondary text of aliases under `!trigger`.

### Data / Forms / Actions

- Load: `GET /api/commands` `aliases` array → one slug per line.
- Save create/update: parse textarea to a de-duplicated lowercase slug list; send `aliases` (empty array if blank).
- Server field error `aliases` maps to this control; `trigger` stays on the trigger input.
- Client may pre-check slug charset before POST; uniqueness is server-authoritative.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Disable Save as today; keep aliases text |
| empty | Blank textarea; list row shows only `!trigger` |
| error/retry | Adjacent field error; preserve unsaved aliases; focus aliases on `aliases` error |
| offline/degraded | Existing catalog error/retry; do not clear the textarea |
| permission denied | Ordinary localhost error |
| interrupted/recovered | Re-fetch list; do not auto-save |

## Accessibility / Keyboard / Focus

Visible `<label for>` on the textarea. `aria-describedby` for hint and error. Field error `role="alert"`. Tab order: trigger → aliases → enabled → action. Not icon-only. Constrained editor pane: header/actions pinned; body scrolls so aliases are not clipped.

## Scaling / Theme / Localization / Reduced Motion

RU/EN keys for label, hint, empty, and field errors (invalid slug, duplicate, too many). No new motion. Existing catalog tokens/spacing.

## Explicit Non-Goals

Chip-token widgets, drag-reorder, overlay/dock alias UI, “did you mean” copy on chat rows, Studio command editor.

## Not applicable

Native menus, tray, multi-window desktop chrome.
