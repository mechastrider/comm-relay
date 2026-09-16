## ADDED Requirements

### Requirement: Overlay shows a short frozen cooldown row
When `/overlay` receives `command_outcome` with `status` `cooldown` and `hide_command_cooldown_overlay` is false, the chat overlay SHALL show the matching command line as a frozen cooldown row for a fixed 5 seconds. The overlay MUST NOT display a live countdown, MUST NOT use a Studio slider for that duration, and MUST NOT enqueue an alert splash for the cooldown. If the matching `message` frame has not arrived yet, the overlay SHALL apply the frozen treatment when the line appears. When `hide_command_cooldown_overlay` is true, the overlay MUST NOT render that cooldown row. Successful command lines SHALL continue to follow `hide_command_messages` and the normal message cap/TTL.

#### Scenario: Default cooldown flash
- **WHEN** hide-cooldown-overlay is false and a cooldown outcome arrives for a visible or pending command line
- **THEN** `/overlay` shows a frozen treatment for 5 seconds with no ticking timer

#### Scenario: Overlay cooldown hidden
- **WHEN** hide-cooldown-overlay is true and a cooldown outcome arrives
- **THEN** `/overlay` does not add or keep a cooldown row for that line

#### Scenario: Successful command still respects hide
- **WHEN** `hide_command_messages` is true and a command fires
- **THEN** `/overlay` does not render the successful command line
