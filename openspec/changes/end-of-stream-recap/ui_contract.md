# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Live — recap control | Review the current session, capture its final recap once, and show or hide it | Existing Live workspace, separate **Recap** action beside but not merged with **New stream** | Same localhost web UI in Wails and a browser; no native-only control |
| Live — session history | Review compact current and prior-session summaries without opening an analytics workspace | **Recap** opens a modal with **Current stream** and **History** views | Same constrained dialog behavior in Wails and a browser |
| Studio — Recap surface | Preview and tune recap appearance without touching production state | Existing Studio surface selector gains **Recap** after Chat, Leaderboard, and Alert | Same draft/publish flow on all supported hosts |
| OBS setup | Add a dedicated full-canvas Browser Source | Existing OBS setup/help locations list follow-active and pinned `/overlay/recap` URLs | Clipboard/open affordances use the existing host capabilities and fallbacks |
| OBS Browser Source | Present the closing recap on stream | Direct local `/overlay/recap` URL, optionally pinned with `?preset=<id>` | Layout responds to the source rectangle, not the host OS |

The Wails application remains one window. No new native window, route-level workspace, tray entry, or dock view is introduced.

## Menus / Tray / Commands / Shortcuts

- Existing application, tray, browser, and OBS menus remain unchanged.
- No global shortcut is added. The Recap, Show recap, Hide, Current stream, History, Back, Close, Load more, copy, and open actions are reachable in normal tab order.
- Escape closes the topmost recap dialog only when no irreversible Show request is in flight. The existing platform/browser copy and open commands retain their current success and failure feedback.
- Recap is deliberately not a chat command and is never triggered by an incoming platform message.

## View / Flow: Live Recap Control and History

### Layout and Components

The existing Live toolbar gains one **Recap** action visually separated from **New stream**. It opens the established accessible modal shell with a pinned title/close header, a scrollable body, and a pinned action footer. A two-item view switch exposes **Current stream** and **History** without changing the main workspace.

Current stream shows session start, live aggregate totals, recap capture time when present, a bounded Top 5, and eligible achievement groups. Before first capture, its primary action is **Show recap** and opens a confirmation step. Confirmation names the current session/start time, states that the snapshot is permanent for this session, and explicitly says that counters and the session are not reset. After capture, the same immutable preview is shown with **Show again** and, while visible, **Hide**.

History uses newest-first summary rows with start time, current/completed state, aggregate totals, and a captured-recap marker. Selecting a row replaces the scrollable body with detail and a Back control. **Load more** is explicit and appears only when `next_cursor` exists. Prior detail may show its stored snapshot but never offers a production Show action.

### Data / Forms / Actions

- Opening fetches `GET /api/stream-recaps/current`; opening History fetches `GET /api/sessions?limit=<bounded>` on demand.
- Selecting history fetches `GET /api/sessions/get?id=<id>`. Pagination follows the opaque cursor and does not infer offsets.
- Confirmation posts the session id displayed in the dialog to `POST /api/stream-recaps/show`; the primary button is disabled while that request is in flight.
- Hide posts `{}` to `POST /api/stream-recaps/hide` and is idempotent. No optimistic visibility change is shown before success.
- Current state may refresh from `stream_recap_state`; a returned or pushed snapshot replaces the current view only when it identifies the current session.
- User-supplied names, titles, and achievement text are inserted as text. Timestamps and counts use existing localization helpers.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Keep dialog chrome and context visible, mark the changing region busy, disable only conflicting actions, and prevent duplicate Show submissions |
| empty | A session with no participants displays zero totals and explanatory copy; empty history states that no earlier streams are stored |
| error/retry | Preserve already rendered data and visibility, place an accessible inline error beside the failed action, and offer Retry for reads |
| offline/degraded | Explain that CommRelay is unreachable, retain the dialog, disable mutations, and recover through the existing admin reconnect path |
| permission denied | Not expected on localhost; any authorization-style server error is rendered as an ordinary safe error without exposing details |
| interrupted/recovered | Re-fetch current recap state after reconnect; do not resend Show automatically or reconstruct a pending confirmation |
| stale session conflict | On HTTP 409, discard the stale confirmation, announce that New stream changed the session, and refresh Current stream without showing the old recap |

## View / Flow: Studio Recap Surface

### Layout and Components

Studio's themed-surface selector gains a fourth Recap option. It uses the same preset selector, draft banner, publish/revert controls, device frame, and preview-background tools as existing surfaces. The preview URL is `/overlay/recap?preview=sample` plus the existing draft-preview transport and optional pinned preset context. The appearance form adds one labelled recap backdrop-opacity control with its numeric value visible.

### Data / Forms / Actions

The opacity control edits `surfaces.recap.panel_opacity` in the draft only. It accepts 0 through 1 using the same bounded input conventions as other surface opacity controls. Publishing uses the existing preset update action and sends recap appearance together with the rest of the draft. Switching Studio surfaces preserves all unpublished values. Preview data is built in and cannot call recap Show/Hide or history endpoints.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Keep the preview frame stable while preset data loads or publishes and disable duplicate publish |
| empty | A missing recap override displays the theme-derived default rather than an empty control |
| error/retry | Keep the draft after validation/network failure, focus or associate the invalid field, and allow correction/retry |
| offline/degraded | Preserve the local draft, show the existing disconnected state, and avoid implying that production changed |
| permission denied | Not applicable beyond ordinary localhost request failure |
| interrupted/recovered | Reload published settings after reconnect only under existing Studio rules; never show or capture production recap |

## View / Flow: OBS Recap Surface and Setup

### Layout and Components

The hidden production page has no visible shell. A visible snapshot fills the source rectangle with a theme-specific closing composition: closing title, compact aggregate strip, Top 5, and up to six grouped achievement recognitions. Empty sections collapse and the remaining content reflows. Landscape favors a balanced two-column finale; square and portrait stack primary regions while keeping the closing title and ranking readable. No scrollbar or interaction control appears on stream.

OBS setup presents a named **Recap** row with follow-active and pinned URLs, Copy/Open actions, and short guidance: use a canvas-sized Browser Source and place it above normal scene sources. It does not replace or resize the Alert source.

### Data / Forms / Actions

Production rendering consumes only server-provided `stream_recap_state`; it does not fetch history or compute totals. On connect it applies the initial hidden/visible state. On Hide it removes recap content from the DOM so the page is fully transparent. Studio sample mode uses fictitious bounded content and ignores production state.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Remain transparent until an authoritative visible state arrives; do not flash sample or stale content |
| empty | Render a valid closing card with zero totals when the captured session is empty; collapse ranking/achievement regions |
| error/retry | Keep the last authoritative in-process visible snapshot during a transient reconnect, then converge to the initial state frame; broken portraits use stable fallbacks |
| offline/degraded | Do not invent new data or mutate server state; reconnect with bounded backoff |
| permission denied | Not applicable to the local Browser Source route; load failures follow offline behavior |
| interrupted/recovered | A Browser Source reload restores the exact visible immutable snapshot; a server restart reports hidden and clears the page |

## Accessibility / Keyboard / Focus

- Recap controls use native buttons with persistent visible labels and existing focus styles; status is not conveyed by color alone.
- Opening the modal moves focus to its heading or first meaningful control and traps focus inside. Cancel/Close returns focus to the Recap action; Back returns focus to the originating history row.
- Confirmation uses an accessible dialog name and description. Permanent capture, no-reset semantics, errors, visibility changes, and newly loaded history are announced through the established status/error region without repeated chatter.
- Tabs or segmented controls expose their selected state programmatically. History rows are buttons or links, not clickable containers.
- Loading uses `aria-busy` on the affected region; disabled actions remain understandable from nearby text. All text alternatives and control names are localized.
- The OBS surface is non-interactive and decorative animation never carries information unavailable in static content.

## Scaling / Theme / Localization / Reduced Motion

- Admin layouts support the existing Wails minimum geometry and approximately 700-pixel-high constrained windows by scrolling only the modal body while pinning header/footer controls.
- Browser zoom, Windows display scaling, and long Russian/English strings must not clip actions, totals, names, or dialog headings. Narrow layouts wrap actions and truncate only secondary viewer text with a visible full accessible name.
- Every shipped overlay theme defines Recap tokens/composition and a readable default backdrop opacity. Pinned preset resolution and active-preset updates match other themed surfaces.
- The UI adds Russian and English strings through the existing locale system; no text is assembled from translated fragments.
- `prefers-reduced-motion: reduce` removes entrance and idle movement, using an immediate static composition. High-contrast/focus behavior follows existing admin tokens.

## Explicit Non-Goals

- No automatic stream-end prompt, automatic capture, timer, or implicit New stream action.
- No historical recap replay, snapshot replacement, session rename, charts, export, deletion, or full Analytics workspace.
- No recap controls in `/dock/messages`, chat commands, global shortcuts, tray menus, or native notifications.
- No per-achievement media editor or independent recap theme selector.

## Not applicable

Native mobile UI, touch-specific gestures, native menus, multiple desktop windows, OS notifications, permission prompts, and direct OBS control are not part of this web/Wails-hosted change.
