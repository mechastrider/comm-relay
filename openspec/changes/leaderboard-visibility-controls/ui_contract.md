# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Settings leaderboard behavior | Choose the global policy, timing, and automatic triggers | Admin `/` → Settings → leaderboard behavior | Same in browser and Wails WebView |
| OBS message dock toolbar | See and control the current on-air state without leaving OBS | `/dock/messages`, pinned above message list | OBS dock CEF is the primary runtime |
| Audience command editor | Create a viewer request command without a splash | Admin `/` → Audience → Commands | Same in browser and Wails WebView |
| Production leaderboard | Fade according to authoritative visibility state | `/overlay/leaderboard` | Same Browser Source contract on supported OSes |

## Menus / Tray / Commands / Shortcuts

No native menus, tray actions, global shortcuts, or command-line flags are added. Toolbar controls use ordinary keyboard activation. Viewer bang-command parsing remains whole-line and platform-neutral.

## View / Flow: Configure visibility policy

### Layout and Components

One Settings section contains a visible policy selector (Always, Automatic, On request), display duration, cooldown, dirty interval, Show after award, and Show on meaningful rank change. Disabled automatic controls retain values and include nearby explanatory copy. The section states that policy is global and not published with a Studio look.

### Data / Forms / Actions

Numeric fields preserve edit strings, accept only bounded integers, and save through `POST /api/config/update`. Trigger checkboxes are boolean. Successful save updates runtime policy immediately; it does not activate a preset or publish Studio drafts.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Disable the section while config is loading/saving and keep entered values visible |
| empty | Not applicable; server defaults always provide a policy |
| error/retry | Associate field errors with exact controls and focus the first invalid field |
| offline/degraded | Show the existing connection banner and do not claim the policy changed |
| permission denied | Not applicable for intended localhost use |
| interrupted/recovered | Reload reads persisted policy; runtime pin/hide override is intentionally not restored after server restart |

## View / Flow: Operate from the dock

### Layout and Components

A compact fixed toolbar sits above a separately scrollable message body. It contains active-preset selection, a text state indicator, optional countdown, and Show, Pin/Resume, Hide actions. At narrow width it may use icons only when each has a localized accessible name and hover/focus tooltip. The toolbar is operator chrome and never adopts overlay themes.

### Data / Forms / Actions

Initial state comes from `GET /api/leaderboard/visibility`; later state comes from `/ws`. Actions use the dedicated POST routes and remain busy independently. Preset changes reuse `POST /api/overlay/activate`. The countdown is derived from server `visible_until`; its expiration display never substitutes for the authoritative hidden frame.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Show current known state; disable only the action in flight and expose progress accessibly |
| empty | Message-list empty state remains below the toolbar |
| error/retry | Keep prior authoritative state, show a compact localized error, and permit retry |
| offline/degraded | Mark controls unavailable while preserving readable last-known state and messages |
| permission denied | Not applicable |
| interrupted/recovered | Reconnect reads/receives a fresh state snapshot and recomputes countdown without changing message scroll position |

## View / Flow: Configure a leaderboard command

### Layout and Components

The command editor adds a labelled Action choice. Alert reveals all current splash/media fields. Show leaderboard retains trigger, enabled, and cooldown and replaces presentation fields with a short explanation of global display duration. Catalog rows/chips visibly distinguish the action without relying on color alone.

### Data / Forms / Actions

Existing create/update routes send `action`. Switching actions retains draft alert values in memory for the current edit but sends/validates only fields relevant to the selected action. No command is inserted merely by visiting the editor or enabling automatic visibility.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Existing catalog loading and per-action save disabling remain |
| empty | Empty catalog offers the existing create affordance; no `leaderboard` seed appears |
| error/retry | Duplicate trigger/action validation remains inline and preserves inputs |
| offline/degraded | Existing catalog error with retry remains scoped to Audience |
| permission denied | Not applicable |
| interrupted/recovered | Reopening the editor reflects the last successfully stored action |

## Accessibility / Keyboard / Focus

All controls have visible labels; icon-only dock actions use localized tooltips plus accessible names. State/countdown uses a polite live region but MUST NOT announce every one-second tick; announce meaningful transitions instead. Conditional command/settings fields maintain logical focus. Busy and error states are not color-only.

## Scaling / Theme / Localization / Reduced Motion

Dock controls remain usable at 300 CSS pixels and 200% zoom without horizontal scrolling or covering the message footer. EN/RU catalogs remain in parity. Leaderboard show/hide uses a short opacity/translate transition; reduced-motion clients use an immediate or opacity-only transition. Visibility never changes transparent page background or theme geometry.

## Explicit Non-Goals

No OBS scene/source eye control, remote network access, mobile UI, seeded command, per-preset policy, or alert-queue inspector.

## Not applicable

Native windows/dialogs, tray/menu items, OS notifications, global shortcuts, protocol associations, and platform permission prompts are unchanged.
