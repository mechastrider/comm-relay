# Desktop UI Contract
## Windows / Views / Entry Points
Live recap/current and historical detail, OBS recap, and PNG export: show level badge beside ranking names. All-time summary follows the same display.
## Menus / Tray / Commands / Shortcuts
Unchanged.
## View / Flow: Recap rankings
### Layout and Components
Reuse LevelBadge/createLevelBadge and shared SVG CSS. Keep title, XP and message text; badge cannot shrink away or overlap names.
### Data / Forms / Actions
Optional emblem and title; show badge only when both exist. No new controls.
### States and Recovery
Loading, errors, offline, empty and interrupted states retain existing behavior. Old snapshots and viewers without a level show no badge.
## Accessibility / Keyboard / Focus
Shared role=img, localized accessible label and native title tooltip. Decorative badge adds no focus stop.
## Scaling / Theme / Localization / Reduced Motion
Relative badge sizing and existing theme colors; no animation or new strings.
## Explicit Non-Goals
No badges in achievements and no changes to dock/chat.
