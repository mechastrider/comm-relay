# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Admin shell | Understand system state and move between operational tasks | `/`, persistent sidebar at wide widths, bottom navigation at narrow widths | Same document in Wails and external browsers |
| Live | Monitor and moderate the current broadcast | `#live`; default destination | None |
| Audience | Find, inspect, merge, rank, and reset viewer-session data | `#audience` | None |
| Studio | Configure surfaces, preview drafts, publish presets, and copy OBS URLs | `#studio` | Clipboard fallback may vary by web engine |
| Settings | Configure platforms, network, data, interface, diagnostics, and about | `#settings`; secondary section navigation within workspace | None |
| Messages dock | Read and moderate chat inside OBS | `/dock/messages`; linked from Studio source setup | Existing OBS dock availability differences remain |
| Overlay and leaderboard | Render program output | `/overlay`, `/leaderboard`; previewed in Studio | Existing OBS CEF differences remain |

The shell header contains the product identity, current session indicator, aggregate health, and a compact diagnostics entry. Product identity remains a clear first-viewport signal without marketing copy. Primary navigation does not include Interactions until that capability is implemented.

## Menus / Tray / Commands / Shortcuts

No native menu, tray, global command, or new keyboard shortcut is introduced. Standard browser history, Tab/Shift+Tab, Enter/Space activation, arrow-key tab navigation, and Escape dialog dismissal apply. The redesign SHALL NOT show viewer-command controls or keyboard-shortcut help for unavailable features.

## View / Flow: `Live`

### Layout and Components

Live uses a compact status strip followed by one unframed work area with tabs: Messages, Leaderboard, and Statistics. Messages is a dense chronological log, not a decorative card grid. The selected tab controls one stable content rectangle so tab changes do not shift the surrounding shell.

At wide widths an optional right inspector may show connector health and the active preset. At compact widths the same information appears in document flow. Status color is always paired with text or an icon label.

### Data / Forms / Actions

- Messages restore existing history, append `/ws` events, preserve manual scrolling, and expose delete only for stable source IDs.
- Leaderboard uses existing session/day/all-period data and ranking fields.
- Statistics presents current supported aggregates derived from viewer/session data; it does not imply historical sampling.
- Active preset is a hot segmented/menu control. Selection immediately calls `POST /api/overlay/activate`; no Save button accompanies it.
- New stream keeps its existing confirmation and session-reset behavior.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Show region-level skeletons or progress while retaining the shell and any previously loaded data. Disable only the initiating hot control. |
| empty | Explain the absence in domain terms: no messages, no ranked viewers, or no current session data. |
| error/retry | Show a scoped error and retry for the failed resource; other tabs and shell navigation remain usable. |
| offline/degraded | Show disconnected connectors individually and keep local history/settings accessible. |
| permission denied | Not expected for Live; use the standard API error surface if returned. |
| interrupted/recovered | Reconnecting is visible but nonmodal; recovered WebSocket/status replaces stale state and announces reconnection. |

## View / Flow: `Audience`

### Layout and Components

Audience uses a toolbar with search and period/filter controls, followed by a dense viewer table. Viewer detail opens in a constrained side inspector at wide widths and an in-flow sheet/dialog at compact widths. A detail surface is not nested inside another card.

### Data / Forms / Actions

- Search is labeled and debounced or submitted explicitly; it does not filter by placeholder text alone.
- Rows expose viewer identity, linked platforms, score/activity fields supported by the API, and an accessible detail action.
- Detail preserves implemented edit/merge behavior, including destructive-action confirmation and server validation.
- Leaderboard and New stream remain reachable without duplicating server state.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Table geometry stays stable and detail mutations prevent duplicate submission. |
| empty | Differentiate no viewers from no search matches and offer the appropriate clear-filter action. |
| error/retry | Preserve search/filter input and expose retry. Validation errors appear beside fields and focus the first invalid field. |
| offline/degraded | Existing loaded data may remain visible as stale; mutations are not reported successful until acknowledged. |
| permission denied | Use the standard API error presentation; no privileged OS access is requested. |
| interrupted/recovered | A reopened detail reloads current server data before mutation. |

## View / Flow: `Studio`

### Layout and Components

Studio has a surface list, a large unframed preview, and a preset/property inspector. Wide layouts may use three columns; compact layouts stack list, preview, and inspector in that order. The preview uses a stable aspect ratio and contains controls outside the iframe so labels never cover program output.

Source setup is part of Studio and distinguishes Chat overlay, Leaderboard, and Messages dock. The default chat and leaderboard copy actions are labeled Follow active preset. Pinned source URLs are available through an Advanced/Pinned option and identify the selected preset.

### Data / Forms / Actions

- Opening Studio clones the current overlay configuration into a draft.
- Preset field edits update only the draft and preview iframe.
- Publish refreshes public config, combines the latest non-overlay settings with the draft overlay section, validates, and submits `POST /api/config/update`.
- Publish success replaces the baseline and clears dirty state; failure retains the draft and maps field errors to controls.
- Active-preset selection is independent and immediate through the activation action.
- Add, duplicate, rename, delete, theme style, asset upload, backdrop, and source URL behaviors already implemented remain available.
- Leaving a dirty draft by navigation, reload, or close requests confirmation. Cancel keeps the operator in Studio.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Preview frame and inspector retain stable bounds; Publish and destructive preset actions show progress and reject duplicate submission. |
| empty | If no valid preset is available after recovery/defaulting, explain the fault and offer reload rather than showing fake controls. |
| error/retry | Preview failure does not discard the draft. Publish errors stay near affected fields and in a summary. |
| offline/degraded | A disconnected overlay client is described as no connected browser clients, not as an OBS failure. Draft editing remains available. |
| permission denied | Clipboard denial leaves URL text selectable; asset API denial/error keeps the previous asset. |
| interrupted/recovered | After server reload, Studio fetches a fresh baseline; it never silently merges over a dirty draft. |

## View / Flow: `Settings`

### Layout and Components

Settings uses a plain section list or tabs for Platforms, Network, Data, Application, Diagnostics, and About. Each editable section is a semantic form with its own Save action and short dirty indicator. There is no page-wide Save. Forms use visible labels, help/error associations, native control semantics, and reveal conditional fields without layout overlap.

### Data / Forms / Actions

- Platforms contains existing Twitch, YouTube, and VK connection modes and OAuth actions.
- Network contains server port and SOCKS5 proxy settings.
- Data contains implemented viewer-data controls only.
- Application contains interface language and message-sound settings.
- Diagnostics and About retain existing copyable/refreshable information and do not masquerade as editable settings.
- Save sends the established full config assembled from the latest public config plus the section draft; blank secret fields preserve stored secrets.
- Navigating away from a dirty Settings section requests confirmation or retains the draft until explicitly reset.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Disable the submitted section only and keep other settings readable. |
| empty | Optional connector/account fields show their disconnected setup state. |
| error/retry | Show summary plus field errors, focus the first error, and retain entered values. |
| offline/degraded | Local API loss disables Save with a clear reconnecting state; it does not clear forms. |
| permission denied | OAuth or connector authorization failures show existing actionable recovery. |
| interrupted/recovered | Refresh current public config before composing a later save; never overwrite newer unrelated settings from a stale page snapshot. |

## Accessibility / Keyboard / Focus

- The document provides skip navigation, `header`, `nav`, `main`, and appropriately labeled complementary regions.
- The active workspace uses `aria-current`; tabs implement tab/tabpanel keyboard semantics; data tables retain headers and captions or accessible names.
- Opening a dialog/sheet moves focus inside, traps it while modal, and restores it on close. Initial focus avoids destructive confirmation by default.
- Validation uses text and programmatic associations, not color alone. A summary links to invalid controls and the first invalid control receives focus after submit.
- Toast/live feedback uses `status` for success and polite updates, `alert` for blocking errors. Toasts do not contain the only recovery action.
- Pointer targets are at least 40 by 40 CSS pixels in dense desktop UI and 44 by 44 at narrow touch widths, except native inline text-selection affordances.

## Scaling / Theme / Localization / Reduced Motion

The console supports Russian and English catalogs, 24-hour time, text zoom to 200%, and long translated labels without overlap. Letter spacing remains zero and font sizes do not scale with viewport width. Light/dark theme behavior follows the existing product decision; both, if exposed, use the same semantic token names and meet WCAG AA contrast for normal text and interactive states.

Breakpoints are behavior-driven: at or above 1024 px the sidebar is persistent; below it inspectors stack; at narrow phone widths primary destinations use a fixed, non-overlapping bottom navigation with content padding for the navigation height. Reduced-motion preference removes nonessential transitions, while busy, dirty, success, and error states remain perceptible.

## Explicit Non-Goals

- Enabled Interactions navigation, viewer commands, splash triggers, and alert-source controls.
- Historical time-series charts or invented analytics.
- OBS scene/source visibility and scene switching.
- Visual redesign of the program overlays themselves.
- New global keyboard shortcuts, command palette, marketing/landing content, or onboarding tour.

## Not applicable

Native window creation, multiwindow coordination, OS menus, tray redesign, native notifications, and mobile-native navigation do not change in this proposal.
