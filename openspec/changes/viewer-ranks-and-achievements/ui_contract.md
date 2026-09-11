# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Audience > Progression | Configure achievements, titles, and their alerts | Existing Audience workspace; new third top-level tab between Journal and Commands | Identical in the standalone browser admin and Wails webview |
| Audience > Viewers | See a viewer's current title and milestone progress | Existing viewer directory and detail card | None |
| Studio > Leaderboard | Decide whether ranking rows show titles | Existing Leaderboard surface inspector | None |
| Studio > Alerts | See a representative progression splash | Existing sample alert preview and Replay control | None |
| `/overlay/leaderboard` | Show optional titles on stream | Existing OBS Browser Source | None across supported Windows/browser runtimes |
| `/overlay/alert` | Celebrate live progression | Existing OBS Browser Source; no new source URL | None across supported Windows/browser runtimes |

No new desktop window, tray item, top-level workspace, URL, or OBS dock is introduced.

## Menus / Tray / Commands / Shortcuts

The change adds no global command, tray action, or application shortcut. Existing tablist keyboard behavior, browser Back/Forward routing, modal Escape handling, and Studio Replay remain authoritative. Catalog row actions use labeled buttons and overflow only where the existing catalog pattern already does.

## View / Flow: Audience Progression

### Layout and Components

Audience tab order is Viewers, Journal, Progression, Commands, Greetings, Awards. The single-line tablist uses horizontal overflow at narrow widths; selecting by pointer, keyboard, route restoration, or focus scrolls the tab fully into view. It does not wrap into an ambiguous second row.

Progression has a local segmented/tab control for Achievements, Levels, and Unlock alerts. Achievements and Levels reuse the established two-pane catalog layout used by Commands, Greetings, and Awards:

- left: heading, primary Add action, search, filters where applicable, count, and selectable rows;
- right: sticky identity/header context, grouped form fields, inline errors, test action, destructive action, and pinned Save footer;
- compact height/width: one scrollable editor body with header and footer controls kept reachable; the list and editor may stack, but content must not be clipped.

The existing CommRelay typography, semantic colors, field components, status chips, focus rings, surface borders, spacing, and dark/light behavior are reused. No separate gamification visual language or dependency is added.

### Data / Forms / Actions

Achievement catalog rows show name, readable condition summary, and enabled/secret/repeatable chips. Search matches name, description, metric label, and saved subject label. Filters are All, Enabled, Disabled, Secret, and Repeatable.

The achievement editor contains:

1. Identity: Name (required, 1–64 code points) and Description (0–240).
2. Condition: Metric select; award or command select only for matching metrics; integer Target (1–1,000,000,000); and a generated read-only sentence such as “Unlock after 10 Spotter awards.”
3. Behavior: Once/Repeatable choice, Enabled, Secret, and Announce on stream switches.
4. Actions: Test unlock, Delete, and Save.

Create starts an unsaved definition with Enabled on, Secret off, Announce on, and Once selected. Selecting another row with dirty fields follows the current discard/keep-editing guard. Saving a metric, subject, target, or repeat-mode change opens a confirmation explaining that a new rule revision will be created, existing unlocks remain, and reconciliation is silent. Presentation/delivery-only edits save without that warning. Delete confirms that future progress stops while recorded viewer history remains.

The Levels list is always sorted by `min_xp`; it has no drag handles. Each row shows title, threshold, and announce state. The editor has Title (1–64), Minimum all-time XP (0–1,000,000,000), Announce on stream, Test level-up, Delete, and Save. For the baseline row, threshold is read-only at zero and Delete is absent or disabled with an explanation. Duplicate thresholds surface beside the XP field.

Unlock alerts is a single form, not a catalog. It contains Enable achievement alerts, Enable level-up alerts, Layout (`card`, `banner`, `fullscreen`), Built-in sound or Silence, Volume (0–100), and Duration using the established alert bounds. Both enable switches start off until the operator opts in. Test achievement and Test level-up send the complete dirty draft to overlay-debug without saving. Uploaded or per-achievement media controls are absent.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Skeleton/list placeholder keeps layout stable; editor actions are disabled only while their own request runs |
| initial reconciliation | Non-blocking status explains that historical progress is being calculated; catalogs stay readable/editable and no celebration is implied |
| empty achievements | Explain computed milestones and offer Add achievement; a deliberately empty user-owned catalog is not reseeded |
| missing subject | Keep the definition visible with its saved subject label and “Deleted award/command” warning; require a valid selection before a rule-changing save |
| validation error | Preserve every draft value, focus or link to the first invalid field, and render field plus summary errors where the existing form pattern does |
| save/delete error | Keep selection and draft; report a local retryable error without closing the editor |
| preview without receiver | Report zero connected test overlays with the existing guidance to open Studio Alerts preview; do not imply production delivery |
| offline/degraded | Show request failure and Retry; do not substitute stale progress as a successful save |
| interrupted reconciliation | Show paused/retrying status; restart resumes idempotently and the UI does not offer a destructive reset |

## View / Flow: Viewer Directory and Detail

### Layout and Components

Each viewer directory row adds the current title as a compact badge or secondary text adjacent to the display name. No column, sort selector, or extra horizontal table pressure is added.

The detail card adds a Progression summary near the existing identity and aggregate-stat content:

- current title and all-time XP;
- a labeled native/ARIA progressbar toward the next title, e.g. `Veteran — 720 / 1500 XP`;
- unlocked achievements ordered newest first, grouping repeated occurrences as a count while keeping unlock details available;
- visible in-progress achievements with current/target values;
- `Do not show progression alerts for this viewer` near existing `leaderboard_hidden` and `greetings_disabled` controls.

Locked secret achievements leave no placeholder, count, name, description, or progress clue. At the maximum level the progress component says the maximum title is reached and has no fictitious next value.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| progression loading | Existing viewer identity and stats remain visible; only the progression region indicates loading |
| no achievements | Show the current title and a quiet “No achievements yet” state |
| live unlock | Refresh only the affected visible row/card from the live frame; preserve scroll, active tab, and unsaved viewer edits |
| viewer merged | Existing merge recovery closes or retargets the source card; no unlock toast or overlay preview is generated |
| update failure | Restore the opt-out switch to server state or mark it unsaved and expose Retry consistently with existing viewer fields |

## View / Flow: Studio and OBS Surfaces

### Layout and Components

Studio > Leaderboard adds `Show viewer titles` to leaderboard-only fields, default off. The draft sample uses fictitious localized titles immediately, and Publish follows the existing preset dirty-state flow. Title text is secondary to viewer name and XP and is the first optional row element hidden by constrained fitting.

The existing Alerts sample rotates or selects a representative progression card in addition to existing command, award, contract, and greeting samples. Replay restarts it. Progression alert presentation itself is configured under Audience because it is progression behavior; Studio continues to own surface-wide alert theme, sizing, opacity, and preview background.

Production `/overlay/alert` renders a combined level/achievement card and queues it after its causal source alert. It reserves no blank media region when using the built-in emblem or when portrait data is absent.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| sample preview | Never reads or mutates live viewer progress and never emits production frames |
| unknown level in old frame | Omit the optional title while preserving the row or alert identity |
| WebSocket reconnect | Resume from future frames; do not replay missed progression splashes |
| reduced motion | Replace entrance/celebration motion with static emphasis without shortening readable duration |

## Accessibility / Keyboard / Focus

- All tablists expose tab/tabpanel relationships, selected state, and keyboard navigation consistent with the existing admin.
- Catalog rows are real controls with visible focus and a non-color selected cue; status chips are supplemental, not the only label.
- Every input has a persistent label and described error/help. Conditional subject fields are inserted in predictable DOM order and receive focus only after an explicit invalid submit, not merely because the metric changed.
- Confirmation dialogs trap focus, close on Escape where safe, restore focus to their trigger, and name the affected achievement.
- Switches expose current state and disabled explanations. Test/Save loading state is announced without changing the accessible name.
- Progress bars expose current, maximum, and human-readable next-title text. Achievement lists use semantic headings/lists.
- Alerts use text nodes, decorative icons are hidden from assistive technology, and meaning does not depend on color or animation.

## Scaling / Theme / Localization / Reduced Motion

All new visible copy has Russian and English catalog entries. Seed display text uses the persisted initialization locale and is not retransmitted as UI chrome for later translation. Dates use the existing locale-aware 24-hour formatting.

The UI must remain usable at browser zoom 80–200%, Wails/Windows display scaling, compact desktop width, and height-capped dialogs. Long Russian/English names wrap or ellipsize only where the full value remains available by accessible name/title. Touch targets and focus indicators match existing admin tokens. OBS pages stay transparent outside preview. `prefers-reduced-motion` disables decorative progression motion.

## Explicit Non-Goals

- No chat-row title/achievement badge.
- No new ranking sort/filter or dedicated progression leaderboard.
- No permanent Live widget or messages-dock control.
- No visual rule builder, arbitrary expressions, custom threshold series, drag ordering, or bulk editor.
- No per-achievement media upload, public viewer profile page, or viewer-facing interaction control.

## Not applicable

Native menus/tray, OS permissions, file pickers, installer dialogs, global shortcuts, mobile layouts, and connector OAuth UI do not change.
