## ADDED Requirements

### Requirement: Viewer like uses the award alert path
A successful `like` command SHALL enqueue one award alert for the recipient using the bound award type's presentation (including starter `viewer_like` emblem when no custom image is set). A successful `buff` MUST NOT enqueue an award or command splash for the original operator award and MUST NOT enqueue a second fullscreen alert solely because XP increased. Buff MAY rely on chat-row `command_outcome` `fired` without an alert frame.

#### Scenario: Like alert
- **WHEN** Alice successfully likes Bob with award `viewer_like` and no custom image
- **THEN** `/overlay/alert` receives one award alert with `award_id` `viewer_like` naming Bob

#### Scenario: Buff has no second splash
- **WHEN** Alice successfully buffs Bob's Spotter
- **THEN** no new Spotter award alert is enqueued
- **AND** clients still receive `command_outcome` `fired` for Alice's `!buff` line
