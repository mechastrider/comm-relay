# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| `/dock/messages` | Grant awards and delete lines with icon-only actions; see command status without a text chip | Existing OBS dock | Height-capped; Reward/Delete icons; check/snowflake |
| Live → Messages | Same uniqueness and command chrome; labeled Reward/Delete | Existing Live list on `/` | Text Reward/Delete; Like stays an icon |
| `/overlay` chat | Unchanged highlight on award alerts | Existing Browser Source | No operator buttons |

Sketch: [`docs/mockups/dock-message-row-icons.html`](../../../docs/mockups/dock-message-row-icons.html).

No new native window, tray item, OBS URL, or dock catalog editor.

## Menus / Tray / Commands / Shortcuts

No global shortcut. Escape still dismisses the Reward picker. No new tray items.

## View / Flow: Message row actions

### Layout and Components

Keep username / platform / time on the meta row. Right cluster, `nowrap`, order:

**status (if any)** → **Streamer Like** → **Reward** → **Delete**

Status is not a button: no action-button border/background. Accepted = checkmark only (tooltip/accessible name = existing command-accepted copy). Frozen = snowflake + compact `12 с` or reject label.

Dock Reward: 28×28 medal (circle + ribbon), tooltip “Награда” / “Reward”. Dock Delete: 28×28 trash, existing delete accessible name, red token like today’s delete text button.

Live Reward/Delete keep uppercase text labels.

Grant feedback stays under the message text, not inside the action flex.

### Data / Forms / Actions

- Prefetch `GET /api/awards` as today.
- Apply `granted_award_ids` from `GET /api/messages/recent` when building rows.
- Streamer Like / picker item → `POST /api/awards/grant` as today.
- After success or HTTP 409 for that `award_id`, mark it granted on the row.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Disable the control that started the grant; keep cluster layout |
| empty | No Like when catalog has no `like`; empty picker copy unchanged |
| already granted | Dim/disable Like or picker item; Reward stays for other types; 409 copy is “already granted”, not grant-failed |
| error/retry | Non-409 error in picker or on the row; re-enable that control |
| offline/degraded | Existing fetch failure copy |
| permission denied | Ordinary localhost error |
| interrupted/recovered | Reload recent messages; restore `granted_award_ids` and in-memory command outcomes |

## Accessibility / Keyboard / Focus

Icon buttons are real `<button>`s with `aria-label`; tooltip is supplementary. Status uses `role="status"` (or equivalent) and is not in the tab order as a fake button. Tab order: Streamer Like → Reward → Delete. Picker keyboard unchanged. Success: `aria-live="polite"`. Conflict: polite already-granted, not `role="alert"` retry. Do not convey status only by color (checkmark vs snowflake shapes differ).

## Scaling / Theme / Localization / Reduced Motion

RU/EN for tooltips, already-granted copy, command-accepted name. No new motion. Dock ~400px: cluster MUST NOT wrap. Existing admin/dock tokens. Check/snowflake stroke icons at 16px.

## Explicit Non-Goals

Live icon-only Reward/Delete. Overlay operator controls. Hotkeys for grant. Unique-any-award-per-row UI.

## Not applicable

Native window chrome, tray, OBS URL changes, Studio, leaderboard toolbar, overlay themes.
