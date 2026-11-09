## ADDED Requirements

### Requirement: Experimental AI trigger is an explicit matching exception
When `features.experimental_ai_messages` is enabled, the system SHALL recognize a trimmed exact case-insensitive leading `!m` token and its text remainder before catalog matching. It MUST NOT use fuzzy matching, aliases or viewer parameters for this trigger. This is an explicit exception to whole-line alert matching and the existing fired/cooldown/rejected command outcome domain: AI jobs SHALL use separate asynchronous status, not report fired at admission. Recognized AI requests SHALL not qualify as ordinary-message greetings or trigger existing command resource/XP effects. Existing configured command-row visibility rules SHALL apply, with rejected/pending AI rows shown only in admin/dock, never exposing unmoderated text on OBS chat. Enabling MUST fail if `m` is already a catalog trigger or alias; creating that conflict while enabled MUST fail. With the feature disabled, existing catalog/ordinary-chat behavior SHALL remain unchanged.

#### Scenario: Parameterized AI request
- **WHEN** the enabled feature receives `!m опять руку оторвало`
- **THEN** it submits the remainder once to bounded AI admission and marks the chat row as an AI request
- **AND** it does not emit a successful ordinary command outcome

#### Scenario: Empty payload
- **WHEN** the enabled feature receives `!m` without text
- **THEN** it reports an input error without provider calls or greeting eligibility

#### Scenario: No fuzzy or prefix matching
- **WHEN** chat contains `!mm текст` or `!more текст`
- **THEN** the experimental handler does not recognize it

#### Scenario: Existing trigger conflict
- **WHEN** an operator enables the feature with an existing command or alias `m`
- **THEN** saving is rejected with instructions to resolve the conflict and existing behavior remains active
