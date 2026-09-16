## Purpose

Attribute durable live interaction facts to stream sessions without retaining chat content.

## ADDED Requirements

### Requirement: Live interaction events carry authoritative session attribution
Every successfully persisted live command, award, activity grant, and contract award interaction event SHALL store the open `session_id` in the same transaction as its existing fact. Session attribution MUST NOT change event kind, XP, source-message references, or the prohibition on stored chat text. Historical interaction rows MAY remain unattributed only when their timestamp cannot be mapped unambiguously to one session.

#### Scenario: Award during current session
- **WHEN** an operator award commits in the open session
- **THEN** its interaction event references that session atomically with the XP grant

#### Scenario: Ambiguous legacy event
- **WHEN** an upgrade cannot map an existing event timestamp to exactly one historical session interval
- **THEN** the event remains durable with no `session_id` and no session is guessed

### Requirement: Viewer merges preserve session attribution
Merging viewers SHALL keep each interaction event's existing session attribution while reassigning its viewer according to current merge rules. It MUST NOT move an event to the merge-time session.

#### Scenario: Merge after several streams
- **WHEN** a source viewer has attributed events in two historical sessions and is merged
- **THEN** both events remain linked to their original sessions under the surviving viewer
