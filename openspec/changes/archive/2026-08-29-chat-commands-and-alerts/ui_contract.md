# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Admin Audience · Commands | CRUD chat commands | `/#audience` (or current Audience route) → Commands | Same in Wails window and system browser |
| Admin Audience · Awards | CRUD award types | Audience → Awards | Same |
| Admin Live · Messages | Reward a viewer from a line | Live → Messages | Same |
| Settings | Hide command messages | Settings / Interface | Same |
| Studio · Alerts | Copy `/overlay/alert` URL; preview sample splash | Studio source list → Alerts (enabled) | Same |
| OBS dock | Reward during stream | `/dock/messages` Custom Browser Dock | OBS CEF; cramped height |
| Alert overlay | Show queued splashes on stream | OBS Browser Source `/overlay/alert` | Transparent; audio via OBS |

No new native windows, tray items, or installer screens.

## Menus / Tray / Commands / Shortcuts

No application menu, tray, or global shortcuts. In-page only:

- Reward opens a picker; Escape / click-away closes it.
- Catalog save/delete are explicit buttons (hot: grant/delete-command take effect immediately after POST).
- No keyboard shortcut required beyond standard Tab/Enter.

## View / Flow: Audience catalogs

### Layout and Components

Split or stacked list + editor inside Audience, using existing cockpit CSS and constrained-layout (pinned header/editor actions, scrolling body). Commands and Awards are two lists, not one table with a type column.

### Data / Forms / Actions

**Command fields:** trigger (slug, shown with `!` prefix in the label), enabled, cooldown seconds, splash template, sound select (silence + four tones), duration (default 5000 ms). Image/sound-file inputs hidden.

**Award fields:** name, points (≥ 1), splash template, sound, duration.

Actions: create, save, delete with confirm. No bulk import.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | List skeleton or disabled editor until GET returns |
| empty | Empty copy plus Create; allowed after deleting seeds |
| error/retry | Banner with retry; field errors on trigger/points |
| offline/degraded | Same as other admin fetches; no fake catalog |
| permission denied | N/A (localhost) |
| interrupted/recovered | Re-GET lists on workspace revisit |

## View / Flow: Reward picker

### Layout and Components

Icon-or-label control **Reward** on the message row (tooltip required). Picker is a compact menu/popover listing award name and points. Dock: menu must flip/scroll inside the dock viewport (`web-constrained-layout`).

### Data / Forms / Actions

One POST grant; picker closes on success. No extra confirm dialog in MVP.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Triggering control shows progress; ignore double-click until done |
| empty | If award catalog is empty, picker explains to add awards in Audience |
| error/retry | Keep picker open; show error; grant not applied |
| offline/degraded | Error as other dock POSTs (delete pattern) |
| permission denied | N/A |
| interrupted/recovered | In-flight grant: wait for response; no optimistic score in the dock |

## View / Flow: Alert overlay and Studio preview

### Layout and Components

Full-bleed transparent surface; one splash card/HUD matching the active theme. Studio preview uses `preview=sample` fictitious splash (name/avatar/text), not live awards.

### Data / Forms / Actions

None for the operator on the live page. Studio: copy URL (follow active preset primary; pinned optional like chat).

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Empty transparent page until `/ws` up |
| empty | No chrome |
| error/retry | Reconnect backoff; no splash replay |
| offline/degraded | Empty until reconnect |
| permission denied | N/A |
| interrupted/recovered | Reload drops visible splash |

## Accessibility / Keyboard / Focus

- Reward and catalog controls have visible names or `aria-label` + tooltip (`ux-form-practices`).
- Picker is keyboard-reachable: open from Reward, arrow/activate items, Escape closes, focus returns to Reward.
- Overlay alert is visual/audio for audience; not an operator a11y surface.

## Scaling / Theme / Localization / Reduced Motion

- Admin/dock: existing cockpit tokens; RU/EN i18n for all new chrome (`npm run test:i18n`).
- Alert: every overlay theme; respect reduced motion by shortening or skipping enter animation but still showing the splash for `duration_ms`.
- Sound is independent of reduced motion.

## Explicit Non-Goals

- Achievements browser, event-log UI, media upload widgets, command-parameter fields.

## Not applicable

Native windowing, tray, and OS file-open dialogs do not change. Dock stays unthemed operator chrome.
