## MODIFIED Requirements

### Requirement: Overlay shows a short frozen cooldown row
When `/overlay` receives `command_outcome` with `status` `cooldown` or `rejected` and `hide_command_cooldown_overlay` is false, the chat overlay SHALL show the matching command line as a frozen row for a fixed 5 seconds. The overlay MUST NOT display a live countdown, MUST NOT use a Studio slider for that duration, and MUST NOT enqueue an alert splash for the cooldown or rejected outcome. If the matching `message` frame has not arrived yet, the overlay SHALL apply the frozen treatment when the line appears. When `hide_command_cooldown_overlay` is true, the overlay MUST NOT render that frozen row. Successful command lines SHALL continue to follow `hide_command_messages` and the normal message cap/TTL. Rejected rows MAY show the short `reason_label`.

#### Scenario: Default cooldown flash
- **WHEN** hide-cooldown-overlay is false and a cooldown outcome arrives for a visible or pending command line
- **THEN** `/overlay` shows a frozen treatment for 5 seconds with no ticking timer

#### Scenario: Overlay cooldown hidden
- **WHEN** hide-cooldown-overlay is true and a cooldown outcome arrives
- **THEN** `/overlay` does not add or keep a cooldown row for that line

#### Scenario: Successful command still respects hide
- **WHEN** `hide_command_messages` is true and a command fires
- **THEN** `/overlay` does not render the successful command line

#### Scenario: Rejected nick freeze
- **WHEN** `/overlay` receives `command_outcome` status `rejected` reason `ambiguous` and the hide flag is false
- **THEN** `/overlay` shows a frozen row for 5 seconds including the clarify label
- **AND** no alert splash is enqueued
