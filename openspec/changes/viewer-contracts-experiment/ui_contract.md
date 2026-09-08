# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Admin Live — Contracts | Announce and settle the one current contract | Fourth tab after Messages, Leaderboard, Statistics | Same in browser and Wails webview |
| Winner picker dialog | Find one canonical viewer and confirm the promised award | Award winner from the active card | Same; native OS picker is not used |
| No-result confirmation | End the contract without granting XP | Close without result from the active card | Same |
| OBS `/overlay/alert` | Show the task and promised reward on stream | Existing Browser Source URL | Same web surface; OBS/CEF rendering differences only |
| Messages dock | Continue chat moderation/reward workflow | Existing `/dock/messages` | No contract controls or rows |

## Menus / Tray / Commands / Shortcuts

No native menu, tray action, global shortcut, context menu, or command palette entry is added. Existing tablist Arrow Left/Right, Home, and End behavior extends to Contracts. Ordinary Tab/Shift+Tab traverses forms and dialogs; Escape cancels an open native `<dialog>` without settling.

## View / Flow: `Live Contracts`

### Layout and Components

The tab panel uses existing canvas-panel, field, notice, button, and dialog primitives. The empty state is a compact form: Title input with `80`-code-point helper/count, Objective textarea with `280`-code-point helper/count, reward select showing localized name plus signed XP, and primary Announce button. The active state is a readable card with status badge, title, wrapping objective, reward name/+XP, localized announcement time, primary Award winner, secondary Announce again, and destructive Close without result.

At narrow widths the card/actions stack in document order without horizontal scrolling. Winner and confirmation dialogs use a capped flex/grid shell: fixed header/footer, `min-height: 0`, scrollable body, visible scrollbar, and reachable final option at approximately 700 px viewport height and 125–150% scaling.

### Data / Forms / Actions

- On first Contracts activation, fetch current contract and award catalog concurrently. Re-entry refreshes current state.
- Trim title/objective only for validation/submission; keep the user's editing value until open succeeds.
- Disable Announce while required fields are empty, catalog is empty, or a request is in flight. Field errors use `aria-invalid`/`aria-describedby`, clear as the field is corrected, and focus the first invalid field.
- Announce again submits only active `id` and does not reopen or mutate the draft.
- Award winner opens a dialog containing a labeled search input, loading indicator, result list, selected-viewer summary, and pinned Cancel/Award actions. Search uses `GET /api/viewers?q=…`; each option shows display name and localized platform chips, with additional identity-safe distinction when names collide.
- The confirmation text names the contract, selected viewer, reward, and +XP. The submit body contains only contract `id` and canonical `viewer_id`.
- Close without result has a separate confirmation stating that no XP or reward-history entry will be created.
- All visible copy and dynamic announcements are present in both `ru-RU` and `en-GB` catalogs.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Preserve the prior stable view where possible, mark the relevant region busy, disable only conflicting actions, and show an in-context progress state |
| empty | With no active contract show the draft; with no rewards explain how to create one in Audience and disable Announce; with no matching viewers keep search editable and explain no match |
| validation | Keep all draft/selection data, associate localized messages with fields, and focus the first invalid control |
| error/retry | Show a UI-safe in-panel error and Retry; keep the active card or draft and never claim success before the response |
| conflict (409) | Reload authoritative current state; preserve an unsent draft locally and explain that another window changed the contract |
| viewer missing (404) | Keep the contract active, clear the stale winner selection, and return focus to viewer search |
| offline/degraded | Explain that the local server cannot be reached, retain draft/active presentation, and offer Retry; do not queue browser-only actions |
| interrupted/recovered | Abort/ignore late loads after leaving the tab; on return or app restart read the durable active contract without replaying it automatically |

## Accessibility / Keyboard / Focus

The Contracts tab and panel use linked `role=tab`/`role=tabpanel`, correct roving tabindex, and the existing tab keyboard order. Every field has a visible label; placeholder text is supplemental only. Dynamic status and errors use an appropriate polite/alert live region without announcing each search keystroke. Viewer results are keyboard operable with a single clear selected state. Opening a dialog moves focus to its heading or first field, focus stays within the modal, Cancel/Escape returns focus to the invoking action, and success returns focus to the Contracts heading or empty-state title. Destructive and award actions require explicit activation and are not triggered by selecting a viewer. Icon-only controls, if used, require localized accessible names and hover/focus tooltips.

## Scaling / Theme / Localization / Reduced Motion

Admin UI uses the existing design tokens, light/dark behavior, minimum target sizes, focus rings, and EN/RU locale application. Cyrillic/Latin mixed text wraps rather than truncating the objective; compact metadata may ellipsize with its full accessible name retained.

The alert variant implements every current on-stream theme (`default`, `dashboard`, cockpit variants, and G-Rebels), keeps page/background transparency, and fits the Browser Source rectangle in landscape, square, portrait, and narrow-banner shapes. It renders title, objective, reward, and points as text nodes, clamps only when the rectangle physically cannot fit the bounded objective, and uses a stable contract emblem when custom media is missing/broken. `prefers-reduced-motion` removes decorative motion but preserves static emphasis, duration, queue order, and audio policy.

## Explicit Non-Goals

No contract catalog/templates, historical contract list, viewer opt-in/candidate list, automatic completion signal, dock workflow, Studio editor, dedicated OBS source, native notification, hotkey, drag/drop, or platform-specific UI is added.

## Not applicable

Native window creation/chrome, menu/tray integration, OS dialogs, clipboard, file picker, protocol handler, and desktop shortcuts are unchanged because this feature is entirely inside the existing local web UI and alert surface.
