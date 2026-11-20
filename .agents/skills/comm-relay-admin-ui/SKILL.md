---
name: comm-relay-admin-ui
description: Build or change CommRelay React admin pages, settings tabs, forms and dialogs using the existing design system; review visual consistency against sibling surfaces. Use for experimental features too. Not for OBS overlay themes or native window chrome.
---

# CommRelay admin UI

Project-owned skill, intentionally outside the managed packages in `skills.lock.yaml`.
Keep concrete component, class and path guidance here; do not put it into vendored
`ui-styling`, `design-system` or `ux-form-practices` skills.

## Start with the existing surface

1. Read the [admin design-system contract](../../../openspec/specs/admin-design-system/spec.md).
2. Pick the closest existing page in the **same surface** and inspect its JSX,
   CSS and rendered appearance. Name that reference in the implementation plan.
   For settings, start with `web/admin/src/features/settings/Settings.tsx` and
   `Fields.tsx`; for catalogs, inspect the existing catalog workspace. An OBS
   overlay or a generic external component gallery is not an admin reference.
3. Map each needed element to the shared building blocks below before adding CSS.
   Experimental status is not an exemption from the design system.
4. Extend the existing React/plain-CSS stack. Do not install Tailwind, shadcn,
   a new component kit or a separate palette merely because a generic skill
   recommends it. A design-system replacement is separate, explicitly scoped work.

## Implementation map

All paths below are relative to the repository root.

| Need | Existing implementation / contract |
| --- | --- |
| Page and settings shell | `web/admin/src/features/settings/Settings.tsx`; `web/admin/styles/settings.css`. Reuse workspace headers, settings navigation, content and form structure. |
| Ordinary actions | `web/admin/src/components/Button.tsx`: `Button`, `IconButton`; shared geometry, `primary` / `secondary` / `danger` for emphasis. |
| Inner tabs | `web/admin/src/components/Tabs.tsx`: selected state, arrow/Home/End navigation, roving focus. Provide matching panel `id`, `role="tabpanel"`, `aria-labelledby`. Do not turn ordinary raised buttons into tabs. |
| Top-level settings group | `.panel` with `.panel__header` + heading and `.form` body, as in Settings fields. |
| Field / nested semantic group | `web/admin/src/components/Field.tsx`: `Field`, `FormSection`. `Field` supplies layout, not an input, type or accessibility associations. Use `FormSection` where a fieldset/legend is appropriate; do not substitute nested fieldsets for every top-level settings panel. |
| Checkbox | `<label className="checkbox"><input type="checkbox" /><span>…</span></label>` with controlled state and a localized label. |
| Field hints / errors | `.field-hint` / `.field-error`; error associations and `role="alert"`. Keep errors distinct from muted hints and timestamps. |
| Dialogs | `web/admin/src/components/Dialog.tsx`; preserve focus return, dismissal and pending-action behavior. For capped bodies, also use `web-constrained-layout`. |
| Visual tokens | `web/admin/styles/primitives.css`, `tokens.css`, `components.css`, `forms.css`. Read actual definitions and selectors before using a token or class. |
| CSS registration | `web/admin/src/styles.css`; import focused feature styles from `web/admin/styles/`. |
| Text | `web/admin/src/app/locale.tsx` and `web/shared/locales/{en,ru}.js`; labels, hints, errors, tooltips and empty states follow the selected locale. |

Inspect a component's props before using it. This map is a starting point, not
permission to copy a whole page and fork its reusable controls.

## Form and CSS traps to avoid

- **Set an explicit `type` on every input.** Current shared field CSS targets
  `input[type="text"]`, `input[type="url"]`, etc. An omitted type behaves as
  text in HTML but does not match those attribute selectors: browser-default
  gray fields can survive typecheck, lint and functional tests. Choose the
  semantic type and check that the shared CSS covers it; extend shared styling
  deliberately if it does not.
- Set button types explicitly inside forms. Navigation/help/remove actions must
  not accidentally submit. Preserve the feature's save and dirty-state flow.
- Reuse declared classes. `form__error` and `form__checkbox` were previously
  used without definitions; the working classes are `field-error` and `checkbox`.
  Search definitions, not just other markup that may repeat the same mistake.
- Feature CSS owns layout, not a second set of ordinary input/button/label rules.
  Reuse declared semantic/component colors and the shared spacing/radius scales.
  Do not conceal missing tokens behind `var(--invented-name, #hardcoded-color)`.
- Avoid broad rules such as `.feature input { width: 100%; }`: they also stretch
  checkboxes and radios. Prefer the shared field selectors.
- Keep top-level and nested groups visually distinct. Match the reference page's
  heading scale, control height, panel treatment and spacing; layout can differ
  when the task requires it. Do not enforce identical page composition.
- Save feedback must remain visible near the action and invalid fields must have
  linked messages and focus/scroll recovery. For sticky actions, verify that the
  final field and its error remain reachable and unobscured.

## Verify appearance as well as behavior

Typecheck, lint, build and passing request tests do **not** prove visual consistency.
Use the project completion checks in `AGENTS.md`, then perform this focused review:

1. Open both the changed surface and the selected reference in the same theme,
   locale and viewport. Inspect screenshots for typography, panel hierarchy,
   input background/borders, spacing, button geometry and selected-tab treatment.
   Do not approve a page solely from JSX or a screenshot of the new page alone.
2. Exercise affected controls: change a value, save, submit invalid data, move
   tabs with the keyboard, and open/close affected dialogs. Verify focus and
   error visibility. Include loading, empty, populated and disabled/error states
   that the change can produce; use fixture data instead of paid provider calls.
3. Check the normal desktop rectangle (1100×760 is a useful baseline) and a narrow
   width (390px), plus any smaller supported embedded viewport affected by the
   task. Use realistic long labels and a populated form; test scrolling to the
   last control and save action. Inspect for horizontal overflow and overlap.
   Check both supported light/dark themes when styling changes can affect them.
4. For regressions, assert the actual consequence in a browser: computed color,
   height/background matching a shared control, selected-tab state, visible
   focus, or element bounds. A class-name assertion alone cannot detect missing
   CSS, an unloaded stylesheet or a selector that does not match.
5. Report the reference used, checks run and any unverified browser/native scope.
   Keep local screenshots under ignored `var/` or test output, not committed docs.

If a reusable primitive is missing, extend the shared component/style at the
smallest appropriate scope and check existing consumers. A novel page may need
new composition; it still uses the established primitives. Do not create a
parallel design system or broaden a local fix into a visual redesign.

## Related guidance

- [Form UX](../ux-form-practices/SKILL.md)
- [Constrained web layout](../web-constrained-layout/SKILL.md)
- [CommRelay domain and desktop shell](../comm-relay/SKILL.md)

This skill governs implementation practice. Product-visible behavior remains in
OpenSpec; internal skill/documentation changes alone do not need a changelog entry.
