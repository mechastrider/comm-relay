# Desktop UI Contract

## Windows / Views / Entry Points
| Surface | User goal | Entry/navigation | Platform differences |
|---|---|---|---|
| Live | Messages, leaderboard, statistics, contracts, recaps, active preset | Existing live hashes/tabs | PNG uses native bridge in Wails |
| Audience | Viewers, merges, portraits, rewards/history, commands, greetings, progression, archive | Existing audience hashes/tabs | None |
| Studio | Preview/edit/publish all four surfaces, presets, media, OBS setup/testing | Existing studio hash | Native clipboard availability |
| Settings | Platforms, proxy, data, application, diagnostics | Existing section hashes and OAuth return | Existing shell behavior |
| About | Version/support information | Existing and legacy about links | Existing platform metadata |

## Menus / Tray / Commands / Shortcuts
Preserve shell behavior. In-app confirmations replace no native APIs. No new shortcuts.

## View / Flow: all workspaces
### Layout and Components
Preserve current CSS tokens, icons, responsive breakpoints and component appearance. Every existing control remains reachable. One React tree owns admin rendering.
### Data / Forms / Actions
Keep Settings Save/Reset per section separate from Studio Publish and immediate Live activation. Preserve drafts across unrelated config refresh. Confirm destructive actions and dirty navigation in app dialogs. Preserve catalogs, upload validation, aliases, templates, test audience, contracts, recap export, and local preferences.
### States and Recovery
| State | Required behavior |
|---|---|
| loading/busy | Disable duplicate mutations; retain existing data during refresh |
| empty | Localized contextual empty state |
| error/retry | Region-local error and retry without losing edits |
| offline/degraded | Connection indicator, bounded backoff and reconciliation |
| permission denied | Explain clipboard/file failure in context |
| interrupted/recovered | Ignore stale responses; reconnect without duplicate effects |

## Accessibility / Keyboard / Focus
Preserve names, roles, focus indicators, tab navigation, focus trapping/return, Escape and tooltips. Short dialogs scroll while actions remain reachable.

## Scaling / Theme / Localization / Reduced Motion
RU/EN, 24-hour clock, current local preferences, reduced motion, 1920x1080 / 1280x800 / 1024x768 / 800x600 / 390x844.

## Explicit Non-Goals
No redesign or OBS/dock migration.
