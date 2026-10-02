## Purpose
Preserve operator capabilities during the complete admin implementation replacement.

## ADDED Requirements

### Requirement: Admin replacement preserves operator state and compatibility
The admin SHALL preserve existing workspace links, local preferences, independent draft ownership, and all implemented workflows during the frontend replacement.

#### Scenario: Unrelated server update arrives during editing
- **WHEN** Settings or Studio has an unsaved draft and unrelated server state changes
- **THEN** the draft remains intact and saving merges only its owned settings

#### Scenario: Existing link opens after upgrade
- **WHEN** an operator opens an existing admin workspace or settings hash link
- **THEN** the corresponding workspace remains reachable with browser history support

#### Scenario: Repeated workspace navigation
- **WHEN** the operator repeatedly changes workspaces while live events arrive
- **THEN** messages and mutations are not duplicated and inactive subscriptions are cleaned up
