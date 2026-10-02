# Desktop UI Contract
## Windows / Views / Entry Points
All existing admin routes, catalog editors, progression, settings, live and Studio chrome, dialogs. No route changes; native/browser share CSS.
## Menus / Tray / Commands / Shortcuts
No changes.
## View / Flow: consistent operator controls
### Layout and Components
Actions 38px minimum / 12px; icon actions square. 44px at the existing narrow breakpoint. Primary green, secondary neutral, destructive red. FormSection uses semantic fieldset/legend with 1px neutral border, shared spacing/radius. Field owns label/hint/error layout. Catalog list/editor headers keep aligned geometry; sections share typography with other settings panels.
### Data / Forms / Actions
No field removals, validation or payload changes. Group commands by identity, action and restrictions with banner content/media/appearance conditional on alert action. Group awards by identity, text, media and appearance; greetings retain behavior/text/media/appearance.
### States and Recovery
Loading/busy: preserve disabled and status feedback. Empty: existing empty states. Error/retry/offline: existing messages/actions. Interrupted/recovered: dirty drafts and navigation guards unchanged. Permission denied: existing upload/API errors; no new permission.
## Accessibility / Keyboard / Focus
Keep labels, aria attributes, tooltips, keyboard actions and focus restoration. Legend names field groups. No nested forms or new focus traps.
## Scaling / Theme / Localization / Reduced Motion
RU/EN section labels, dark theme, wide 1440x900, short 1100x700, narrow 390x844 plus wrapping probes. Preserve reduced motion. Cards/chips/nav/message-row controls are explicit geometry exceptions.
## Explicit Non-Goals
Rearranging workflows, editing OBS theme output, new native integration.
## Not applicable
Tray, native menus and global shortcuts unchanged.

## Tooltip readability follow-up
Shared action hints size to their content within the viewport cap. Ordinary words remain whole; only unbroken tokens wider than the hint can split. Live and Audience toolbar hints remain within viewport bounds, including right-edge desktop and narrow actions. Hover and keyboard focus continue to expose the same localized hint.

Studio toolbar hints may cross column borders without being clipped. Full text must remain visible on hover and keyboard focus; internal canvas clipping and inspector scrolling remain intact.
