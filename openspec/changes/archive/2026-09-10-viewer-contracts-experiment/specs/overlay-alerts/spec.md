## Purpose

Render viewer-contract announcements through the existing on-stream alert surface with reliable queue semantics.

## ADDED Requirements

### Requirement: Alert overlay renders contract announcements
An alert with `source` `contract` SHALL render a distinct localized contract variant containing the contract title, objective, reward name, and positive points as text nodes. It SHALL use the snapshotted reward layout, sound, duration, built-in or custom graphic, volume, image fit, and image size with the same safe-filename and fallback rules as award alerts. Missing optional media MUST leave a complete readable announcement, and reduced-motion mode MUST use static emphasis.

#### Scenario: Contract with catalog media
- **WHEN** a contract announcement includes a safe custom image and sound snapshot
- **THEN** the alert shows and plays those assets while visibly identifying the task and promised reward

#### Scenario: Plain contract
- **WHEN** a contract has no custom media
- **THEN** a stable contract emblem, title, objective, reward name, and points render without empty reserved space

#### Scenario: Unsafe text
- **WHEN** operator-authored contract text contains HTML-like markup
- **THEN** it is displayed as literal text and no markup executes

### Requirement: Contract announcements have protected queue priority
Pending contract announcements SHALL use the award-protected queue lane: they MUST NOT expire, SHALL run after the currently visible splash, and SHALL be chosen before pending commands in FIFO order relative to awards and other contracts. At capacity, a new contract announcement SHALL displace the oldest pending command when one exists, otherwise the oldest protected item. It MUST NOT preempt the visible splash.

#### Scenario: Contract arrives behind a command
- **WHEN** one command is visible, commands are waiting, and a contract is announced
- **THEN** the visible command finishes and the contract runs before the waiting commands

#### Scenario: Queue contains only protected items
- **WHEN** the pending queue is full of awards and contract announcements and another contract announcement arrives
- **THEN** the oldest pending protected item is displaced and the visible splash is not interrupted
