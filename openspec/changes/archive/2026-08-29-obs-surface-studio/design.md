## Context

See `proposal.md` for why. Chat overlay already has named presets, theme ids, an Appearance preview iframe (`preview`, `preview_background`, unsaved query), and a Connection tab of copy-URL cards. Leaderboard (change `viewer-stats-and-leaderboard`) is a second Browser Source with `period` only: no `preset`, no theme classes, no sample preview. Theme CSS lives in `web/overlay/overlay.css` as chat anatomy. Operator mock for the target IA: `docs/mockups/obs-studio-surfaces.html`.

This change assumes `/overlay/leaderboard` already exists. Apply after (or on the same branch as) that work.

## Goals / Non-Goals

**Goals:**

- One OBS dialog that can grow sources without a new card column.
- One preset/theme for the scene; font and leaderboard layout overridable per surface.
- Leaderboard preview that matches chat preview chrome and never mixes live stats into sample mode.
- Theme work stays CSS-token + body-class based so a new surface or theme has a checklist, not a fork.

**Non-Goals:**

- Implementing `/overlay/alert` or command banners (placeholder row only).
- Independent preset lists per surface.
- Theming `/dock/messages` or splitting `skin` vs chat `layout` ids (`cockpit_popups` stays a chat layout).
- React/SPA, moving overlay settings into SQLite, or restyling the admin cockpit language.

## Decisions

### 1. Source list, not card grid

**Choice:** Connection tab becomes a selectable list (chat, leaderboard, dock; alerts disabled) plus one detail pane (URL, copy, period for leaderboard). Shared “how to add a Browser Source” disclosure. Dock keeps Custom Browser Dock copy.

**Why:** Three full cards already fill the grid; banners would be a fourth clone of the same four steps. The mockup’s list scales.

**Alternatives:** Keep cards and wrap to two rows (rejected: repeated steps, no room). Merge Connection into Appearance only (rejected: dock and first-time OBS help are not appearance).

### 2. Shared preset plus `surfaces` overrides

**Choice:** Keep `overlay.presets[]` as the scene look (`theme`, `style`, chat `font_size_px`, queue). Add optional JSON:

```json
"surfaces": {
  "leaderboard": { "font_size_px": 14, "layout": "panel" }
}
```

Omitted font inherits preset `font_size_px`. Omitted layout is `panel`. Leaderboard URL: `/overlay/leaderboard?preset=<id>&period=session` plus valid `layout` / `font_size_px` / `theme` overrides like chat.

**Why:** Streamers already paste one `preset=` per scene. Separate preset catalogs would diverge (cockpit chat + gold table). Full global font is too coarse for a narrow top-5.

**Alternatives:** Duplicate preset arrays per surface (rejected). Only global font (rejected by exploration). New theme ids per surface (rejected: explosion).

### 3. Layout is a surface field, not a new theme

**Choice:** Persist `panel` | `chips` on the leaderboard surface. Theme ids keep today’s chat meaning (`cockpit_popups` still means chat chips). Default `panel` so popup-themed chat and ranking read as two widgets. Studio can switch layout in preview so the mapping can be tried without a rebuild.

**Why:** The open visual question is form, not palette. A studio control is the experiment.

**Alternatives:** Hard-map popup themes to chips (locks the experiment). Split `skin` + `layout` on every theme id (larger migrate, out of scope).

### 4. Sample preview is built-in rows

**Choice:** `preview=sample` on the leaderboard page renders a fixed fictitious top-5, skips `GET /api/leaderboard` and live `leaderboard` frames, and reuses chat preview backdrops. Admin preview iframe swaps `src` between `/overlay` and `/overlay/leaderboard` and keeps size/backdrop/replay.

**Why:** Same job as chat samples: compare theme and layout on an empty DB.

**Alternatives:** Show live ranks in preview (rejected). Side-by-side iframes (too tight in the dialog).

### 5. Theme CSS: shared classes, per-surface rules

**Choice:** Leaderboard document sets the same `overlay-theme--*` (and related) body classes as chat. Extract shared HUD tokens where overlay.css already defines them; add leaderboard selectors per theme (panel frame vs chips). Do not iframe chat inside the ranking page.

**Why:** One language, two anatomies. Matches the skill rule this change will write: new theme covers all surfaces; new surface covers all themes.

**Alternatives:** Duplicate gold CSS per theme (today’s bug). One HTML page with both widgets (breaks separate OBS rectangles).

### 6. Skill and docs

**Choice:** Update `.agents/skills/obs-overlay-themes/SKILL.md` (and a short pointer in `comm-relay`) in this change. Changelog + README OBS steps.

**Why:** The user asked to freeze the rule; agents otherwise keep treating themes as chat-only.

## Risks / Trade-offs

- [Popup chat + panel ranking feel mismatched] → Mitigation: layout control defaults to panel; chips remain one click in the studio.
- [Theme CSS duplication] → Mitigation: shared tokens first; per-surface selectors, not a second palette.
- [Sibling change not merged] → Mitigation: this change must not ship without `/overlay/leaderboard`.
- [Preset island URL vs source-list URL drift] → Mitigation: one URL builder per surface; both tabs call it.

## Migration Plan

- Additive `surfaces` on presets; no change to existing chat fields.
- Existing installs inherit leaderboard font from `font_size_px` and `layout=panel`.
- Leaderboard visual will change from the unthemed gold CSS to the active theme (expected; that look was never a preset).
- Rollback: revert the change; ignore unknown `surfaces` on older builds.

## Open Questions

None that block specs. Which layout looks better on a real MW5 scene is answered in the studio after apply.
