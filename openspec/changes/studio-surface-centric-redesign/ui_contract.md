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

No native menu, tray, global shortcut, or new keyboard shortcut. In-document: Tab order through surface list, preview overflow, inspector, Add to OBS, and Publish; Escape dismisses Add to OBS when allowed; Enter/Space activate choices. Existing dirty-Studio `beforeunload` and hash-navigation confirm remain.

## View / Flow: `Studio`

### Layout and Components

Wide layout: on-stream surface list (chat, leaderboard, alerts) | dominant preview | layered inspector. Compact: stack list, preview, inspector. Preview iframe keeps a stable aspect box; chrome sits outside the iframe.

Always-visible preview chrome: Replay, Follow-active copy for the selected surface, overflow control. Overflow holds source size, custom width/height, backdrop (white / checkerboard / game footage / black), sample vs live chat (chat only), and pinned URL copy.

Inspector essential layer: visual theme choices, font size for the selected surface, chat duration chips when chat is selected. Advanced disclosure contains every remaining current appearance field. Look name and Publish sit in the Studio header. Preset CRUD is overflow or shown when more than one look exists. Use on stream appears only when the edited look is not `overlay.active_preset_id`.

Add to OBS is a height-capped sheet/dialog: shared Browser Source steps, per-source Follow-active (and pinned) URLs for chat/leaderboard/alerts, leaderboard period, message dock URL and Custom Browser Dock steps. It auto-opens once per browser/webview until dismissed and remains reopenable.

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

Surface list uses a single selection pattern with visible selected state and names, not color alone. Theme choices have accessible names matching localized theme labels. Icon-only overflow, Add to OBS, Replay, and preset actions have names and hover/focus tooltips. Add to OBS and Advanced trap nothing; Escape closes the sheet when dismissal is allowed and returns focus to the opener. After opening Advanced, the operator can tab to every revealed field and to Publish. Focus moves to the Studio heading when entering `#studio`, consistent with other workspaces.

## Scaling / Theme / Localization / Reduced Motion

RU/EN catalogs cover new Studio strings (Add to OBS, Use on stream, duration chips, overflow, Advanced). Existing obs.* keys may be reused. 200% zoom and ~700px-tall windows must keep Publish and copy reachable via inspector scroll. Reduced motion: no essential state only in animation. Admin visual theme tokens stay; overlay theme cards preview overlay looks, not the admin palette.

## Explicit Non-Goals

- Redesigning Live chat, Audience, Settings, or About.
- Overlay visual theme redesign.
- Claiming an OBS source is visible in a scene.
- Native OS file dialogs for URL copy.

## Not applicable

Native window chrome, tray, and global shortcuts are unchanged. Overlay/dock documents are unchanged except that Studio preview query construction stays compatible.
