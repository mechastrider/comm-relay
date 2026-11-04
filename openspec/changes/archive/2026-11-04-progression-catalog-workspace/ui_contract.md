# Desktop UI Contract

## Windows / Views / Entry Points

Audience → Progression in browser and Wails, with identical semantics.

## Menus / Tray / Commands / Shortcuts

No native changes. Existing keyboard list navigation and native dialog Escape remain available.

## View / Flow: Progression

### Layout and Components

A top toolbar contains Levels/Achievements choices, Alerts and a separate maintenance disclosure for reconciliation. Wide windows show one list and one editor. Narrow windows show the list first and replace it with the editor after selection; Back returns to the list. Use shared catalog panels, Button and Dialog. Editor headers contain save, test and delete. Group fields by identity, condition/reward and quotas/options.

### Data / Forms / Actions

Keep all existing fields and payloads. Show XP/condition and enabled-state summaries in lists. Alerts dialog contains shared settings with pinned Save/Close and a scrolling form. Display a global-disabled hint next to the editor's announcement setting. Reconciliation has its own explanation and feedback.

### States and Recovery

Loading disables actions; empty catalogs offer Create. No matches retains filters and an empty hint. API errors show local feedback and retain draft; load errors offer retry. Confirm dirty record/catalog/back/navigation transitions and dirty settings dismissal. Cancelling keeps view, values and focus. Successful saves update the record and clear only its draft. Busy state blocks duplicate actions and dismissal.

## Accessibility / Keyboard / Focus

Label the catalog switch and selected state; support keyboard choices. Preserve list arrow/Home/End and Enter/Space navigation. On compact selection focus the editor; on Back focus the selected row. Native modal restores focus on close; discard confirmation restores focus when cancelled. Errors remain associated with fields. Avoid hidden focus targets and nested forms.

## Scaling / Theme / Localization / Reduced Motion

Use existing tokens; English and Russian copy. Test 1440×900, 1100×700, 1023/1024 catalog breakpoint and 860px shell breakpoint, 520×600 and 390×844. Long labels wrap, controls remain within viewport, and dialog body scrolls independently of its footer. No new animation.

## Explicit Non-Goals

No new OS window, overlay or design system.
