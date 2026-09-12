## Purpose

Correct canonical viewer merge behavior for all durable historical periods consumed by progression.

## MODIFIED Requirements

### Requirement: Operator can merge two viewers
`POST /api/viewers/merge` SHALL accept JSON `from_id` and `into_id`. On success the system SHALL move all identities from the source viewer onto the target; consolidate all-time counters and every current or historical session and day stats row; reassign interaction history and progression history using their capability-specific collision rules; combine opt-out flags restrictively; hide the source from lists and leaderboards; and record an audit of the merge. The entire merge MUST be atomic and MUST NOT emit retrospective alerts. Merging a viewer into itself SHALL be rejected. Unmerge is not provided.

#### Scenario: Cross-platform merge
- **WHEN** the operator merges viewer A into viewer B
- **THEN** both identities appear on B, every overlapping period is summed exactly once, non-overlapping historical periods remain available, and A no longer appears in `GET /api/viewers` or leaderboards

#### Scenario: Self-merge rejected
- **WHEN** `from_id` equals `into_id`
- **THEN** the request fails with HTTP 400 and no counters, identities, facts, or histories change

#### Scenario: Merge fails midway
- **WHEN** any historical row cannot be consolidated safely
- **THEN** the transaction rolls back and both canonical viewers remain unchanged
