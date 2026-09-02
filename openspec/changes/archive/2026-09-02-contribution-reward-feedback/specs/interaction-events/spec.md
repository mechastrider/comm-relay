## Purpose

Keep message-aware award facts durable while keeping transient award quotations out of SQLite.

## MODIFIED Requirements

### Requirement: Events are durable and not a chat archive

Interaction events SHALL remain durable in SQLite and MAY store a source message `platform` and stable `id`. They MUST NOT persist `message_text`, a rendered quote, fragments, or other full chat content. The system MUST NOT add an interaction-log browsing API or UI in this change.

#### Scenario: Message-aware award survives restart
- **WHEN** an award grant includes a message id and transient quote and the process restarts
- **THEN** the durable event retains the message platform and id but no quote text

#### Scenario: Restart
- **WHEN** the process restarts after a grant
- **THEN** the award event is still present in the database without persisted full chat text

#### Scenario: Grant without message reference
- **WHEN** a valid award is granted without a stable message id
- **THEN** the durable award event is still appended with null source-message fields
