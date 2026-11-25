## ADDED Requirements

### Requirement: Guest chat connection

CommRelay SHALL allow an operator to enable one public GoodGame channel by name or GoodGame page URL and SHALL expose its connection state without requiring credentials.

#### Scenario: First setup
- **WHEN** the operator saves a valid GoodGame channel and enables it
- **THEN** the connector resolves the channel and joins as a guest
- **AND** it reports connected after the server acknowledges the join

#### Scenario: Existing installation
- **WHEN** settings omit GoodGame
- **THEN** the connector is disabled

### Requirement: Live message delivery and recovery

The connector SHALL publish live public messages as unified chat events with platform `goodgame`, upstream viewer identity, display name, text, timestamp and a stable message ID.

#### Scenario: A viewer speaks
- **WHEN** a live message arrives for the joined room
- **THEN** the operator and OBS surfaces receive it through the shared chat pipeline

#### Scenario: Interrupted session
- **WHEN** the connection drops and a retry succeeds
- **THEN** the connector rejoins without replaying history or republishing recently seen message IDs

#### Scenario: Operator changes the connection
- **WHEN** the channel changes or the connector is disabled
- **THEN** the old session closes and the connector follows the saved settings
