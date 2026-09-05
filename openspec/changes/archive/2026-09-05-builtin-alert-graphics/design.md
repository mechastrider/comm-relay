## Context

See `proposal.md` for motivation. The alert renderer currently treats the portrait slot as either a safe uploaded image or a viewer avatar/placeholder. Alert frames already expose `source`, command `trigger`, and award `award_id`, so an automatic visual can be selected without persistence or wire-format changes. Catalog editors have an image preview controlled independently from the live alert renderer.

## Goals / Non-Goals

**Goals:**

- Give every command and award a coherent primary graphic without operator setup.
- Keep the result stable across sessions, responsive in all alert layouts, and native to every existing overlay theme.
- Reuse one visual-selection and vector-construction model in the live alert and catalog previews.
- Preserve the current local custom-image upload and cleanup lifecycle as the authoritative override.

**Non-Goals:**

- A selectable built-in gallery, new catalog fields, database migration, or API changes.
- Remote images, animated image formats, viewer-avatar mode, or changes to alert sounds and scheduling.
- New overlay themes or changes to chat and leaderboard surfaces.

## Decisions

1. **Build trusted graphics as code-native SVG/DOM, not user assets.** A shared static module will choose and construct an accessible decorative emblem. This keeps graphics embedded in the binary, theme-colorable through CSS, resolution independent, and absent from backups. Bundled raster files were rejected because they are harder to recolor and scale consistently.
2. **Use stable semantic mappings plus deterministic generic families.** Starter command triggers `gg` and `hi`, and starter award ids `joke`, `advice`, `spotter`, `intel`, `expert`, `meme`, `clutch`, and `mvp`, receive recognizable symbols. Unknown identifiers select a command-signal or award-medal family and short monogram using a stable hash. Keyword guessing and points-based tiers were rejected because renaming or changing points would unexpectedly change identity.
3. **Resolve visual priority as custom file, then built-in emblem.** A valid loaded `image_asset` completely replaces the built-in graphic. Absence, unsafe filenames, or load failure selects the built-in emblem. Viewer identity remains present in alert text; the avatar is not a third automatic primary-graphic branch.
4. **Share visual selection, not page-specific markup.** A module under `web/shared` will expose a normalized emblem model and a DOM builder usable by `web/alert` and admin catalog media controls. Alert and admin styles may compose the shared element differently, but must use the same symbol and monogram selection.
5. **Use theme tokens and source-specific motion.** Command graphics use signal geometry and a short sweep/pulse; award graphics use medal geometry and a restrained reveal. Colors come from existing overlay variables and `--message-accent`. Reduced-motion mode disables decorative movement while retaining static emphasis.
6. **Apply item image scale to every primary graphic.** Existing per-item `image_size_pct` will scale built-in emblems as well as custom files so the editor control never appears ineffective.

## Risks / Trade-offs

- [Dense symbols become noisy at card size] → Keep paths bold, limit detail, and test the smallest supported alert rectangle.
- [Generic monograms can collide] → Combine the monogram with a hash-selected geometry family; visual identity is helpful but not a unique identifier.
- [Admin and alert CSS drift] → Test shared model selection separately and add DOM tests for both custom override and built-in fallback.
- [The new default surprises operators who preferred avatars] → Uploaded files remain unchanged; the visual change is documented in `[Unreleased]`. A selectable avatar mode remains a possible later enhancement, not hidden compatibility state.

## Migration Plan

No persisted data changes. Existing catalog rows with custom `image_asset` keep their current appearance. Rows without one adopt the built-in visual on update. Rolling back restores avatar/placeholder fallback without changing stored data.
