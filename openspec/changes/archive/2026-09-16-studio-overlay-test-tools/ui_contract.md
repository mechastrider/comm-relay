# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Studio appearance preview | Compare a deterministic theme sample | Existing Studio surface rail and preview | None |
| Studio test mode | Exercise temporal overlay behavior without a stream | Test control in the preview chrome opens an inline panel/drawer | Clipboard uses the existing browser/Wails abstraction |
| OBS test source | Verify the exact Browser Source composition and audio behavior | Copy test-only URL for the selected surface, then add it to OBS | OBS CEF is the authoritative Windows target |

## Menus / Tray / Commands / Shortcuts

No application menu, tray, global shortcut, or native command changes. The preview toolbar uses the shared replay, copy, refresh, and test icons where context is explicit. Run remains a text-labelled primary action; Reset retains a visible label where clearing all test surfaces could be mistaken for replay. The preset toolbar keeps create, rename, duplicate, and delete visible beside the selector as icon-only actions rather than placing them in an overflow menu.

## View / Flow: `Studio overlay test mode`

### Layout and Components

- A compact test control in the existing preview chrome opens an inline test panel without adding another top-level navigation destination.
- The panel contains the selected surface, a compatible scenario selector, scenario-specific sample fields, Run, Reset, receiver/result feedback, a stable test-only OBS URL copy action, and a secondary current-preview snapshot URL copy action.
- Chat offers `message` and `rewarded_message`; leaderboard offers `leaderboard_update`; alerts offer `command_alert`, `rewarded_message`, and `alert_burst`. Scenario fields reuse defaults and remain optional.
- Test mode replaces the selected iframe's static sample connection only while active. Exiting restores the existing sample preview and appearance controls.
- The preview and all runtime overlay roots fill their containing rectangle. Alert chrome fills its rectangle with safe padding; chat messages remain bottom-anchored and content-sized; leaderboard retains panel/chips layout.
- Shared text and icon action buttons use a raised rest/hover surface and a pressed active state. The preset action group may wrap with the preset controls at narrow widths, but its actions remain visible and the URL group moves to its own row before controls overlap or clip.

### Data / Forms / Actions

Run submits the typed scenario and applicable optional overrides; Replay resubmits the last valid scenario. Every Run or Replay globally cancels the prior test run, clears every connected dedicated test surface, then starts the new sequence. Reset globally cancels and clears only. The panel explains that multiple Studio tabs and OBS test sources share one test channel and may interrupt one another.

The optional fields are `display_name` with a 64-character maximum, `message` with a 500-character maximum, `label` with an 80-character maximum, and integer `points` from 1 through 1000. Suggested safe defaults cover each applicable field. Invalid fields show inline errors and do not clear entered values. Arbitrary event JSON, HTML, image URLs, client-controlled durations, and script input are not exposed.

Stable copy actions produce `/overlay/test/chat`, `/overlay/test/leaderboard`, or `/overlay/test/alert` URLs that follow the active preset and can remain configured in OBS. Secondary snapshot copy actions use the same dedicated test paths and include the selected surface's current unpublished draft appearance overrides. They omit preview, sample, and background-only flags; later draft appearance changes require recopying only the snapshot URL. Both URL kinds carry persistent nearby “test only; no live events” guidance, never receive production content, and do not change the active preset or existing default, live, and pinned production URLs.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Disable duplicate Run for the active request, keep Reset available, and announce progress without replacing the control's identity |
| empty | Explain that the test source is isolated and prompt the operator to choose and run a scenario |
| success | Show the scenario name and `delivered_clients`; zero receivers is an informative success, and no delayed steps remain scheduled |
| error/retry | Preserve inputs, show a UI-safe message near the actions, and provide retry |
| offline/degraded | Explain that the local server or preview is unavailable; reconnect the iframe/WebSocket with existing backoff |
| permission denied | Clipboard failure leaves the URL selectable and reports manual-copy guidance |
| interrupted/recovered | Reset or a newer Run/Replay from any tab cancels prior pending steps and clears all test surfaces; reconnecting does not replay old events |

## Accessibility / Keyboard / Focus

- All controls remain reachable in logical DOM order; opening the panel moves focus to its heading or first control, and closing returns focus to the trigger.
- Icon-only copy, refresh, replay, and preset controls have localized `aria-label`, the shared hover/focus tooltip, visible focus rings, and consistent pointer targets.
- Preset deletion is visually destructive, disabled when only one preset exists, and opens the existing confirmation flow; color is not its only identification because its tooltip and accessible name remain available.
- Scenario inputs have persistent labels. Validation, delivery count, and asynchronous results use an appropriate live region without stealing focus.
- Run, Reset, close, and any ambiguous action outside the explicit preset toolbar keep visible localized text. Color or icon shape is never the sole status signal.
- Reduced motion disables non-essential preview transitions but does not skip scenario event ordering.

## Scaling / Theme / Localization / Reduced Motion

The panel follows existing Studio tokens, light/dark behavior, and Russian/English translations. It must fit the existing wide, compact, and short-window Studio layouts with a scrolling body rather than clipped controls. Preview checks cover landscape, square, portrait, and narrow-banner rectangles at browser zoom and Windows display scaling used by current QA. Overlay typography continues to use configured surface font sizes; filling the rectangle does not scale the whole DOM as an image.

## Explicit Non-Goals

No raw event editor, persistent scenario library, live/test event mixing, OBS remote control, new global shortcut, automatic scene insertion, or redesign of non-action navigation labels.

## Not applicable

Native window creation, tray/menu behavior, OS notifications, file dialogs, and mobile/touch-specific navigation are unchanged.
