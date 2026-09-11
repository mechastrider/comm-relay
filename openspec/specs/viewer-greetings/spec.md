# Viewer Greetings

## Purpose

Define configurable automatic alerts for a canonical viewer's first-ever ordinary message and first ordinary message in a confirmed stream session.

## Requirements

### Requirement: Two fixed greeting definitions are independently configurable
The system SHALL provide fixed greeting definitions `new_viewer` and `returning_viewer`. Each definition MUST expose `enabled`, `splash_template`, `sound`, `duration_ms`, `image_asset`, `sound_file`, `sound_volume`, `layout`, `image_fit`, and `image_size_pct` with the same validation and safe stored-asset rules as alert commands. Both definitions MUST default to disabled on fresh and upgraded installations and MUST be editable but not creatable or deletable.

#### Scenario: Fresh installation
- **WHEN** a new local viewer database is initialized
- **THEN** both greeting definitions exist with localized starter templates and `enabled` false

#### Scenario: Independent enablement
- **WHEN** the operator enables `returning_viewer` and leaves `new_viewer` disabled
- **THEN** returning-viewer greetings may fire and new-viewer greetings remain silent

### Requirement: First-ever greeting wins on a viewer's first eligible message
An identified canonical viewer's first ordinary chat message ever SHALL qualify for `new_viewer`; the same message MUST NOT also produce `returning_viewer`. A later session's first ordinary message SHALL qualify for `returning_viewer`. A qualifying message MUST produce at most one automatic greeting, and greeting qualification MUST NOT grant XP, append a command interaction event, or reply through a platform connector.

#### Scenario: Brand-new viewer
- **WHEN** an identified viewer sends their first ordinary message and both definitions are enabled
- **THEN** one `new_viewer` alert is emitted and no `returning_viewer` alert is emitted

#### Scenario: Known viewer in a new session
- **WHEN** the operator has started a new session and a previously known viewer sends their first ordinary message in it
- **THEN** one `returning_viewer` alert is emitted when that definition is enabled

#### Scenario: Repeated ordinary message
- **WHEN** the same viewer sends another ordinary message in the same session
- **THEN** no additional automatic greeting is emitted

### Requirement: Eligibility is consumed without retroactive delivery
The system SHALL persist first-ever and current-session ordinary-message markers when the qualifying message is committed, whether the applicable greeting is enabled, the viewer is excluded, or delivery cannot reach an overlay. Enabling a definition or removing a viewer exclusion later MUST NOT replay a previously consumed greeting.

#### Scenario: Enable after first message
- **WHEN** `new_viewer` is disabled for a viewer's first ordinary message and the operator enables it afterward
- **THEN** the system does not greet that viewer as new on a later message

#### Scenario: No alert receiver
- **WHEN** a qualifying greeting is enabled but no production alert client is connected
- **THEN** the eligibility marker remains consumed and the greeting is not replayed after a client connects

### Requirement: Recognized commands do not consume greeting eligibility
A chat line that matches an enabled command SHALL execute under the chat-command contract but MUST NOT set either ordinary-message greeting marker. An unknown, disabled, or otherwise unmatched bang line SHALL retain ordinary-chat behavior and MAY qualify for a greeting.

#### Scenario: First line is hi command
- **WHEN** a new viewer first sends an enabled `!hi` command and then sends `hello`
- **THEN** the command alert may fire for `!hi` and the later `hello` produces the viewer's single new-viewer greeting

### Requirement: Canonical identity and viewer exclusion govern greetings
Greeting eligibility SHALL be tracked for the canonical viewer across all linked platform identities. A canonical viewer with `greetings_disabled` true MUST consume eligibility without emitting automatic greetings. A merge MUST preserve the union of both viewers' first-ever and current-session markers and MUST preserve exclusion when either side was excluded.

#### Scenario: Linked identity changes platform
- **WHEN** a canonical viewer already greeted on Twitch sends their first message through a linked YouTube identity in the same session
- **THEN** no second greeting is emitted

#### Scenario: Excluded technical account
- **WHEN** a viewer with `greetings_disabled` true sends a qualifying ordinary message
- **THEN** no greeting is emitted and a later message does not replay it
