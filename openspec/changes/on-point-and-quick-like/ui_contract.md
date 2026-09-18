# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| `/dock/messages` | Grant Streamer Like or On Point from a chat line without the row jumping | Existing OBS dock | Height-capped; action cluster nowrap |
| Live → Messages | Same grants while running admin | Existing Live list on `/` | Same shared reward control as the dock |
| Audience → Awards / Achievements | See or edit `on_point` / Синхрон after seed | Existing catalogs | No new editor fields |
| `/overlay` chat | See award highlight/alert as today | Existing Browser Source | No operator buttons |

No new native window, tray item, OBS URL, or dock catalog editor.

## Menus / Tray / Commands / Shortcuts

No global shortcut. Streamer Like is a per-row control, not an OS command. Escape still dismisses the Reward picker. No new tray items.

## View / Flow: Message row actions (Live + dock)

### Layout and Components

Keep username / platform / time on the meta row. Action cluster on the right, `nowrap`, order: **Streamer Like** (icon) → **Reward** → **Delete** when each applies.

Streamer Like: square icon button matching dock leaderboard icon-button sizing (thumbs-up SVG, not a heart). Visible tooltip and `aria-label` use the localized Streamer Like name (e.g. «Лайк от стримера»). Do not use a text “LIKE” label on the dock.

Reward stays the existing compact text control and opens the picker. Picker list omits `like` and still lists `on_point` and other types. Height-capped dock: picker header stays put, list scrolls, flip-up when needed.

Grant feedback (success or failure) MUST live outside the wrapping action flex — reserved overlay slot on the row, live region below the message text, or equivalent. It MUST NOT be a `flex-basis: 100%` sibling inside `.message-list__actions`.

### Data / Forms / Actions

- Prefetch `GET /api/awards` when Live or dock messages load so Streamer Like can appear without opening Reward.
- Streamer Like → `POST /api/awards/grant` with `award_id` `like` and the same identity/message snapshot as Reward.
- Reward item → existing grant with the chosen `award_id`.
- If `like` is missing, hide Streamer Like; picker lists remaining types.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Disable the control that started the grant; keep cluster layout; picker stays open until success or explicit dismiss except while a grant is in flight |
| empty | No Streamer Like when catalog has no `like`; empty picker copy unchanged when no remaining types |
| error/retry | Error in picker or on the row; re-enable; do not wrap buttons |
| offline/degraded | Existing fetch failure copy; retry without reload |
| permission denied | Ordinary localhost error |
| interrupted/recovered | Re-fetch awards list; in-flight grant that already succeeded still shows in-context success without jumping |

## Accessibility / Keyboard / Focus

Streamer Like is a real `<button>` with `aria-label`, not icon-only without a name. Tooltip is supplementary. Tab order: Streamer Like → Reward → Delete. Picker keyboard (arrows, Home/End, Escape) unchanged. Success uses an `aria-live="polite"` status. Failure uses `role="alert"` as today. Do not convey Like vs Reward by color alone.

## Scaling / Theme / Localization / Reduced Motion

RU/EN for Like tooltip/aria, grant success, and picker. No new motion beyond existing hover. Dock ~narrow width: action cluster may shrink padding but MUST NOT wrap. Existing admin/dock tokens. Audience award/achievement editors show seeded names without new layout.

## Explicit Non-Goals

On Point as a second icon. Picker reorder. Operator controls on `/overlay`. Hotkeys for grant. Heart icon for Streamer Like.

## Not applicable

Native window chrome, tray, OBS URL changes, Studio, leaderboard toolbar, overlay themes.
