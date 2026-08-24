---
name: web-constrained-layout
description: Height-capped web panels — dialogs, modals, drawers, sheets, split panes with pinned header/footer. Use when controls are clipped, scrollbars are missing, overflow is hidden, or chrome covers content. Shared across web apps (browser or embedded webview). Not for native OS window chrome.
---

# Constrained layout (web)

Use for any **web** UI whose panel is shorter than its content: `<dialog>`, custom modal, drawer, settings sheet, or a split editor. The same CSS applies in a browser tab and in a desktop **webview**. Native window frames, title bars, and OS resize handles are out of scope — those belong in a desktop skill if they ever need one.

## Failure mode

A shell with `max-height` (or `100vh`) and `overflow: hidden` does **not** give descendants a definite height by itself. With `height: auto`:

- grid `1fr` / flex `flex: 1` sizes to **content**;
- `min-height: auto` (default) stops the item shrinking below that content;
- the shell then clips. No scrollbar appears because no box is actually overflowing — the overflow was never transferred to a child.

Users cannot reach controls. This is a layout bug, not a “small screen” edge case.

## Required pattern

1. **Cap the shell** with `max-height: min(<preferred>, 100dvh - outer chrome)` (prefer `dvh` over `vh`).
2. **Give the shell a shrinkable column**: `display: flex; flex-direction: column` (or a three-row grid) so that when content exceeds `max-height`, the used height becomes the cap and children can shrink.
3. **Pin chrome, scroll the body**:
   - header / tabs / footer: `flex: 0 0 auto` (grid: `auto`);
   - body: `flex: 1 1 auto; min-height: 0; overflow: auto` (grid: `minmax(0, 1fr)`).
4. **Every nested flex/grid child that must shrink** also needs `min-height: 0` (and `min-width: 0` on columns).
5. **Do not** put `overflow: hidden` on a pane unless a **descendant** has a definite height and `overflow: auto` / `scroll`.
6. When scrolling is the only way to reach controls, reserve a gutter and style a **visible** scrollbar. Chromium overlay scrollbars (including many desktop webviews) otherwise hide the affordance.

## Anti-patterns

- `max-height` + `height: auto` + `overflow: hidden` and no flex/grid shrink chain.
- `overflow: hidden` on a tab/page whose child is taller than the pane and has no bounded height + own scroll.
- `align-self: start` / `align-items: start` on a long column inside a capped split view — the column grows with content and is clipped.
- A large hard `min-height` on a nested preview/canvas inside a capped shell — it will not shrink and will push content under the footer.
- Assuming “the dialog is tall enough” after adding fields, hints, or `<details>`. Check ~700px tall and 125–150% OS scale.

## Split panes (form + preview)

Independently scroll the **long form** column. Stretch the preview column and let the canvas use `minmax(0, 1fr)` (or equivalent) so it scales instead of overflowing. On a narrow breakpoint, stack the columns and scroll **one** document — nested independent panes fight each other.

## Checklist

- [ ] Shell height is actually capped (flex/grid shrink, not only `max-height` on an auto-sized box)
- [ ] Header and footer stay fully visible
- [ ] Body (or each overflowing column) has `min-height: 0` and a scrollbar when content exceeds the pane
- [ ] Last control and its hint are reachable; footer does not cover inputs
- [ ] No horizontal clip of primary actions at the target width

## Related

- Overlay and page forms: [ux-form-practices](../../ux/ux-form-practices/SKILL.md)
- Static HTML/CSS apps: [web-static-frontend](../web-static-frontend/SKILL.md)
