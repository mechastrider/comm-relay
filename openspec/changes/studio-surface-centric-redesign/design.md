## Context

Studio is a three-column workspace assembled by moving panels out of the leftover OBS settings dialog. The left column is Connection (source list, Follow/Pinned URLs, how-to). The center is preview chrome plus iframe. The right is the appearance inspector (preset island, Chat/Leaderboard/Alerts tabs, and most overlay fields). Those two selectors do not share state, so the source list and the preview can disagree. The toolbar also hosts a hot Active preset control beside draft-until-Publish.

This change redesigns only the Studio workspace and its copy/onboarding chrome. Overlay rendering, URL query contracts, `POST /api/config/update`, `POST /api/overlay/activate`, and `config.json` stay as they are.

## Goals / Non-Goals

**Goals**

- One selected on-stream surface drives preview, inspector, and primary copy.
- First contact is Add to OBS (copy chat URL + Browser Source steps), not a wall of style fields.
- Keep every current appearance and URL capability reachable through layered disclosure.
- Make preview the dominant pane; stop transplanting dialog markup into Studio mounts.
- Keep persistence semantics: appearance is a draft until Publish; activating a look is a hot action on Live (and Studio Use on stream when editing a non-active look).

**Non-Goals**

- New overlay themes, overlay CSS redesign, or leaderboard/alert renderer changes.
- React or another frontend framework.
- OBS WebSocket, scene visibility, or treating WebSocket client count as proof a source is on a scene.
- Moving platform connect onboarding into Studio (Settings → Platforms remains first).
- Changing `config.json` schema, Goose/SQLite, or HTTP routes other than existing activate/update.

## Component / Process / IPC Boundaries

The Go process is unchanged. Studio remains static HTML/CSS/JS under `web/admin/` plus shared locales. Wails and external browsers load the same `/` document.

Studio MUST own its workspace markup (surface list, preview stage, inspector, Add to OBS sheet) instead of `appendChild` from `#overlay-dialog`. Existing modules stay the domain owners:

- `studio.js` — draft/baseline, Publish, dirty navigation guard.
- `overlay-appearance.js` — preset form collect/apply, theme/style fields, Use on stream wiring to the existing activate helper used by Live.
- `overlay-preview.js` — iframe URL, backdrop, size, sample/live, Replay.
- `obs-setup.js` — URL builders, clipboard copy/fallback, Add to OBS content (today's source-detail panes).
- `live-active-preset.js` — Live toolbar only.

No new IPC. Clipboard remains the browser/webview clipboard with the existing selectable-URL fallback.

## State and Event Flow

```text
selectedSurface ──► preview iframe
                 ──► inspector field set
                 ──► primary Follow-active copy

look being edited ──► draft overlay.presets[id]
Publish           ──► POST /api/config/update (overlay section)
Use on stream     ──► POST /api/overlay/activate { preset_id }
Live active control ──► same activate action
```

Opening Studio still clones public overlay config into a draft. Preview reads the draft. Leaving dirty Studio still confirms discard.

`selectedSurface` is UI state (`chat` | `leaderboard` | `alerts`), restored from the existing preview-surface local preference when valid. Add to OBS auto-open uses a separate local preference (dismissed vs not). Preview size, backdrop, and sample/live keep today's local preferences, just behind overflow.

Leaderboard `period` has one control. It updates both the displayed URL and the inspector; the duplicate source-pane select is removed.

## Threading / Async / Cancellation

Unchanged: Publish and activate disable their initiating control until completion; ignore stale config responses after leaving Studio; preview refresh stays debounced. Add to OBS copy uses the existing clipboard path.

## Security and Trust Boundaries

Unchanged localhost trust model. Copyable URLs still come from URL APIs and never include OAuth secrets. Overlay preview query values remain enumerated. Chat/preview strings stay text nodes. No new network origin, telemetry, or npm runtime dependency.

## Decisions and Alternatives

### Decision: Surface-centric Studio, not Connect/Look modes

One list of on-stream surfaces plus a reopenable Add to OBS sheet. Permanent Connect vs Look tabs were rejected because they recreate the old dialog split. A cosmetics-only three-column tidy was rejected because it leaves the dual-selector bug.

### Decision: Dock lives in Add to OBS, not the surface list

`/dock/messages` is operator chrome and unthemed. Putting it beside chat implied it had a look. It remains fully reachable from Add to OBS.

### Decision: Live owns hot on-air switching

The Studio toolbar Active preset control is removed so Publish is not confused with activate. Live keeps the hot control for in-stream look changes. Studio offers Use on stream only when the edited look is not active. A combined "Publish and go live" was rejected because publishing a non-active look (preparing a second scene) is a real workflow.

### Decision: Layered inspector, not fewer capabilities

Essential: visual theme picker, surface font size, chat duration chips (8 / 20 / until replaced → `message_ttl_seconds` 8 / 20 / 0). Everything else stays under Advanced, including custom TTL values that are not those three. Removing panel image or pinned URLs was rejected.

### Decision: Own Studio markup

Continue to share JS helpers; stop moving dialog nodes. The leftover OBS dialog can be hidden or reduced once Studio no longer depends on it. Keeping the transplant was rejected because it forces two layouts to share one DOM tree.

### Decision: First-visit Add to OBS via local preference

Auto-open until dismissed in that browser/webview. Do not use WebSocket client count as "OBS is connected" (forbidden by existing spec). Do not persist the flag in `config.json`.

## Risks / Trade-offs

- Operators who learned the left source column will look for dock and pinned URLs in Add to OBS / overflow; README, FAQ, and in-sheet copy must name the new places.
- Duration chips can hide an unusual stored TTL until Advanced is opened; the spec forbids silently rewriting it.
- Theme cards need accessible names so visual-only picking does not fail keyboard or screen-reader use.
- Short Wails windows remain a clipping risk; inspector MUST scroll independently of Publish.

## Migration / Rollout / Rollback

No data migration. Existing presets, pinned OBS URLs, and preview localStorage keys remain valid. Rollout is a static-asset release. Rollback is the previous admin assets; `config.json` and SQLite are untouched. Operators may need one-time rediscovery of Add to OBS.

## Open Questions

None blocking. Assumed from exploration option B: Add to OBS auto-opens on first Studio visit (not "first unpublished theme"); Live keeps activate; Studio Use on stream is the only Studio activation path.

## Refinement Decisions

### Essentials and All settings are density, not separate workflows

The two modes project one selected surface and one draft. Essentials hides engineering details but retains the shortest complete path: select surface, choose look, adjust the common controls, preview, connect OBS, and Publish. All settings reveals the existing raw URLs, preview tuning, Advanced form, and preset management. The preference is browser-local because it is operator UI state, not stream configuration.

### The surface list adapts instead of disappearing

Wide Studio uses an expanded icon-and-label rail by default and permits an icon-only collapse remembered locally. Compact Studio always renders the three surfaces as a horizontal labeled selector, ignoring the visual collapse preference until wide layout returns. Selection uses an amber edge marker plus background, icon, and type weight; keyboard arrows move and activate selection.

### OBS setup has explicit outcomes

The local setup state is `unseen`, `seen`, `skipped`, or `completed`. Only `unseen` auto-opens. Close, Escape, and backdrop write `seen`; Later writes `skipped`; Done writes `completed`. Essentials reminds for every state except `completed`, while the toolbar-level setup action always remains. The legacy dismissed boolean maps to completed so existing users are not interrupted after upgrade.

### Activation cannot use a stale persisted look

Use on stream continues to be a hot activation and remains separate from Publish, but it is disabled while the edited look is dirty. This prevents the previewed draft from implying that activation will put those unpublished values on air. The control explains the required Publish step; Publish itself does not activate automatically.
