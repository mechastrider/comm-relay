# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Audience History | Review who received which awards across the channel | Admin `/` → Audience → History | Same in browser and Wails WebView |
| Viewer reward history | Review every award for one canonical viewer | Audience → Viewers → existing wide inspector or compact sheet | Existing ≥1024px inspector / compact modal split |
| Awards catalog | Configure award types | Audience → Awards | Existing surface; label remains distinct from History |

## Menus / Tray / Commands / Shortcuts

No native menu, tray command, global shortcut, or hotkey is added. History actions are Audience tab activation, Refresh, Retry, and Load more. Existing Audience tab keyboard behavior and viewer-card focus return remain authoritative.

## View / Flow: Global reward history

### Layout and Components

Add a fourth Audience tab named **History** after Awards. Its panel uses the existing Audience content height and scroll conventions. A compact toolbar contains the heading and Refresh action. Below it, an accessible table has Time, Viewer, Reward, and XP columns. Rows are newest first; reward and viewer names wrap rather than clipping. A footer region owns Load more and pagination status.

History is visually separate from the Awards catalog: Awards continues to edit types, while History is read-only evidence of grants. No delete or edit affordance appears on a history row.

### Data / Forms / Actions

Opening the tab performs `GET /api/reward-history?limit=50`. Refresh discards the current cursor and replaces rows with the first page. Load more sends the returned `next_cursor` and appends rows. Time uses the configured RU/EN locale with local calendar date and 24-hour time. XP renders with an explicit plus sign for positive points. Names and rewards use `textContent`.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Initial load shows the shared loading treatment; Refresh and Load more prevent duplicate requests and expose busy state |
| empty | Show a localized “No awards yet” state; hide the table body and Load more |
| error/retry | Initial failure shows a localized error and Retry; pagination failure keeps rendered rows and makes Load more retryable |
| offline/degraded | A failed localhost request does not affect other Audience tabs; reopening or Refresh retries from the first page |
| permission denied | Not applicable; no new OS or browser permission is requested |
| interrupted/recovered | A superseded refresh response is ignored; reopening History performs a fresh first-page load |

## View / Flow: Viewer reward history

### Layout and Components

Append a **Reward history** section after existing viewer profile controls in both the wide inspector and compact sheet. Use a compact semantic list or table containing time, reward name, and signed XP; the viewer name is omitted because the section is already scoped. The section has its own loading, empty, error, and Load more controls and remains inside the existing scrollable body.

### Data / Forms / Actions

Opening a viewer starts the existing detail request and `GET /api/reward-history?viewer_id=<id>&limit=10`. The profile renders independently of history. Load more uses that section's cursor. Closing the card, switching viewer, merging, or reopening invalidates the earlier history request. After a merge completes, reopening the survivor loads the rewritten history.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Show a small section-level loading label; existing profile fields remain usable |
| empty | Show localized “No rewards for this viewer yet” without collapsing the profile |
| error/retry | Show a section-level error and Retry; do not replace the viewer detail with a global error |
| offline/degraded | Keep already loaded viewer content; Retry only the history request |
| permission denied | Not applicable |
| interrupted/recovered | Abort or ignore stale results when the selected viewer changes; new viewer starts at its first page |

## Accessibility / Keyboard / Focus

- The History tab uses the existing `tablist` / `tab` / `tabpanel` contract and has localized accessible text.
- Global history uses semantic table headers; viewer history uses semantic list/table structure with a visible section heading.
- Refresh, Retry, and Load more are native buttons with disabled and `aria-busy` state during requests.
- Loading and appended-result status uses a restrained `aria-live="polite"` region; it MUST NOT announce every row.
- Opening or loading history MUST NOT steal focus. Tab activation follows existing Audience focus behavior; compact viewer-sheet close returns focus to its source row.
- Information is not encoded only by color. The explicit `+` and XP label preserve points meaning.

## Scaling / Theme / Localization / Reduced Motion

All new labels, empty/error copy, column names, and status text are added to both `en.js` and `ru.js`; `npm run test:i18n` must preserve catalog parity. Tables and controls use existing design tokens and remain readable in supported themes at 100%, 150%, and 200% zoom. At narrow widths the global table may scroll horizontally inside its panel; the page itself must not overflow. The compact viewer sheet retains its pinned header and scrollable body. No new animation is required, so reduced-motion behavior is unchanged.

## Explicit Non-Goals

- No history filters, search, grouping, totals, export, inline editing/deletion, or source-message link.
- No achievement badges or unlock rows until the achievement change defines them.
- No reward history in Live, Studio, Settings, the OBS dock, or overlay pages.

## Not applicable

Native windows, native menus, tray items, OS notifications, file dialogs, clipboard actions, and permission prompts do not change because the feature stays inside the existing admin web surface.
