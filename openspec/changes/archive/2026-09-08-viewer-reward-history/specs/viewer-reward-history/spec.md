## Purpose

Provide a bounded, read-only journal that lets the operator identify which manual awards each canonical viewer received and inspect recent awards across the channel.

## ADDED Requirements

### Requirement: Reward history exposes durable award entries
`GET /api/reward-history` SHALL return only successful operator-award events, newest first. Each entry MUST include `id`, `kind` equal to `award`, `viewer_id`, the canonical viewer's current `viewer_display_name`, `reward_id`, the award-name snapshot as `reward_name`, `points`, and RFC3339 `created_at`. The endpoint MUST NOT return command or activity events.

#### Scenario: Global history
- **WHEN** the operator requests `GET /api/reward-history` after Alice received Advice and Bob later received MVP
- **THEN** the response lists Bob's MVP entry before Alice's Advice entry
- **AND** both entries identify the current canonical viewers and the names captured when the awards were granted

#### Scenario: Non-award events exist
- **WHEN** command and activity events exist beside award events
- **THEN** the reward-history response contains only entries whose `kind` is `award`

### Requirement: Reward history is bounded and cursor-paginated
The endpoint SHALL accept optional `viewer_id`, `limit`, and opaque `cursor` query parameters. `limit` SHALL default to 50 and MUST be between 1 and 100. Results MUST use a stable newest-first ordering by timestamp and event id. When more matching entries exist, the response SHALL include a non-empty `next_cursor`; passing that cursor SHALL return the next page without repeating an entry from the previous page. Invalid limits or cursors MUST return HTTP 400 with a UI-safe JSON error.

#### Scenario: Load the next global page
- **WHEN** more award entries exist than the requested limit
- **THEN** the first response contains at most that limit and a `next_cursor`
- **AND** requesting the cursor returns older entries without duplicating any entry from the first page

#### Scenario: Equal timestamps
- **WHEN** two award entries have the same `created_at`
- **THEN** their event ids provide deterministic ordering across page boundaries

#### Scenario: Invalid cursor
- **WHEN** the client sends a malformed cursor
- **THEN** the endpoint returns HTTP 400 with a short JSON error and no history entries

### Requirement: Reward history can be scoped to one canonical viewer
When `viewer_id` is supplied, the endpoint SHALL return only entries assigned to that canonical viewer. A missing or hidden merge-source viewer MUST return HTTP 404. After viewers are merged, historical entries rewritten to the surviving viewer MUST appear in the survivor's history and MUST NOT appear under the hidden source id.

#### Scenario: Viewer-specific history
- **WHEN** Alice and Bob both have awards and the client requests Alice's `viewer_id`
- **THEN** every returned entry belongs to Alice

#### Scenario: History after merge
- **WHEN** a viewer with award history is merged into another viewer
- **THEN** those entries appear when history is requested for the surviving viewer
- **AND** requesting the hidden source viewer returns HTTP 404

### Requirement: Historical award meaning survives catalog edits
Every new award entry SHALL use the award display name captured at grant time. Renaming or deleting an award type MUST NOT change `reward_name` for an existing entry. Upgraded databases SHALL backfill existing award events from the current award catalog where possible and otherwise SHALL use the stored award id as the non-empty historical name.

#### Scenario: Award renamed after grant
- **WHEN** the operator grants `Advice`, later renames that award type, and reads history
- **THEN** the existing entry still reports `Advice`

#### Scenario: Deleted legacy award cannot be resolved
- **WHEN** an existing award event references an award id no longer present during migration
- **THEN** its `reward_name` is backfilled with that award id and the entry remains browseable

### Requirement: Reward history is not a chat archive
Reward-history responses MUST NOT include message text, rendered quotes, command triggers, platform user ids, or recovered chat fragments. Existing optional source-message identifiers MAY remain stored internally but MUST NOT be returned by this endpoint.

#### Scenario: Message-aware award
- **WHEN** an award event has a source message platform and id
- **THEN** its history entry contains the reward and viewer fields but no source-message fields or chat text
