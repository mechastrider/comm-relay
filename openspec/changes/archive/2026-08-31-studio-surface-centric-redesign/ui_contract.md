# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Admin shell | Move between Live, Audience, Studio, Settings, About | `/`, existing sidebar/bottom nav | Same document in Wails and external browsers |
| Live | Operate the stream, including switching the on-air look | `#live` | Unchanged except it remains the only always-visible hot active-preset control |
| Studio | Preview a surface, edit a look, Publish, copy OBS URLs | `#studio`; Add to OBS from Studio | Clipboard fallback may vary by web engine |
| Overlay / leaderboard / alert / dock | Program and operator surfaces | Existing routes; copied from Studio | Existing OBS CEF differences remain |

Live, Audience, Settings, About, and the dock page do not change layout in this work except removing the Studio toolbar duplicate of active preset.

## Menus / Tray / Commands / Shortcuts

No native menu, tray, global shortcut, or new keyboard shortcut. In-document: Tab order through surface list, preview overflow, inspector, Add to OBS, and Publish; Escape dismisses Add to OBS when allowed; Enter/Space activate choices. Dirty hash navigation uses the CommRelay prompt dialog; browser reload/window close retains the required native `beforeunload` warning.

## View / Flow: `Studio`

### Layout and Components

Wide layout: adaptive on-stream surface rail (chat, leaderboard, alerts) | dominant preview | layered inspector. The rail starts with icons and labels, can collapse to icons, and remembers the local preference. The three panel shells share a top edge, inset, border, and section-spacing rhythm. Rail collapse animates briefly on wide layouts and resolves immediately under reduced motion. Compact: horizontal labeled surface selector, preview, inspector. Preview iframe keeps a stable aspect box; chrome sits outside the iframe.

Always-visible Essentials preview chrome: Replay and compact Follow-active copy for the selected surface. All settings additionally exposes a selectable raw URL with a localized accessible name and an overflow with source size, custom width/height, backdrop (white / checkerboard / game footage / black), sample vs live chat (chat only), and pinned URL copy. Replay, URL, copy, and overflow controls share one height and baseline; the visible Follow-active caption is omitted from this compact toolbar.

Essentials inspector: look selection, visual theme choices, selected-surface font, chat duration or leaderboard period, and a contextual Alerts explanation when the surface has no dedicated controls. All settings reveals Advanced and preset CRUD. Look name and Publish sit in the Studio header. Use on stream appears only when the edited look is not `overlay.active_preset_id`, and is disabled while the draft is dirty.

The toolbar exposes Essentials / All settings as a pressed-button group. Both modes share the same draft and selected surface. Compact view adds a sticky bottom action bar for dirty status, Use on stream, and Publish, with enough document padding to keep the last control visible.

OBS setup is a height-capped sheet/dialog: shared Browser Source steps, per-source Follow-active (and pinned) URLs for chat/leaderboard/alerts, leaderboard period, message dock URL and Custom Browser Dock steps. It auto-opens only while unseen. Close, Later, and Done produce distinct local states; an Essentials checklist remains for seen/skipped setup and a persistent action always reopens it.

Studio MUST NOT show a second Chat/Leaderboard/Alerts tab strip that can disagree with the surface list. Studio MUST NOT transplant `#overlay-dialog` panels as the workspace layout.

### Data / Forms / Actions

- Opening Studio clones overlay config into a draft; preview reads the draft.
- Theme, font, duration, and Advanced fields update the draft only until Publish (`POST /api/config/update` composed as today).
- Duration chips write `message_ttl_seconds` 8, 20, or 0; other stored TTL values stay in Advanced.
- One leaderboard period control drives URLs.
- Primary copy is Follow-active for the selected surface; pinned copy is overflow / Add to OBS.
- Use on stream calls `POST /api/overlay/activate` with the edited look's `preset_id`.
- Dirty navigation/reload still confirms; Cancel stays in Studio.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Preview and inspector keep stable bounds; Publish, Use on stream, and destructive preset actions show progress and reject duplicate submission. |
| empty | Missing/invalid preset after recovery explains the fault and offers reload; do not invent fake theme cards. |
| error/retry | Preview failure does not discard the draft. Publish/activate errors stay near controls and in the existing banner. |
| offline/degraded | Draft editing remains available. Connected overlay clients are still not described as OBS scene visibility. |
| permission denied | Clipboard denial leaves the URL visible/selectable and reports failure. Asset upload denial keeps the previous image. |
| interrupted/recovered | Server config refresh does not silently overwrite a dirty draft. Add to OBS dismissed preference is local only; missing storage auto-opens the sheet. |

## View / Flow: `Live`

### Layout and Components

Unchanged Messages / Leaderboard / Statistics. The hot active-preset control remains on Live and MUST remain the in-stream look switcher.

### Data / Forms / Actions

Selecting a different active preset immediately calls `POST /api/overlay/activate` as today.

### States and Recovery

Unchanged from the current Live contract.

## Accessibility / Keyboard / Focus

Surface controls use pressed-button semantics with visible selected state and names, not color alone. Arrow keys, Home, and End move and activate within the group. Collapsed icon controls retain names and hover/focus tooltips. Theme choices have accessible names matching localized theme labels. Icon-only overflow, OBS setup, Replay, and preset actions have names and hover/focus tooltips. OBS setup and Advanced trap nothing; Escape closes the sheet, records seen rather than completion, and returns focus to the opener. After opening Advanced, the operator can tab to every revealed field and to Publish. Focus moves to the Studio heading when entering `#studio`, consistent with other workspaces.

The dirty-navigation dialog is labelled by its title, describes the unpublished draft, offers Cancel and a visually destructive Discard action, closes on Escape as Cancel, and returns focus to the navigation control that initiated the attempted workspace change. Its frame and translated actions remain inside the viewport without horizontal page scroll; actions wrap or stack when space is insufficient.

## Scaling / Theme / Localization / Reduced Motion

RU/EN catalogs cover new Studio strings (Add to OBS, Use on stream, duration chips, overflow, Advanced). Existing obs.* keys may be reused. 200% zoom and ~700px-tall windows must keep Publish and copy reachable via inspector scroll. Reduced motion: no essential state only in animation. Admin visual theme tokens stay; overlay theme cards preview overlay looks, not the admin palette.

## Explicit Non-Goals

- Redesigning Live chat, Audience, Settings, or About.
- Overlay visual theme redesign.
- Claiming an OBS source is visible in a scene.
- Native OS file dialogs for URL copy.

## Not applicable

Native window chrome, tray, and global shortcuts are unchanged. Overlay/dock documents are unchanged except that Studio preview query construction stays compatible.
