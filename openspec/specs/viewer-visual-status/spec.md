# viewer-visual-status Specification

## Purpose

Expose server-authoritative viewer identity, level emblems and remaining social actions on stream.

## Requirements

### Requirement: Independent default-enabled display controls
Chat presets SHALL support independently persisted `show_level_badges` and `show_command_ammo` switches, defaulting to true when absent. Leaderboard presets SHALL support an independent `show_level_badges` switch with the same default. Studio MUST preview unsaved choices and saved choices MUST reach active OBS sources. Existing viewer-title visibility remains independent.

#### Scenario: Upgrade and explicit disable
- **WHEN** an old preset without the new fields is loaded
- **THEN** both chat visuals and leaderboard emblems are enabled
- **AND** saving false and reloading MUST keep that particular visual disabled without changing the others

### Requirement: Bounded ammunition display
Chat SHALL display independent like and buff magazines in a right-aligned header group with the level emblem; viewer identity stays on the left and message text spans the full content width below. Capacities 1 through 8 SHALL use filled available cartridges and outlined spent cartridges. Larger capacities SHALL use one fixed magazine icon and exact remaining/total text, including 100. Empty stocks SHALL remain visible with zero. Capacity zero SHALL omit that action on stream. Audience viewer detail SHALL show exact counts and label unavailable actions. Unknown state MUST NOT be represented as full capacity.

#### Scenario: Large capacity remains compact
- **WHEN** a viewer has 73 remaining like uses from a capacity of 100
- **THEN** the chat shows one magazine symbol and 73/100 without rendering 100 cartridges

#### Scenario: Command rejection
- **WHEN** a command is rejected or on cooldown
- **THEN** its remaining stock is unchanged and existing rejection presentation is preserved

### Requirement: Shared level emblems
Chat, leaderboard and Audience detail SHALL use the same built-in SVG emblem for a level. Emblems MUST remain distinguishable by shape without relying on color, have accessible localized text, and preserve nickname and message readability in every theme. The level editor SHALL offer a finite built-in emblem selector. Existing starter levels SHALL receive one, two and three chevrons, star and laureled star respectively; custom levels SHALL receive a neutral shield. Renaming a level MUST NOT change its emblem.

#### Scenario: Custom level rename
- **WHEN** an operator renames a level with a selected star emblem
- **THEN** all surfaces retain the star for that level

#### Scenario: Full-width message body
- **WHEN** a chat source displays a message
- **THEN** award feedback appears below the message text only when present, without consuming message text width
- **AND** absent feedback MUST NOT reserve an empty row; present feedback MAY increase card height but MUST NOT change text width or its offset within the card

### Requirement: Authoritative bounded snapshots
The server SHALL expose a read-only bounded status lookup for up to 100 platform/user-id pairs, returning their canonical viewer, current level and session id and remaining/capacity values. No lookup SHALL grant XP or create identities. Remaining uses SHALL reuse committed social-use accounting. Clients SHALL refresh after messages and command outcomes, on restoration/reconnect, and at least every five seconds while displaying known identities. Repeated identities MUST share state. Preview and debug surfaces MUST use synthetic data without live status lookup.

#### Scenario: Session reset and level edit
- **WHEN** a new stream starts or level quotas change
- **THEN** visible magazines refresh from server state within five seconds without a page reload
- **AND** remaining uses equal max(0, current capacity minus committed uses in the open session)

#### Scenario: Read failure
- **WHEN** the lookup fails or an identity is unknown
- **THEN** the client hides unavailable visual state, preserves the message and retries without inventing charges

#### Scenario: Reload and linked identities
- **WHEN** an OBS source reloads after a linked viewer spent charges on another platform
- **THEN** restored messages show the shared canonical viewer's current remaining uses

### Requirement: Snapshot and emblem API compatibility
`POST /api/viewers/status` SHALL accept `identities`, an array of at most 100 objects with `platform` and `user_id`. It SHALL return a no-store `statuses` array containing known visible identities with `viewer_id`, `session_id`, `level`, `like` and `buff`; each action contains integer `remaining` and `capacity`. Unknown identities SHALL be omitted. Malformed requests SHALL return 400; unavailable storage SHALL return 503 and read failures SHALL return 500. Viewer detail SHALL include `visual_status` when readable.

Level responses SHALL include `emblem`. Supported ids SHALL be `shield`, `chevron_1`, `chevron_2`, `chevron_3`, `star`, and `laurel`. Creation without an emblem SHALL use `shield`; update without an emblem SHALL preserve the stored value. Successful level mutations SHALL broadcast `viewer_status_changed`, prompting chat and leaderboard snapshots to refresh without creating progression rewards.

#### Scenario: Older level editor
- **WHEN** an older client updates a level without an emblem field
- **THEN** its existing emblem is preserved

#### Scenario: Invalid status batch
- **WHEN** a client submits more than 100 identities
- **THEN** the API returns 400 and performs no viewer mutations

### Requirement: Responsive status header
Chat SHALL keep name and status in a wrapping header above a full-width message body.

#### Scenario: Compact header and long nickname
- **WHEN** a nickname and viewer status compete for header space
- **THEN** the nickname is ellipsized while the status remains right-aligned
- **AND** if both cannot fit, the status group wraps together, without narrowing the message body
