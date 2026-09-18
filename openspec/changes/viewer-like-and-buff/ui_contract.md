# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Audience → Commands | Create/edit Like and Buff actions | Existing Commands catalog on `/` | Same localhost UI in Wails and browser |
| Audience → Levels | Set like/buff quotas | Existing Progression → Levels editor | Unchanged windowing |
| Settings | Buff caps per award | Existing Settings form Save | Beside activity XP fields |
| Live Messages / `/dock/messages` | See rejected social lines | Existing lists | Frozen chrome + reason, no extra editor |
| `/overlay` chat | Short rejected freeze | Existing Browser Source | Same 5 s freeze as cooldown |

No new native window, tray item, OBS URL, or dock catalog editor.

## Menus / Tray / Commands / Shortcuts

No global shortcut. Social commands are chat bangs, not OS commands. Settings Save and catalog Save remain the existing controls. Escape does not add a new modal for these fields.

## View / Flow: Command editor social actions

### Layout and Components

Extend the existing action control (Alert / Show leaderboard) with Like and Buff. Like shows an award-type select (`award_id`) and hides splash/media. Buff shows a numeric `points` field (1–1000) and hides splash/media. Trigger, aliases, enabled, and cooldown stay visible. Constrained pane: header/actions pinned; body scrolls.

### Data / Forms / Actions

- Load/save via existing `GET/POST /api/commands/*` with `action`, `award_id`, `points`.
- Field errors map to award select or points input.
- Switching action MUST NOT silently keep a stale splash as required.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Disable Save; keep unsaved action fields |
| empty | No like/buff rows until seeded or created |
| error/retry | Adjacent field error; preserve draft; focus first invalid |
| offline/degraded | Existing catalog error/retry |
| permission denied | Ordinary localhost error |
| interrupted/recovered | Re-fetch; do not auto-save |

## View / Flow: Level quotas and Settings caps

### Layout and Components

Level editor: two integer inputs `like_quota` and `buff_quota` (0–100) after announce. Settings: two integer inputs for per-viewer-per-award and unique-buffer caps, labeled in RU/EN, helper text that they apply to operator awards.

### Data / Forms / Actions

Level save uses existing progression level update. Caps use `POST /api/config/update`.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Existing Save busy |
| empty | N/A (defaults always present after load) |
| error/retry | Field errors on the invalid integer; preserve other settings |
| offline/degraded | Existing Settings/Progression retry |
| permission denied | Ordinary localhost error |
| interrupted/recovered | Re-fetch config/levels |

## View / Flow: Rejected chat chrome

Reuse cooldown frozen treatment. Admin/dock show localized `reason_label` (including «уточни» / “clarify”). Overlay may show the same short label without a timer. Do not list candidate nicks.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | N/A |
| empty | No extra empty state |
| error/retry | Unknown `reason` still freezes the row with a generic rejected label |
| offline/degraded | Existing WS reconnect |
| permission denied | N/A |
| interrupted/recovered | Reload restores from recent messages + process map |

## Accessibility / Keyboard / Focus

Visible labels on new fields. `aria-describedby` for cap helpers and errors. `role="alert"` on field errors. Reason text on chat rows is visible text, not color-only. Tab order stays linear in the command editor: trigger → aliases → enabled → action → action-specific fields → cooldown.

## Scaling / Theme / Localization / Reduced Motion

RU/EN for action names, quota/cap labels, reason labels, starter award/achievement names. Frozen row respects `prefers-reduced-motion` like cooldown. Existing catalog tokens/spacing. No new theme.

## Explicit Non-Goals

Nick autocomplete in admin, “did you mean” candidate chips on overlay, buff splash designer, dock policy editor, new Recap/Studio surfaces.

## Not applicable

Native menus, tray, multi-window desktop chrome, OS shortcuts.
