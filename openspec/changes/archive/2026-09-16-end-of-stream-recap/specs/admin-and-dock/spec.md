## Purpose

Add accessible operator workflows for current recap control, compact session history, Studio preview, and OBS setup.

## ADDED Requirements

### Requirement: Live offers explicit recap controls
The Live workspace SHALL provide a keyboard-reachable Recap action separate from New stream. Activating it SHALL open a confirmation dialog that identifies the current session, explains that capture is permanent for that session, and states that showing recap will not reset counters. Confirm SHALL send the displayed `session_id`; cancel MUST make no request. While a recap is visible, Live SHALL expose Hide and Show again states without changing alert or leaderboard controls. Conflict and server failures MUST leave the current session and prior visibility unchanged and produce an accessible error.

#### Scenario: Confirm current recap
- **WHEN** the operator reviews the current summary and confirms Show recap
- **THEN** Live reports the recap visible and session counters remain available

#### Scenario: Cancel confirmation
- **WHEN** the operator dismisses the recap dialog
- **THEN** no snapshot or visibility mutation occurs and focus returns to the Recap action

#### Scenario: Stale session conflict
- **WHEN** confirmation fails because another window started a new session
- **THEN** the dialog explains that the session changed and refreshes current data without showing stale results

### Requirement: Live exposes compact session history
The recap dialog SHALL include Current stream and History views. History SHALL list bounded newest-first session summaries, clearly distinguish current and captured sessions, load further pages explicitly, and open a session detail with aggregates, bounded ranking, eligible achievements, and recap-captured time when present. Sessions without a recap MUST remain reviewable. Historical details MUST NOT offer an on-air replay action in this change. Header/footer controls SHALL remain visible and the dialog body MUST scroll at constrained desktop heights.

#### Scenario: Review a prior session
- **WHEN** the operator opens a prior session with no recap snapshot
- **THEN** available aggregate history renders and no Show on stream control appears

#### Scenario: Short desktop window
- **WHEN** the session detail exceeds a roughly 700-pixel-high webview
- **THEN** the body scrolls while close/back controls remain reachable

### Requirement: Studio previews and configures the recap surface
Studio SHALL list Recap as a fourth themed surface, render its isolated sample preview, and expose the recap backdrop opacity in the existing draft/publish workflow. Switching surfaces MUST preserve other draft values. Publishing SHALL update recap appearance without capturing or showing a production recap.

#### Scenario: Edit recap backdrop
- **WHEN** the operator changes recap opacity in Studio and publishes
- **THEN** `/overlay/recap` applies it through overlay settings while remaining hidden unless explicitly shown

### Requirement: OBS setup exposes the dedicated recap URL
Every existing OBS setup surface that lists production Browser Sources SHALL include `/overlay/recap`, a follow-active URL, a pinned-preset URL, copy/open actions, and guidance to size it to the full canvas and place it above ordinary stream sources. Existing chat, leaderboard, and alert URLs MUST remain unchanged.

#### Scenario: Copy pinned recap URL
- **WHEN** the operator chooses the pinned URL for preset `main`
- **THEN** the copied recap URL contains `/overlay/recap?preset=main`

### Requirement: Dock remains unchanged
`/dock/messages` SHALL remain a messages-only operator dock and MUST NOT gain recap history, recap controls, or recap rendering.

#### Scenario: Recap shown on stream
- **WHEN** a recap becomes visible
- **THEN** the message dock remains unchanged
