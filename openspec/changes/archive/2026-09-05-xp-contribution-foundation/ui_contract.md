# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Settings | Configure silent activity XP | Admin `/` → Settings | Same in browser and Wails |
| Audience directory | See and sort contribution | Admin `/` → Audience → Viewers | None |
| Viewer card | Inspect session/day/all XP | Click/keyboard open from Audience | Wide inspector vs compact sheet unchanged |
| Live Leaderboard / Statistics | Watch XP this stream | Admin `/` → Live | None |
| Awards catalog / Reward picker | Grant contribution XP | Audience Awards; Live/dock Reward | Dock has no catalog editor |
| OBS leaderboard | Show ranking by XP | `/overlay/leaderboard` | OBS Browser Source or preview |

## Menus / Tray / Commands / Shortcuts

No native menu, tray, or global shortcut. Existing Settings save, Audience sort buttons, Reward, and New stream remain the entry points. No new hotkey for activity grants.

## View / Flow: Activity settings

### Layout and Components

Replace the points-per-message control with three integer fields in the same Settings group as day-reset: interval (seconds), session limit, and XP per activity grant. Helper text MUST say this is silent, per viewer, and capped for the current stream — not XP for every chat line. Fields stay in the existing Settings scroll body with labels, and do not clip on height-capped layouts.

### Data / Forms / Actions

`POST /api/config/update` sends `activity_interval_seconds`, `activity_session_limit`, and `activity_xp`. Save remains the existing Settings persist action. Changing values applies to later counted lines without restart. Zero in any field is a valid way to disable activity XP.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Existing Settings save busy; keep field values |
| empty | Not applicable; defaults fill the fields |
| error/retry | Field errors on the invalid activity input; other settings stay |
| offline/degraded | Existing cannot-reach / retry on Settings |
| permission denied | Not applicable |
| interrupted/recovered | Unsaved edits follow existing Settings dirty handling |

## View / Flow: XP instead of Score

### Layout and Components

Audience column header, Live Leaderboard/Statistics, viewer card period totals, and OBS leaderboard visible copy use the localized word XP, not Score. Award picker and alerts still show `+points` for the grant delta. Sort button id may change from score to xp; accessible name must say XP.

### Data / Forms / Actions

Tables read `xp` from viewer and leaderboard payloads. A stored Audience sort of `score` MUST behave as `xp` after upgrade. Sort cycling (desc → asc → last activity) is unchanged.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Existing region loading; do not flash 0 XP as if it were loaded data |
| empty | Existing empty leaderboard/directory; XP column still labeled |
| error/retry | Keep last XP rows; existing stale/error treatment |
| offline/degraded | Last snapshot remains; reconnect uses HTTP then live frames |
| permission denied | Not applicable |
| interrupted/recovered | New stream zeros session XP in UI after the existing confirmation |

## View / Flow: Award catalog seeds

### Layout and Components

Awards list shows any newly inserted seeds with the same row/editor pattern as Joke and Advice. Reward picker lists them among other enabled types. No extra badge for “system” types.

### Data / Forms / Actions

Create/edit/delete unchanged. Deleting a seed removes it from the picker after refresh/restart.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Existing catalog loading |
| empty | Existing empty catalog + Create |
| error/retry | Existing save/list errors |
| offline/degraded | Existing catalog fetch error |
| permission denied | Not applicable |
| interrupted/recovered | Deleted seeds stay gone after restart |

## Accessibility / Keyboard / Focus

- Activity fields have associated labels and `role=alert` field errors like other Settings inputs.
- XP sort button exposes `aria-sort` and is a full-header control, same as the current Score button.
- Reward success copy may keep `+points`; XP balances elsewhere are text, not color alone.
- No new dialogs. Focus order in Settings follows the replaced fields.

## Scaling / Theme / Localization / Reduced Motion

English and Russian catalogs MUST both rename Score → XP and describe activity. Long Cyrillic labels wrap in Settings and table headers. Overlay themes keep current ranking layout; only the numeric field name in the payload and any visible “Score” chrome change. Reduced motion is unchanged (no new animation). Activity grants MUST NOT play sound or show an alert.

## Explicit Non-Goals

- No Credits, level badges, achievement toasts, command media pickers, or template-variable UI.
- No Active type in the Reward picker.
- No Audience layout redesign beyond the Score → XP label and sort-key migration.

## Not applicable

Native windows, tray, OS notifications, file dialogs, and permission prompts. All changes stay on existing localhost web surfaces.
