## ADDED Requirements

### Requirement: Live Events navigation
Live SHALL provide an Events tab beside Messages using the existing keyboard-accessible tab navigation. Events SHALL follow the live-events capability, including current-session filtering, durable reads and stable history browsing. The existing OBS dock MUST retain its messages view without a new mode or route.

#### Scenario: Switch between chat and events
- **WHEN** the operator opens Events and returns to Messages
- **THEN** the event journal appears separately and does not insert event rows into chat
