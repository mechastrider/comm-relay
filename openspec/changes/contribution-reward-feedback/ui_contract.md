# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Live Messages | Reward a meaningful message and see the result | Admin `/` → Live → Messages | None |
| OBS message dock | Reward without leaving OBS | `/dock/messages` Reward control | OBS CEF only; same local API |
| Live Leaderboard / Statistics | Observe score changes during the stream | Admin `/` → Live tabs | None |
| Audience Commands / Awards | Know which catalog item is being edited | Admin `/` → Audience | None |
| Studio surface inspector | Tune Chat, Leaderboard, and Alert chrome opacity | Admin `/` → Studio → surface → Advanced | None |
| Chat Browser Source | See the rewarded source row | `/overlay` | OBS Browser Source or browser preview |
| Alert Browser Source | See a contextual award without overlapping alerts | `/overlay/alert` | OBS Browser Source or sample preview |
| Leaderboard Browser Source | Keep ranking readable over gameplay | `/overlay/leaderboard` | OBS Browser Source or sample preview |

## Menus / Tray / Commands / Shortcuts

No native menu, tray, global shortcut, or new hotkey is added. Existing Reward, Refresh, Publish, New stream, surface-selection, and preview controls remain the entry points. The New stream action stays a confirmed hot action and moves only within the existing Live toolbar layout.

## View / Flow: Message-aware Reward

### Layout and Components

The existing row-level Reward button opens the existing bounded picker. Award items keep name and `+points`. On success, the picker closes and the source row shows a short localized success indicator such as `Advice +50`; it does not add a permanent action column or delete/replace the message. The dock uses the same component in its height-capped layout.

### Data / Forms / Actions

The grant action sends the displayed row's `platform`, `user_id`, `award_id`, optional `id`, and plain message text. While submitting, the selected item and trigger control are disabled. Success restores focus to Reward and announces the award through a polite live region. Error leaves a visible retry path and does not clear the selected message.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Disable duplicate grant submission; preserve picker position and message context |
| empty | Existing empty-award-catalog message remains; no grant is sent |
| error/retry | Show localized inline error, re-enable selection, and retain focus within the picker |
| offline/degraded | Treat failed localhost fetch as a retryable error; do not claim score changed |
| permission denied | Not applicable; localhost API has no separate permission prompt |
| interrupted/recovered | Reopening Reward fetches/uses the current catalog; no success is invented for an unknown outcome |

## View / Flow: Live Ranking

### Layout and Components

Existing Leaderboard and Statistics tables/cards remain unchanged in structure. Live WebSocket updates replace data in place without a loading flash. Manual Refresh remains available as recovery. New stream aligns with the other hot controls on the Live toolbar; at narrow widths the toolbar may wrap as a group without isolating the action on an accidental lower baseline.

### Data / Forms / Actions

Leaderboard renders only snapshots matching the selected period. Statistics invalidation is debounced and occurs only while active; hidden tabs retain stale markers/data until opened. Period selection and HTTP initial loading keep their current behavior.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Initial HTTP load uses the existing region loading state; later frames do not reset it |
| empty | A valid empty snapshot shows the localized empty state |
| error/retry | Preserve the previous rows, mark the region stale/error, and keep Refresh usable |
| offline/degraded | Preserve the last snapshot during WebSocket reconnect and recover from HTTP or the next matching frame |
| permission denied | Not applicable |
| interrupted/recovered | A reconnect or tab reopen reconciles from HTTP before relying only on future frames |

## View / Flow: Catalog Selection

### Layout and Components

The open Command or Award row has a persistent side marker plus stronger text/surface contrast. Hover remains temporary and visually different. Only one row per catalog is selected. The editor heading continues to identify the selected item.

### Data / Forms / Actions

Opening, creating, deleting, and switching catalog items keep current behavior. Deleting the selected item clears selection and moves focus to a predictable neighboring row or the create action.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Keep current catalog loading treatment |
| empty | Show existing empty state and focusable create action |
| error/retry | Preserve selection when a save fails |
| offline/degraded | Show the existing API error; do not present an unsaved item as persisted |
| permission denied | Not applicable |
| interrupted/recovered | Reload selects no item unless the current UI already restores it explicitly |

## View / Flow: Per-surface Opacity

### Layout and Components

Studio Advanced shows the same labeled Panel opacity control for the selected Chat, Leaderboard, or Alerts surface. Switching surfaces changes the field to that surface's effective draft value. The preview reflects the selected surface only. Text/media opacity is not exposed because the control affects background chrome.

### Data / Forms / Actions

The numeric control retains range 0–1 and step 0.05. Legacy presets display the shared opacity as each surface's initial effective value. Editing one surface creates/updates only its draft override; Publish persists all draft surface values through the existing config update.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Disable Publish during the existing save operation; preview keeps the draft |
| empty | Not applicable; every preset resolves an effective opacity |
| error/retry | Show the field/server error and keep the unpublished draft |
| offline/degraded | Preview may remain local; live OBS surfaces remain on the last published config |
| permission denied | Not applicable |
| interrupted/recovered | Existing dirty-draft navigation protection applies |

## View / Flow: On-stream Feedback

### Layout and Components

Award alerts use a theme-specific award variant with hierarchy: award name, viewer plus `+points`, then an optional quote. Commands retain the simpler entertainment variant. The chat row highlight uses an emphasized border/rail and compact points label without moving neighboring rows. No vertical alert stack is shown.

### Data / Forms / Actions

Every supported theme covers chat highlight, award alert, and surface opacity. Alert sample preview demonstrates an award with quote; it does not consume live frames. Missing avatar/quote uses existing fallback behavior without empty placeholders.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Visible alert continues until its duration; pending alerts have no visible chrome |
| empty | Alert source is fully transparent; chat has no reward decoration |
| error/retry | Invalid optional fields fall back safely; malformed frames are ignored |
| offline/degraded | Existing WebSocket reconnect applies; old alerts are not replayed |
| permission denied | Autoplay failure produces a visual-only alert without blocking the queue |
| interrupted/recovered | Reload starts with an empty alert scheduler and current preset appearance |

## Accessibility / Keyboard / Focus

- Reward picker keeps existing arrow/Home/End/Escape behavior; success returns focus to its trigger.
- Visible grant success and errors are also announced through localized live regions.
- Catalog rows expose semantic selection (`aria-selected` or equivalent existing list pattern); selection is not conveyed by color alone.
- Surface opacity has a programmatic label, range hint, validation association, and keyboard-operable numeric input.
- New stream remains in logical toolbar tab order and retains its confirmation focus return.
- Award meaning and points are written as text, not color alone. `prefers-reduced-motion` removes pulsing/translation from award emphasis while preserving static contrast.

## Scaling / Theme / Localization / Reduced Motion

Admin and dock copy is added to both English and Russian catalogs with parity tests. Long Cyrillic/Latin award names and quotes wrap within the OBS rectangle; metadata may truncate before the quote body. All current themes (`default`, `dashboard`, `cockpit_panel`, `cockpit_popups`, `g_rebels_popups`) receive equivalent semantics. Browser zoom and desktop display scaling must not clip picker actions, toolbar controls, or Studio validation. Reduced motion keeps show/hide timing but removes decorative movement.

## Explicit Non-Goals

- No general Audience viewer-table redesign, tab-taxonomy rewrite, new analytics workspace, saved-message UI, award-template language, media picker, alert layout selector, queue inspector, or economics UI.
- No simultaneous alert cards, ticker, manual queue management, or OBS scene controls.

## Not applicable

Native windows, tray/menu commands, OS notifications, file dialogs, and platform permission prompts are unaffected because every changed interaction remains inside existing local web surfaces.
