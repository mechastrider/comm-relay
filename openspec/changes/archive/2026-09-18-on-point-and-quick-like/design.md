## Context

See `proposal.md`. Operator awards are granted from Live and `/dock/messages` through one Reward picker. Catalog seeds are user-owned after bootstrap: existing databases do not receive later starter awards unless a dedicated insert-if-absent path exists (`viewer_like` is the pattern). Commands still MUST NOT grant XP. Success copy today is appended into `.message-list__actions` with `flex: 1 0 100%`, which wraps the dock action cluster.

## Goals / Non-Goals

**Goals:**

- Seed deletable award `on_point` (20 XP, В точку / On Point) for new and existing databases without rewriting an existing row.
- Seed deletable achievement `achievement_on_point` (Синхрон / In Sync, 10 `on_point` grants) the same way.
- Keep grants manual via existing `POST /api/awards/grant` on any identified line.
- Add a one-click Streamer Like icon on Live and dock when catalog id `like` exists; omit `like` from the picker.
- Stop grant feedback from wrapping Reward/Delete in `/dock/messages` (and Live, same control).

**Non-Goals:**

- Auto-grant, situation windows, rules engine, game telemetry.
- Second quick button for `on_point`; picker pinning/reorder.
- Restricting grants to `is_command`.
- Viewer `!like` / `viewer_like` changes; command XP; overlay operator chrome; new HTTP routes.

## Component / Process / IPC Boundaries

```text
internal/store
  starter awards (fresh DB) include on_point
  one-time bootstrap key inserts on_point + achievement_on_point if absent

POST /api/awards/grant     unchanged shape
GET  /api/awards           lists like / on_point when present

web/shared/reward-picker.js
  Live Messages + /dock/messages
  Like icon → grant like
  picker items skip like
  feedback outside wrapping action flex
```

Desktop and headless share the HTTP app. No Wails IPC, installer, or `config.json` keys. Overlay Browser Sources stay grant consumers (alert + row highlight), not operator controls.

## State and Event Flow

1. Open store: if on-point bootstrap is not complete, insert missing `on_point` and `achievement_on_point` in the current starter locale, then mark complete.
2. Operator activates Streamer Like or a picker item → same grant body as today (`platform`, `user_id`, `award_id`, optional `message_id` / `message_text`).
3. Server applies XP, interaction event, award alert, progression (including Sync at the 10th `on_point`).
4. Client closes picker, shows success without wrapping the action cluster.

## Threading / Async / Cancellation

Bootstrap runs under the existing store mutex at open, same as other catalog seeds. Grant stays one store transaction. Clients load awards once per Live/dock session (invalidate after catalog edits if already done) so the Like icon can appear without opening the picker. In-flight grant still disables the triggering control. Shutdown does not need new cancellation.

## Security and Trust Boundaries

Localhost-only. Grant still requires a stable `user_id`. Icon labels are operator-locale strings, not chat text. Overlay continues to render award names as text nodes. Do not log full chat bodies at Info. No new OS permissions.

## Decisions and Alternatives

### 1. Manual grant only

**Choice:** Operator judges timeliness and grants `on_point` like any other award.  
**Why:** Game state is not in CommRelay; auto-matching `!heat` would pay command spam.  
**Alt:** Situation window or command-fire auto-grant. Rejected for this change.

### 2. One-time insert-if-absent, not every-startup upsert

**Choice:** Dedicated bootstrap marker; `INSERT … WHERE NOT EXISTS` once; never recreate after delete; never rewrite an existing `on_point` / `achievement_on_point` row.  
**Why:** Matches user-owned catalogs and the `viewer_like` additive seed. Blind upsert would revive deleted seeds.  
**Alt:** Add only to fresh starter catalogs. Rejected: this install would not get the award.

### 3. Shared bootstrap for award + achievement

**Choice:** One marker seeds both rows. Missing award still allows the achievement to insert (progress starts when `on_point` exists).  
**Why:** They ship as a pair; two markers add failure modes.  
**Alt:** Tie Sync to progression bootstrap only. Existing DBs would never get it.

### 4. Quick Like only; On Point stays in the picker

**Choice:** Icon for `like`; `on_point` is a picker item.  
**Why:** Dock width. A second icon can be a later change if stream use demands it.  
**Alt:** Two icons. Rejected for v1.

### 5. Feedback must not be a wrapping flex child of the action cluster

**Choice:** Keep an accessible success/error announcement, but do not use a `flex-basis: 100%` sibling inside `.message-list__actions`. Reserved overlay slot, live region outside the cluster, or in-control status are all acceptable if buttons stay put.  
**Why:** Current `message-list__reward-feedback` is the dock jump.  
**Alt:** Toast only, no row copy. Weaker than the existing “in context” requirement.

### 6. Fresh starter list includes `on_point`

**Choice:** New databases get ten starter awards including `on_point`, so a second bootstrap is a no-op when the id already exists.  
**Why:** Avoids a gap between brand-new files and upgrades.  
**Alt:** Upgrade path only. Fresh DBs would depend on the marker running after starter init — workable but easier to miss.

## Risks / Trade-offs

- Duplicate display names if the operator already created a custom “В точку” under another id. Accept; ids stay unique.
- Historical `on_point` grants before the achievement existed will backfill on next progression reconcile if that pipeline already counts award history; do not emit a live alert burst (existing backfill rule).
- Older admin JS against a new server still grants via picker (including `like`); Like icon simply absent until UI upgrade.

## Migration / Rollout / Rollback

No Goose table change required unless apply finds a schema gap (none expected). Replace the binary; first open completes the bootstrap. Rollback: older binaries ignore unknown ids; rows remain. Uninstall remains deleting the data directory.

## Open Questions

None. Locale strings, 20 points, Sync @ 10, Live+dock, picker hides `like`, and unrestricted lines were decided in explore.
