## Purpose

Safely prepare and voice arbitrary viewer messages through configurable external providers behind an experimental gate.

## ADDED Requirements

### Requirement: Preserve viewer content and select approved presentation
The system SHALL correct spelling and punctuation without creative rewriting or changing meaning. It SHALL retain readable display text and separately expand speech abbreviations/numbers. It MUST select a character and compatible image from the operator-approved catalog and resolve voice/media locally. It MUST NOT execute the selected catalog command or accept arbitrary model-provided paths, URLs or voice identifiers.

#### Scenario: Correct and expand
- **WHEN** a viewer submits an allowed phrase containing `2 млн C-Bills`
- **THEN** the display may retain that readable notation and speech expands it into words without inventing a character reply
- **AND** only approved character/image bindings are used

#### Scenario: Invalid selection
- **WHEN** a model selects an unknown or incompatible image or a referenced asset disappears
- **THEN** the job fails without synthesis or publication rather than substituting an unrelated asset

### Requirement: Three-way moderation checks original and prepared content
The system SHALL reject profanity and insults of real people in original or prepared text. Game-character banter without profanity SHALL be permitted. The moderation result SHALL be allow, reject or review, with a reason. Review SHALL represent model-reported semantic uncertainty, not an uncalibrated confidence threshold. Reject SHALL dominate review, which SHALL dominate allow. Technical errors MUST fail closed and MUST NOT be treated as approval.

#### Scenario: Forbidden original
- **WHEN** a viewer includes profanity that could be removed by rewriting
- **THEN** the entire request is rejected and no paid TTS or banner occurs

#### Scenario: Ambiguous target
- **WHEN** no check rejects but a check cannot determine whether an insult targets a real person
- **THEN** the exact prepared result enters operator review without synthesis and without blocking other jobs

#### Scenario: Unsafe prepared output
- **WHEN** final verification detects forbidden content or changed meaning
- **THEN** no synthesis or publication occurs; forbidden content is rejected and meaning uncertainty requires review

### Requirement: Review approves an immutable result once
Operators SHALL see original/display/spoken text, character, image and reason before approving or rejecting. Approval SHALL apply only to the exact current revision, once, within five minutes by default. Approved work SHALL get a fresh delivery deadline and enter bounded processing without another rewrite. Invalid schema/media or explicit rejection MUST NOT be overridable as review. Full queues SHALL leave the review pending and return a recoverable conflict.

#### Scenario: Double approval
- **WHEN** two clients approve the same review revision
- **THEN** only one synthesis job is admitted and the other client receives a stale-state conflict

#### Scenario: Review expires
- **WHEN** its deadline passes without approval
- **THEN** the item becomes expired and later approval cannot synthesize it

### Requirement: Bounded asynchronous admission and processing
All viewers with a stable identity SHALL be eligible independently of level. Defaults SHALL be 300 input characters, 600 display/spoken characters, 30 seconds audio, 60-second viewer cooldown, 10-second global interval, one active job, three waiting jobs, ten review items, 90-second delivery lifetime and five-minute review lifetime. Character counts SHALL use Unicode scalar values; speech tags SHALL not count as spoken characters. Each LLM call SHALL default to a 15-second timeout and TTS to 30 seconds. Admission SHALL enforce capacity and cooldown atomically before spending. Overlength input/audio MUST be rejected, never silently truncated. Accepted requests consume cooldown even if later rejected; failed admission does not.

#### Scenario: Concurrent flood
- **WHEN** multiple viewers submit while the queue is full or the global interval has not elapsed
- **THEN** excess requests receive a local status without external API work and ordinary chat continues

#### Scenario: Duplicate connector delivery
- **WHEN** the same stable source-message identity is received again
- **THEN** it cannot cause another paid job or banner

### Requirement: Replaceable providers and validated output
The system SHALL support an OpenAI-compatible Chat Completions profile with configurable base URL, model, credential reference, output mode and timeout, and a separate ElevenLabs TTS profile with model and per-character voices. Structured responses MUST be locally validated even in schema mode. Unsupported schema mode MUST produce an actionable error, not silent downgrade. Speech directions SHALL be separate from display text and translated into supported provider syntax, with explicit neutral fallback for unsupported directions.

#### Scenario: Compatible proxy
- **WHEN** an operator selects an OpenRouter, RouterAI or Polza preset and a supported model
- **THEN** the same Chat Completions contract is used with that profile's URL/key/model
- **AND** model-specific capabilities are validated instead of assumed from the provider name

#### Scenario: Truncated response
- **WHEN** the provider returns incomplete JSON, refusal, invalid IDs or an oversized result
- **THEN** the request fails without TTS or publication

### Requirement: Budget failures and lifecycle never replay paid work
The system MUST NOT automatically retry paid calls or fall back to another provider/key. Authentication and confirmed exhausted quota SHALL pause admission until explicit resume. Temporary rate limits SHALL use bounded backoff without replaying failed calls. Disable, new stream, cancellation and shutdown SHALL invalidate pending jobs and late responses. Restart SHALL cancel nonterminal jobs rather than resume them. No previous alert SHALL replay on reconnect.

#### Scenario: Ambiguous timeout
- **WHEN** a synthesis call times out after possible provider execution
- **THEN** the job fails without an automatic second paid request

#### Scenario: Disabled during synthesis
- **WHEN** the feature is disabled before a late synthesis response arrives
- **THEN** the result is discarded and pending/current AI playback is canceled

### Requirement: Operator status and private diagnostics
The operator SHALL have settings, review and recent-job views in browser and desktop admin, with accessible loading, empty, paused, failure and expiry states. Status SHALL distinguish dispatched from confirmed playback. The system SHALL retain local audit records for seven days, bounded to 1,000 records, with explicit clear history. Provider costs missing from responses SHALL remain unknown. General logs MUST exclude raw text and credentials; stage metrics SHALL use bounded labels. No external platform reply SHALL be sent.

#### Scenario: Restart recovery
- **WHEN** admin reconnects after server restart
- **THEN** it loads the local job history with interrupted jobs canceled and no replay controls that silently spend money

#### Scenario: Secret visibility
- **WHEN** an operator loads settings, exports configuration or views an error
- **THEN** no provider credential value is exposed
