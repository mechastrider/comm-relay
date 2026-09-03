## Purpose

Let the chat surface acknowledge a rewarded source message and resolve its own panel opacity without changing generic chat rendering.

## ADDED Requirements

### Requirement: Visible rewarded messages receive transient feedback

When the chat overlay receives an award alert with `message_platform` and `message_id`, it SHALL find a visible row only by that exact pair. A matching row SHALL show the award name or positive points and an emphasized border for 2.5 seconds. The overlay MUST NOT recreate an expired or removed row, and MUST NOT guess a match from viewer name or message text. Repeated awards MAY restart the feedback on the same visible row. Reduced-motion mode SHALL use static emphasis without pulsing movement.

#### Scenario: Rewarded row remains visible
- **WHEN** message `twitch`/`abc` is visible and its award alert arrives
- **THEN** only that row receives the transient award treatment and points label

#### Scenario: Rewarded row already expired
- **WHEN** no visible row matches the award message reference
- **THEN** the chat queue remains unchanged and no historical message is inserted

#### Scenario: No stable message id
- **WHEN** an award alert omits `message_id`
- **THEN** the overlay does not guess a row to highlight

### Requirement: Chat chrome uses its surface opacity

The chat overlay SHALL resolve panel opacity from `surfaces.chat.panel_opacity`, falling back to the preset shared `style.panel_opacity`. It MUST apply that value to panel/card background chrome and MUST NOT reduce page transparency, text opacity, emotes, or image previews.

#### Scenario: Independent chat opacity
- **WHEN** a preset stores chat opacity `0.20` and leaderboard opacity `0.70`
- **THEN** chat chrome uses `0.20` without changing leaderboard rendering
