# Desktop UI Contract
## Windows / Views / Entry Points
Live → Events in existing admin. Same browser and Wails behavior; existing Tabs component.
## Menus / Tray / Commands / Shortcuts
No native changes.
## View / Flow: Events
### Layout and Components
Pinned filter/summary; independently scrollable newest-first list; Load older at bottom. Reuse Button, field hints and existing theme variables.
### Data / Forms / Actions
Category select: all, reactions/awards, commands, progression. Exact local HH:mm:ss timestamps. New events button while reading history; explicit pause/resume supported.
### States and Recovery
Loading text on initial fetch; localized empty state; existing content retained on failure with Retry; sequential polling recovers automatically. Session change resets list/cursor. Permission denial uses request-error UI.
## Accessibility / Keyboard / Focus
Labeled select and tab panel, focusable scroll region, semantic list, time elements, status for new rows. No focus stealing or live announcements for every row.
## Scaling / Theme / Localization / Reduced Motion
Russian and English catalogs. Wrap long names and toolbar at narrow widths, min-height:0 scroll body. No motion.
## Explicit Non-Goals
No dock or overlay changes; no tray controls, shortcuts, sounds or toast notifications.
