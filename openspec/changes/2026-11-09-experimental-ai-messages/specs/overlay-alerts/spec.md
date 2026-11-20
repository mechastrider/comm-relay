## ADDED Requirements

### Requirement: Generated AI alerts have bounded independent expiry
AI messages SHALL use `source: ai_message`, immutable `job_id`, prepared display text, resolved local image/audio, measured duration plus one second, and an absolute `expires_at`. They SHALL share the total pending capacity of twenty, run below protected alerts and in readiness order with low-priority alerts, and retain their own deadline rather than the ordinary ten-second command expiry. At capacity a new AI item MAY replace only the oldest pending AI item; otherwise it SHALL be dropped. Expiry SHALL be checked before playback; started playback SHALL finish normally unless explicitly canceled. Text MUST be rendered as text nodes, without speech tags. Existing OBS theme, transparency, volume, reduced-motion and safe media rules SHALL apply.

#### Scenario: Generated audio is longer than a usual command
- **WHEN** validated audio lasts 24 seconds and reaches playback before its deadline
- **THEN** the banner lasts 25 seconds and the audio plays without a built-in tone or another simultaneous alert

#### Scenario: Result goes stale
- **WHEN** a pending AI result reaches its absolute deadline
- **THEN** it is removed without sound and without affecting protected alerts

### Requirement: AI playback can be canceled and is not replayed
An `ai_message_cancel` control frame SHALL cancel listed AI job IDs, or all AI jobs when explicitly scoped to all. It SHALL clear their queued alerts and stop current matching AI audio. It MUST NOT cancel ordinary alerts. Reconnect SHALL not replay AI history. Desktop app playback SHALL follow the existing command-sound preference independently of OBS; historical records SHALL never play. AI job status MUST NOT trigger ordinary chat-message speech.

#### Scenario: Emergency disable
- **WHEN** feature disable emits cancellation while an AI alert is playing
- **THEN** that audio/banner stops and pending AI alerts are cleared while other alert lanes remain intact

#### Scenario: Duplicate frame
- **WHEN** a client receives the same AI job ID twice
- **THEN** it plays at most once within that connection's deduplication window
