# Implementation Slices

## Backend

No production Go, HTTP, or `config.json` schema work. Overlay activate/update contracts stay as they are.

- [x] 0.1 Confirm implementation does not add routes or persist overlay drafts in `config.json`; keep existing `POST /api/config/update` and `POST /api/overlay/activate` callers only.

## Frontend

### Slice: `Studio owns one surface selection`

> **Outcome**: Chat, leaderboard, and alerts are one list; preview, inspector fields, and primary copy cannot disagree.
> **Acceptance**: Selecting each surface retargets the iframe and Follow-active copy; no second surface tab strip; `npm test` covers selection helpers.
> **Skills**: `comm-relay`, `web-static-frontend`, `web-constrained-layout`
> **Scope**: `web/admin` Studio markup/CSS/JS (`studio.js`, `overlay-preview.js`, `obs-setup.js`, `index.html`, `studio.css`)
> **Allowed fallout**: Hide or stop depending on `#overlay-dialog` panel transplants; locale keys for the list.
> **Blocked**: Overlay renderer changes, React, new APIs.

- [x] 1.1 Replace Studio mounts with owned markup: surface list (chat, leaderboard, alerts), preview stage, inspector. Stop `appendChild` from the OBS dialog. Verify `#studio` still clones a draft and Publish still works.
- [x] 1.2 Drive preview iframe, inspector field visibility, and primary Follow-active copy from one `selectedSurface`. Remove the independent appearance surface tabs. Verify dock is not in this list.
- [x] 1.3 Add or extend Node tests for surface selection and URL binding; include them in `npm test`.

### Slice: `Preview-first canvas chrome`

> **Outcome**: Preview is the widest pane; Replay and Follow-active copy stay visible; size, backdrop, sample/live, and pinned URL live in overflow.
> **Acceptance**: Wide layout preview-dominant; clipboard denial still leaves URL selectable; existing preview localStorage keys still apply.
> **Skills**: `web-static-frontend`, `web-constrained-layout`, `ux-form-practices`
> **Scope**: Preview toolbar, overflow, `overlay-preview.js`, copy helpers
> **Allowed fallout**: Tooltip/accessible names for overflow.
> **Blocked**: Changing `preview_background` values or overlay transparency.

- [x] 2.1 Restyle Studio to preview-first columns; stack list → preview → inspector on the compact breakpoint. Verify no horizontal page scroll at 390px.
- [x] 2.2 Move source size, custom dimensions, backdrop, sample/live, and pinned copy into preview overflow. Keep Replay and Follow-active copy outside the iframe. Verify backdrop order and `busy` → game footage.

### Slice: `Layered appearance inspector`

> **Outcome**: Theme gallery, font size, and chat duration are first; every current field remains under Advanced; one leaderboard period control.
> **Acceptance**: Duration chips write TTL 8/20/0; TTL 15 stays in Advanced; panel image still uploads from Advanced.
> **Skills**: `comm-relay`, `ux-form-practices`, `web-constrained-layout`
> **Scope**: Appearance form, `overlay-appearance.js`, inspector CSS
> **Allowed fallout**: Helper tests for duration mapping.
> **Blocked**: Removing style fields or changing theme ids.

- [x] 3.1 Present supported themes as labeled visual choices that write the existing theme field and refresh preview.
- [x] 3.2 Keep essential font size (per selected surface) and chat duration chips; map chips to `message_ttl_seconds` 8, 20, 0 without rewriting other stored TTL values.
- [x] 3.3 Move remaining current fields into Advanced (spacing, platform marker, text edge, font family, line height, panel, image/fit, borders, queue, reset-to-theme). Merge duplicate leaderboard period controls into one. Verify short windows scroll the inspector body with Publish pinned.

### Slice: `Add to OBS sheet`

> **Outcome**: First Studio visit opens a dismissible sheet with Browser Source steps, all Follow-active URLs, pinned access, and the message dock.
> **Acceptance**: Auto-open until dismissed; reopenable; dock help without theme controls; `commRelay.studio.addToObsDismissed` (or equivalent) with storage failure → auto-open.
> **Skills**: `web-static-frontend`, `ux-form-practices`, `web-constrained-layout`
> **Scope**: Sheet markup, `obs-setup.js`, preference helper
> **Allowed fallout**: Preference parse tests.
> **Blocked**: Using WebSocket client count as OBS connected.

- [x] 4.1 Build the height-capped Add to OBS sheet with shared Browser Source steps, chat/leaderboard/alerts copy, pinned URLs, leaderboard period, dock URL and Custom Browser Dock steps.
- [x] 4.2 Auto-open on first visit, persist dismiss in local preference, keep a Studio control to reopen. Verify storage unavailability still allows copy.

### Slice: `Look editing vs on-air switch`

> **Outcome**: Studio toolbar has no hot Active preset; Live keeps it; Studio offers Use on stream for a non-active look; single-look CRUD stays in overflow.
> **Acceptance**: Live activate unchanged; Use on stream calls `POST /api/overlay/activate`; Publish still required for appearance drafts.
> **Skills**: `comm-relay`, `web-static-frontend`
> **Scope**: Studio toolbar, `live-active-preset.js` usage, `overlay-appearance.js`
> **Allowed fallout**: Locale strings for Use on stream.
> **Blocked**: Combining Publish and activate into one required action.

- [x] 5.1 Remove the Studio toolbar active-preset hot control; keep the Live control. Add Use on stream when the edited look is not active, with progress and error handling matching Live.
- [x] 5.2 Hide add/rename/duplicate/delete from primary chrome when only one look exists; keep them reachable from overflow or when multiple looks exist. Verify dirty navigation confirm still runs.

- [x] 5.3 Add RU/EN strings for new Studio chrome (Add to OBS, Use on stream, duration, overflow, Advanced) and run `npm run test:i18n`.

## Docs

- [x] 6.1 Add concise Russian `[Unreleased]` bullets for the Studio IA (one surface list, Add to OBS, layered look, Live-only hot switch, Use on stream). Do not edit versioned changelog sections.
- [x] 6.2 Update README and FAQ Studio/OBS steps so copy, dock, pinned URLs, and Publish match the new places. Leave `docs/concept.md` unchanged unless the product contract itself changes (it should not).

## Verification

- [x] 7.1 Run `npm ci` if needed, then `npm run lint && npm test && npm run test:i18n`.
- [x] 7.2 Run `go test ./...` and `golangci-lint run ./...` (and `go test ./... -race` when practical).
- [x] 7.3 Execute P0 rows in `qa_plan.md` in Chromium: single surface, Add to OBS first visit/dismiss, layers, duration/custom TTL, copy/pinned, Live activate, Use on stream, dirty draft, clipboard denial, 1440/1100/390 and short height.
- [x] 7.4 Smoke overlay/leaderboard/alert/dock URLs still transparent and following/pinned as before. RU/EN, 200% zoom, reduced motion as P1 if time.

## Gate: qa

- [x] Q.1 Record `qa_plan.md` matrix coverage and evidence (screenshots of Studio surfaces, Add to OBS, Advanced, short window).

## Gate: review

- [x] R.1 Fresh diff review; no leftover dialog transplant; CRITICAL=0; lint/tests green.

## Gate: distribution-readiness

- [x] D.1 Confirm packaged/embedded `web/` would include the new Studio assets; no signing or publish. `openspec validate studio-surface-centric-redesign --strict` succeeds.
