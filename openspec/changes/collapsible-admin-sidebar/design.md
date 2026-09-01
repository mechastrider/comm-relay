## Context

See `proposal.md` for motivation. The admin is a single static document with duplicated primary-navigation links: a 196 px left sidebar at 1024 px and wider, and a bottom bar below that breakpoint. Hash routing already updates both sets of links through `data-workspace-nav`. The UI uses vanilla ES modules, shared design tokens, RU/EN catalogs, and a local-storage bootstrap for browser-only preferences.

## Goals / Non-Goals

**Goals:**

- Reclaim desktop workspace width without removing any primary destination.
- Make destinations recognizable in both expanded and compact states with one coherent line-icon set.
- Restore the preference without a visible expanded-to-compact flash where storage access succeeds.
- Preserve keyboard, screen-reader, localization, focus, and reduced-motion behavior.

**Non-Goals:**

- Changing workspace hashes, navigation order, the mobile bottom bar, or header/status-bar layout.
- Saving the preference in `config.json` or synchronizing it across browsers.
- Adding an icon library, build step, draggable width, overlay navigation, or Wails-native menu behavior.

## Decisions

### Use inline decorative SVG icons with existing text labels

Each desktop navigation link will contain a same-size, same-stroke inline SVG plus its existing localized text span. SVGs use `currentColor` and `aria-hidden="true"`; the text remains the accessible name. In compact mode the text is visually hidden without removing it from the accessibility tree, and a localized tooltip/title exposes the same destination name on hover.

This avoids a new dependency, font loading, emoji rendering differences, and extra network requests. A CSS image sprite was considered but would make per-icon current-color and accessibility maintenance less direct.

### Keep collapse state local to the browser shell

Use a namespaced local-storage key whose only valid values represent expanded or collapsed. A small head bootstrap applies the valid saved state before the shell paints; the ES module controller then synchronizes the navigation class, toggle icon, `aria-expanded`, label, and tooltip. Reads and writes are guarded so locked-down browser contexts fall back to expanded navigation.

This is presentation preference rather than product configuration, so persisting it through `config.json` and the settings API would create unnecessary server and migration scope.

### Scope the control and compact layout to the desktop sidebar

Place one toggle after the sidebar destination list, with a minimum 44 px target and a directional line icon. Expanded width remains 196 px; compact width will be token-backed and large enough for the existing minimum target plus padding. The `<1024px` media query continues to hide the sidebar and show the current bottom navigation regardless of saved preference.

Reusing the toggle in the bottom bar was rejected because no left-side width is recoverable there and a sixth bottom action would reduce destination target size.

### Let CSS own visual state and motion

The controller changes one semantic collapsed-state attribute/class; CSS owns width, alignment, label hiding, active marker, tooltip placement, and a short width transition. The existing reduced-motion contract disables the transition. Routing remains independent and continues updating `aria-current` on both navigation copies.

## Risks / Trade-offs

- [Unfamiliar icons can be ambiguous] → Keep expanded labels by default and provide localized tooltips/accessibility names in compact mode.
- [A compact width can crowd focus rings or tooltips] → Preserve the existing minimum target, test edge positioning, and keep tooltips inside the app viewport.
- [Early storage access can fail] → Catch access errors and render the fully functional expanded state.
- [Duplicated side and bottom link markup can drift] → Limit new icons to the desktop sidebar in this change and cover all destination mappings in focused tests or static assertions.

## Migration Plan

No data or API migration is required. Existing installations start expanded because the preference key is absent. Rollback removes the controller/bootstrap and compact styles; an unused local-storage key is harmless.
