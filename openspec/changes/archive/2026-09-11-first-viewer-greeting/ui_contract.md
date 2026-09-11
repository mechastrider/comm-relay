# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Greeting catalog | Enable and style both automatic greetings | `Audience` → `Greetings`, between `Commands` and `Awards` | None between Wails and a supported browser |
| Greeting editor | Configure and test one fixed greeting | Select `New viewer` or `Returning viewer` | File picker uses the existing browser/Wails upload path |
| Viewer inspector | Suppress greetings for a bot, streamer, or technical account | `Audience` → `Viewers` → select viewer | None |
| Alert test receiver | See a safe end-to-end greeting test | Existing `Studio` alert test mode | None |
| Unsaved-change confirmation | Keep editing or explicitly discard a local draft | Change greeting/Settings section or reset a dirty Settings section | None between Wails and a supported browser |

## Menus / Tray / Commands / Shortcuts

No application menu, tray, global shortcut, or native command changes. `Greetings` joins the existing Audience tab order and URL/hash workspace state. Test and Save are text-labelled actions; no new icon-only command is introduced.

## View / Flow: `Audience greetings catalog`

### Layout and Components

Desktop reuses `audience-catalog-layout`: a list region on the left and editor aside on the right. The list header reads `Automatic greetings` and has no Create button. It contains exactly two selectable rows:

- `New viewer` — `First ordinary message ever`;
- `Returning viewer` — `Once after New stream`.

Each row shows an enabled/disabled text status and a bounded template summary. Selection, not an inline switch, changes the editor so list state cannot conflict with unsaved form state.

The editor header contains its greeting name, secondary `Test`, and primary `Save`. The scrollable body groups fields as:

1. **Behavior** — Enabled and a read-only explanation of the fixed trigger and precedence.
2. **Content** — template, `{viewer}` / `{streamer}` / `{message}` chips, safe sample preview.
3. **Media** — built-in sound, image upload/clear/preview, image fit and size, custom sound upload/clear/play/stop, volume.
4. **Appearance** — card/banner/fullscreen layout and duration.

There is no trigger, action, cooldown, Create, or Delete control. No new OBS surface is listed; greetings use Alerts.

### Data / Forms / Actions

Both fixed rows load together. Selecting another row with dirty input opens the shared in-application discard dialog rather than a browser prompt. Cancel keeps the current row and restores focus to the attempted row; explicit discard changes selection. The same dialog protects dirty Settings section changes and Reset. Save validates on submit, disables Save/Test during the request, and updates row status only after success. Test submits current draft fields and representative localized sample data to the isolated test audience without saving. A successful test reports receiver count in a polite live region. Media controls reuse command-editor bounds and asset workflows.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Keep stable list/editor geometry; mark the list or active action busy and prevent duplicate submissions |
| empty | Not expected; if either fixed row is missing, show a data error rather than offering Create |
| error/retry | Catalog load offers Retry; save/preview errors preserve draft values and appear next to fields or in the editor action region |
| offline/degraded | Explain that the local server or test receiver is unavailable; never claim the greeting was saved or tested |
| permission denied | Asset-picker/read failures use the existing media error and recovery path |
| interrupted/recovered | Reload persisted definitions after reconnect; do not silently restore an unsaved draft as saved state |

## View / Flow: `Viewer greeting exclusion`

The viewer inspector places `Exclude from automatic greetings` beside `Hide from leaderboards`. Persistent helper text states that it suppresses both greeting types and does not replay a greeting when cleared. The existing viewer update action saves the boolean with visible busy, success, and inline failure feedback.

## Accessibility / Keyboard / Focus

Audience tab, listbox, and tabpanel relationships follow the existing catalog semantics. Both rows and every action are keyboard reachable with visible focus. All controls have visible labels; field errors use `role="alert"`, are referenced by `aria-describedby`, and move focus to the first invalid field. Variable chips have localized accessible insert names plus hover/focus tooltips explaining substitution. Enabled state is conveyed by text and control state, not color alone. When the narrow editor opens, focus moves to its heading; returning restores focus to the selected row.

## Scaling / Theme / Localization / Reduced Motion

At the current catalog breakpoint the UI becomes one column: list first, selected editor full width, no horizontal scroll. The editor body scrolls while its action header remains reachable; controls retain at least 44 px targets. Existing semantic color, spacing, light/dark, and focus tokens apply. All new visible, tooltip, error, sample, and accessible strings require EN/RU catalog parity. Admin reduced motion affects only UI transitions; the test alert uses the alert surface's existing reduced-motion rules.

## Explicit Non-Goals

No arbitrary greeting creation, reordering, bulk enable, per-platform definitions, inline XP controls, early-viewer rewards, automatic session controls, or production test broadcast.

## Not applicable

Native windows and system dialogs beyond existing file upload are intentionally unaffected. Unsaved admin drafts use the app's existing `<dialog>` visual system; notifications, drag-and-drop, clipboard, tray, and global shortcuts remain unaffected.
