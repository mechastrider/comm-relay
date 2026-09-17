# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Live — Recap dialog | Choose session recap vs all-time status, show/hide on OBS, download a share PNG | Existing Live **Recap** action | Same localhost UI in Wails and a browser; download uses the page download, not a native save dialog |
| OBS `/overlay/recap` | Show the selected window full-canvas | Existing recap Browser Source | Transparent host; no download chrome |
| Recap History | Review stored session snapshots | Existing History tab | Unchanged; no all-time replay |
| Studio Recap | Theme/opacity preview | Existing Studio Recap surface | Sample remains session-shaped; no PNG control |

No new native window, tray item, or dock view.

## Menus / Tray / Commands / Shortcuts

- No global shortcut. Window switch, Show, Hide, and Download image are in the dialog tab order.
- Escape still closes the dialog only when no irreversible session Show is in flight. Download is reversible and does not block Escape.
- Recap windows are not chat commands.

## View / Flow: Recap window switch and share image

### Layout and Components

Current stream keeps the existing pinned header/footer dialog. Add a two-item window switch (session recap / all-time status) in the Current view, visually separate from Current/History. Session preview continues to prefer the stored snapshot after capture. All-time preview shows live `all_time` totals and Top 5 and never shows the session achievement feed.

Primary overlay actions stay **Show recap** / **Show again** / **Hide** for the session window. All-time uses **Show all-time** (or equivalent localized label) without the permanence confirmation. **Download image** sits in the footer beside those actions, labelled as saving a picture for social posts.

### Data / Forms / Actions

- Open still fetches `GET /api/stream-recaps/current`.
- Session show still posts `{ "session_id" }` to `POST /api/stream-recaps/show` after confirmation.
- All-time show posts `{}` to `POST /api/stream-recaps/show-all` with no confirmation step.
- Hide still posts `{}` to `POST /api/stream-recaps/hide`.
- Download uses the dialog's selected window and the matching payload (`snapshot` or `all_time`). It does not call a new HTTP encode endpoint.
- `stream_recap_state` updates overlay and dialog visibility; stored snapshot in the dialog is not cleared when `window` is `all`.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Disable duplicate Show/show-all/download; keep window switch visible; announce busy |
| empty | All-time with zero messaging viewers still allows show and download of a zero-total card; session download stays unavailable until capture |
| error/retry | Inline accessible error; visibility and SQLite snapshot unchanged |
| offline/degraded | Disable mutations and download; recover via existing admin reconnect |
| permission denied | Treat as ordinary localhost error |
| interrupted/recovered | Re-fetch current; do not auto-repeat show-all or download |

## View / Flow: Overlay recap windows

### Layout and Components

Hidden: empty transparent root. Session: existing closing composition. All-time: same full-canvas chrome with all-time title/kicker and XP/messages/viewers labels; ranking present when rows exist; no achievements column.

### Data / Forms / Actions

Production page consumes `/ws` only. It never fetches recap HTTP APIs and never starts a download.

### States and Recovery

Reconnect restores the last server window. Hide clears DOM. Sample preview stays isolated session sample.

## Accessibility / Keyboard / Focus

Window switch and Download image have visible labels (not icon-only). Selected window is announced. Download progress/failure is `role=status` or `alert`. Focus remains in the dialog during encode.

## Scaling / Theme / Localization / Reduced Motion

RU/EN keys for window names, all-time overlay copy, download, and errors. Share-card uses the active overlay theme colors on an opaque backdrop. Overlay reduced-motion rules still apply. Dialog at 700px height keeps header/footer pinned; body scrolls.

## Explicit Non-Goals

Square export, clipboard as a required second button, History on-air replay, Studio PNG preview, dock recap controls.

## Not applicable

Native menus, tray, multi-window desktop chrome.
