# Live Events

## Purpose
A quiet, durable current-stream event journal for the operator.

## Requirements

### Requirement: Current-session event feed
Live SHALL offer an Events tab beside Messages. The feed SHALL show successful commands, awards, viewer likes, buffs, live achievement unlocks and level increases with local time including seconds, actor/recipient when known, action label and XP when relevant. It MUST exclude chat bodies, source message identifiers, silent activity grants, cooldown/rejected commands and backfilled achievements. Existing OBS docks MUST remain unchanged.

#### Scenario: Successful social action
- **WHEN** a viewer successfully likes or buffs another viewer after the upgrade
- **THEN** exactly one action row identifies giver, recipient and XP, independently of later command catalog edits
- **AND** separate achievements or level increases caused by the action remain visible

#### Scenario: Legacy events
- **WHEN** the current session contains events from before the upgrade
- **THEN** known awards, commands, buffs and live achievements remain visible
- **AND** missing giver attribution and historical level transitions are not invented; a visible history hint explains the limitation

### Requirement: Bounded history and recovery
GET `/api/live-events` SHALL return `session_id`, an `entries` array and an optional `next_cursor`, newest first by timestamp and stable id. Each entry SHALL contain `id`, `kind`, `viewer_name`, `recipient_name`, `label`, `points`, and `created_at`. Queries SHALL accept category `all`, `reactions`, `commands`, or `progress`, limit 1–100 (default 50), and an opaque session/category-bound cursor. Malformed or mismatched cursors SHALL return 400. Reads MUST NOT create sessions or mutate facts. Rows SHALL survive restart and viewer merge without changing session attribution.

#### Scenario: Page while new events arrive
- **WHEN** new events arrive between history page reads
- **THEN** the next cursor retrieves strictly older rows without duplicates

#### Scenario: New stream
- **WHEN** the open session changes
- **THEN** the next fresh read contains only the new session and the UI resets its history

### Requirement: Read without interruptions
The tab SHALL offer labeled category filters, loading, empty and recoverable error states, and a Load older action. While visible it SHALL refresh within approximately two seconds after a completed request. New rows SHALL not move content while the operator is scrolled away from the newest rows; a New events action SHALL resume the latest view. Hidden or unmounted tabs MUST NOT keep polling. Request failures SHALL retain existing rows and offer retry. Keyboard users SHALL reach filters, scroll region, history and retry controls.

#### Scenario: Read older events
- **WHEN** an operator scrolls away from newest entries and events arrive
- **THEN** the visible entries remain in place until the operator chooses New events

#### Scenario: Reconnect
- **WHEN** an HTTP refresh fails and connectivity returns
- **THEN** the journal recovers from durable history without replaying XP or alerts
