## Purpose

Render automatic greetings through the existing alert surface without displacing protected stream events.

## ADDED Requirements

### Requirement: Alert surface renders greeting frames
An automatic greeting frame SHALL use `type` `alert`, `source` `greeting`, and `greeting_kind` `new_viewer` or `returning_viewer`. It SHALL carry the same resolved text, identity, media, sound, duration, layout, image-fit, image-size, and volume fields as an alert command. When no custom image is present, each greeting kind MUST have a stable distinct built-in emblem. Text and media safety, theme resolution, reduced-motion behavior, and reconnect behavior MUST match existing alert rules.

#### Scenario: Returning viewer banner
- **WHEN** a valid `returning_viewer` greeting frame with banner layout arrives
- **THEN** `/overlay/alert` renders the returning-viewer emblem and resolved greeting using the active alert theme

#### Scenario: Custom greeting media fails
- **WHEN** a greeting's stored custom image cannot be loaded
- **THEN** the matching built-in greeting emblem replaces it without blocking the queue

### Requirement: Greetings use the expiring low-priority queue
Greeting alerts SHALL share the low-priority FIFO lane with command alerts, MUST expire after waiting more than 10 seconds, and MUST remain below awards and contract announcements. At pending capacity, a new greeting MUST NOT displace a protected item; it MAY replace the oldest pending low-priority item under the existing command-lane capacity rule. A greeting MUST NOT preempt the visible splash.

#### Scenario: Award arrives behind greeting
- **WHEN** a greeting is visible, greetings or commands are waiting, and an award arrives
- **THEN** the visible greeting finishes and the award runs before the waiting low-priority alerts

#### Scenario: Greeting expires during burst
- **WHEN** a pending greeting waits longer than 10 seconds behind protected alerts
- **THEN** it is discarded without delaying the next eligible alert
