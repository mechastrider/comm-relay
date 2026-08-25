## Context

See proposal.md for motivation. Overlay messages already have `.message__identity` (flex) and a `.message__platform` sibling. HUD themes use CSS grid without a platform area, so the icon auto-places under the avatar. Preview backdrops are body classes `overlay-preview--busy|checker|dark`. Admin already imports `web/overlay/overlay-settings.js`.

## Goals / Non-Goals

**Goals:**

- One identity slot for the platform icon across themes
- Shared preview backdrop vocabulary and query values
- Theme defaults that match G-Rebels platform-identity need (`both`)

**Non-Goals:**

- Uploading a real OBS scene screenshot
- Gray fifth backdrop
- Migrating existing G-Rebels presets that already saved `stripe`
- Changing platform-marker semantics (stripe vs author rail)
- Making cockpit-panel glass transparent in preview so footage always shows through

## Decisions

### Identity owns the icon

**Choice:** Append `.message__platform` inside `.message__identity` before `.message__user`.

**Rationale:** Identity already has `grid-area: user` in HUD themes and `inline-flex` + gap. Moving the node fixes placement without a new grid track.

**Alternatives:** Avatar-corner badge (clips on G-Rebels chamfer); extra grid column (duplicates identity).

### Canonical preview values

**Choice:** Canonical values `white`, `checker`, `scene`, `dark`. Alias `busy` → `scene`. Default `scene`. Shared `normalizePreviewBackground` in `overlay-settings.js`.

**Rationale:** `dark` stays as the query value (FAQ already uses it); labels become Black / Чёрный. Keep `scene` as the honest name instead of `busy`.

**Alternatives:** Rename `dark` to `black` (breaks FAQ URLs); keep `busy` as canonical (labels stay confusing).

### Backdrop lives on overlay `body`

**Choice:** Continue painting preview CSS on overlay `body`. Themes that cover the rectangle with HUD glass still hide footage there — that matches OBS.

**Alternatives:** Letterbox the scene around the iframe in admin chrome (preview-only lie); force HUD panel transparent in preview (dishonest).

### G-Rebels default `both`

**Choice:** `defaultOverlayStyleForTheme` / `defaultStyleForTheme` for `g_rebels_popups` use `both`, like `cockpit_popups`. No rewrite of stored preset style.

**Rationale:** G-Rebels nicknames are gold, so the icon is the platform signal. Existing saved `stripe` remains an explicit operator choice.

## Risks / Trade-offs

- [Existing G-Rebels presets stay without icons] → Changelog points at "Reset group to theme"
- [Cockpit panel name column is `fit-content(18ch)`] → Icon is `flex-shrink: 0`; name keeps ellipsis
- [Cached overlay CSS/JS] → Bump `?v=` on overlay assets

## Migration Plan

- New installs and new G-Rebels presets get `both`
- `preview_background=busy` and localStorage `busy` map to `scene`
- Rollback: revert overlay DOM/CSS and restore the three-value select; alias keeps old URLs working during the change only
