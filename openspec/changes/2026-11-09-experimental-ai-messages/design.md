## Context

The operator approved a planning-only PR for experimental arbitrary viewer messages. Existing alert commands match whole lines; social commands accept a remainder. Existing alerts use local image/audio filenames, a 20-item queue and a 10-second command expiry. The pack importer does not import `voices` or `voice` metadata into runtime commands (`internal/packimport/schema.go`).

The external operator pack contains Jake, Fahad, Malthus and Bounty Hunter voices, separate display/spoken text, situation images and ElevenLabs v3 inline tags. Treat this as an example, not bundled content or a dependency on an operator filesystem path.

## Goals

Preserve viewer meaning and wording while correcting spelling; expand abbreviations/numbers only for speech; select approved visuals and expressive delivery; automatically publish safe messages and ask for confirmation only on semantic uncertainty. Keep provider contracts replaceable and ordinary chat responsive.

## Non-Goals

Creative rewriting, viewer-specified characters, level eligibility, chat history, vision, tools/function execution, generating images/voices, changing existing pack schema, importing the example pack automatically, paid retries/fallback, app-enforced monetary budgets, XP or command economy effects. No implementation or canonical spec sync in this PR.

## Component / Process / IPC Boundaries

Add a cohesive `internal/aimessage` service owned by bootstrap and registered as a cancellable runnable. The command matcher recognizes the feature trigger before catalog lookup only when enabled; admission and cooldown decisions are local. Connector callbacks never wait for network work. Provider clients are thin HTTP adapters below this service, not a general agent framework.

Contracts:
- Moderator: input/output text plus operator policy -> `allow|reject|review`, stable reason code, short explanation. Decisions combine by reject > review > allow.
- Preparer: original text, operator stream context and immutable approved catalog -> display text, spoken segments, character ID and image binding ID. No arbitrary URLs, filesystem names or voice IDs from the model.
- Speech synthesizer: validated text segments, semantic delivery directions, selected voice binding and model options -> bounded audio bytes, MIME/codec and measured duration.

One OpenAI-compatible Chat Completions transport serves the LLM profiles. For v1, combine input moderation and preparation into one request; use a second independent request to validate input/output policy and preservation of meaning. Both use the configured LLM profile. The second call returns a verdict only, never rewritten text. Rejects can stop before preparation/verification. These separate contracts allow a dedicated moderation service later without requiring it now.

Use `response_format: json_schema` where configured and supported, otherwise explicit `json_object` mode with the same local schema validation. Do not silently downgrade on an API error. Validate finish reason, refusals, response size, exact fields, lengths, allowed IDs and allowed delivery values. Schema adherence is not semantic safety. No arbitrary provider JSON editor in the first UI; allow only documented adapter options.

## State and Event Flow

`received -> queued -> preparing -> verifying -> review_pending | synthesizing -> ready -> dispatched`

Terminal alternatives: `rejected`, `expired`, `canceled`, `failed`. `dispatched` means emitted for connected OBS clients, not confirmed audible. Do not claim successful playback without an acknowledgement protocol.

Admission reserves an ID, source message deduplication key, viewer/global cooldown and queue slot atomically. Invalid/overlength/full-queue attempts consume no paid request or cooldown. Accepted attempts consume cooldown even if moderation rejects, preventing paid rejection spam. Use canonical viewer identity with existing stable platform fallback; missing stable identity is rejected without spending. No balance/ammo/XP is consumed or granted.

`review_pending` leaves the generation queue. Store exact prepared payload and reason. Approval is compare-and-swap on request ID/revision and unexpired review state; reserve capacity before changing state, otherwise return a recoverable queue-full conflict. Approval does not reprepare or silently substitute content. Failed validation cannot be overridden. Rejection is terminal. Review expires five minutes after entering review. Approval gets a new 90-second delivery deadline because it is explicit operator intent; unreviewed requests expire 90 seconds after admission. Review capacity is ten; overflow fails closed.

A ready job enters a dedicated AI lane at the same low scheduling priority as command/greeting alerts, ordered by readiness, below protected alerts. Existing command expiry remains ten seconds; AI uses its absolute deadline. Keep total pending capacity twenty; AI may replace only the oldest pending AI item, otherwise is dropped, never displacing protected or ordinary command items. Drop/expiry does not replay or refund provider costs. UI distinguishes dispatched from audible; a local generation log cannot promise every OBS client played the item.

## Threading / Async / Cancellation

One active generation job (including all LLM/TTS stages), three waiting jobs by default. Review jobs do not occupy the worker. Timers use injected clocks for tests; persisted deadlines use UTC. Recheck feature generation, deadline and catalog revision before each paid call and before dispatch. Cancel on feature disable, new stream, explicit cancel or shutdown. On restart mark all nonterminal jobs canceled; never retry or replay. Sleep/wake reevaluates deadlines before work resumes.

Disabling emits an AI-only cancellation frame that clears pending AI alerts and stops a currently playing AI alert. Other alerts are untouched. A late provider response cannot resurrect canceled work. OBS reconnect receives no historical AI alerts and no generated audio replay. Client deduplicates job IDs.

## Security and Trust Boundaries

Viewer text is untrusted data, never an instruction source. Local normalization rejects control characters and explicit operator denylist matches; it does not attempt to silently sanitize forbidden content. Semantic policy rejects profanity and insults aimed at real people; game-character banter without profanity is allowed. Ambiguous targets go to review. Check both display and spoken text. Do not strip a harmful phrase and accept the remainder.

Model instructions include policy, immutable catalog descriptions and operator context separately from viewer input. No model tools, network retrieval or access to secrets. Only operator-configured endpoints receive requests. Require HTTPS except explicit localhost HTTP development endpoints; do not forward authorization across redirects. Secrets are server-side references, never part of a model prompt, WS frame, log, export or GET settings response.

Use plain text DOM rendering. Separate semantic delivery enums from provider tags; the ElevenLabs renderer emits only supported allowlisted tags. Resolve character/image compatibility locally. Measure returned audio, reject malformed/oversize/overlong output before publication, and never fetch model-provided media URLs.

## Decisions

### Providers and capabilities

Use named presets plus editable base URL/model/key reference. OpenAI: `https://api.openai.com/v1`; OpenRouter: `https://openrouter.ai/api/v1`; RouterAI: `https://routerai.ru/api/v1`; Polza: `https://polza.ai/api/v1`. All append `/chat/completions`. Presets do not assert that every model supports structured output. OpenRouter can request `provider.require_parameters=true`; preserve capability checks per model/endpoint. ElevenLabs uses its own `xi-api-key`, `/v1/text-to-speech/{voice_id}`, `model_id` and `output_format`. Default experiment model is `eleven_v3` to match the existing pack; it remains configurable. Choose an LLM model explicitly rather than freezing a speculative default.

### Character catalog and content

Operator config stores stable character IDs, labels, selection descriptions, voice bindings, default delivery and an allowlist of image entries. Each image entry references an existing alert command ID and has a situation description. On save/admission, resolve and snapshot its current asset and presentation; require an enabled valid entry with an existing image. Changing/deleting a referenced command invalidates affected pending jobs before synthesis/dispatch; no silent substitution. Existing commands are never fired as a side effect. Manual initial bindings reuse imported assets without extending pack import in this experiment.

Preparer output is `{display_text, segments:[{text, delivery}], character_id, image_id, input_decision, reason_code, reason}`. Spoken text is concatenated segments. Display retains readable abbreviations/numbers; speech expands them, preserving meaning. No thematic additions, invented facts or emotional words. A fixed delivery vocabulary (neutral, warm, excited, dry, urgent, whisper) is translated by the adapter; unsupported delivery falls back to neutral with diagnostics. Emotional performance is best-effort, not a safety guarantee.

### Defaults and operational bounds

| Setting | Default | Interpretation |
|---|---:|---|
| input_max_chars | 300 | Unicode scalar values after trimming payload |
| speech_max_chars | 600 | Sum of spoken segment text, tags excluded |
| audio_max_seconds | 30 | Measured before dispatch; never truncate |
| viewer_cooldown_seconds | 60 | From successful admission |
| global_interval_seconds | 10 | From successful admission |
| concurrency | 1 | Fixed for experiment |
| queue_capacity | 3 | Waiting jobs, excluding active/review |
| lifetime_seconds | 90 | Admission to playback start; approval resets deadline |
| review_capacity | 10 | Separate from generation queue |
| review_ttl_seconds | 300 | From review decision |
| llm_timeout_seconds | 15 | Each LLM call, also bounded by job deadline |
| tts_timeout_seconds | 30 | Also bounded by job deadline |

Display text is also capped at 600 characters. Operator-adjustable limits remain positive and bounded; implementation must document schema ranges. Fixed safety ceilings: 2,000 input characters, 4,000 display/spoken characters, 60 seconds audio, 20 generation waiters, 50 review items, 600 seconds job lifetime, 1,800 seconds review lifetime, 60 seconds LLM timeout and 120 seconds TTS timeout. Cooldowns may be zero, up to 3,600 seconds. Audio response cap is 10 MiB; structured LLM response cap is 64 KiB. These ceilings are engineering defaults for review, not a promise of economical usage.

Provider/proxy budgets are authoritative. Authentication or confirmed exhausted quota pauses admission; operator resume is explicit. HTTP 429 with uncertain cause produces a temporary provider-backoff state respecting bounded Retry-After; do not mislabel every 429 as exhausted budget. No automatic paid retries or provider/key fallback, including after ambiguous timeout. Existing pending jobs may expire while paused. No automatic replay when resumed.

### Presentation and diagnostics

Publish ready local audio only after validation. Banner contains corrected display text and viewer attribution; tags never appear. Duration is measured audio length plus one second, capped at 31 seconds at default settings (hard ceiling audio limit plus one second). Audio never overlaps another AI alert on one surface. Respect existing mute/volume controls; desktop command-sound preference governs AI app playback, OBS audio remains independent. Never attach AI speech to ordinary chat-message TTS.

Emit bounded-cardinality pipeline counters for accepted, rate-limited, queue-full, allow, reject, review, expired, failed, canceled and dispatched; stage duration, provider usage when supplied, error code and correlation ID. No raw text or secrets in general logs. Audit UI uses local retained records. Unknown usage/cost stays unknown, not zero.

## Risks / Trade-offs

Two LLM calls add latency/cost but separate preparation from final verification. Models can misclassify; test a Russian-language corpus and review uncertainty without claiming perfect filtering. Paid generation may still expire in an OBS queue; no exactly-once audible guarantee across multiple OBS instances. Explicit neutral fallback improves portability but loses some expression. External model identifiers, voice access and structured-output capabilities require real-account smoke testing before support is claimed.

## Migration / Rollout / Rollback

Missing feature flag is false. Additive config and audit migration only; no modification of existing commands. Configure secrets and character bindings, validate provider settings, then enable. Disable cancels pending work and clears AI playback. Preserve settings while disabled. Downgrade after disabling and backing up config/database; no destructive down migration. Canonical specs remain unchanged until implementation is delivered.

## Open Questions

No blocking product questions remain. Engineering assumptions selected here: manual character bindings, two LLM calls, seven-day local audit retention, environment-based secret references and no guaranteed OBS playback acknowledgement. Validate these in implementation review. Level-based eligibility is a separate stabilization idea, not a hidden task.

## API Research Evidence (2026-11-09)

Documentation-only findings; no paid calls or account capability checks were performed.

- [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create) and [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs): schema output requires compatible models; still handle refusals and incomplete output.
- [OpenAI moderation](https://developers.openai.com/api/docs/guides/moderation): harm-category signals do not replace the stream's profanity policy; a dedicated moderation provider is optional future work.
- [OpenRouter quickstart](https://openrouter.ai/docs/quickstart) and [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs): OpenAI-compatible transport with endpoint-dependent schema enforcement/routing.
- [RouterAI quickstart](https://routerai.ru/docs/guides/overview/quickstart) and [parameters](https://routerai.ru/docs/guides/overview/parameters): OpenAI client/base URL, JSON mode and schema-related parameters documented.
- [Polza text requests](https://polza.ai/docs/gaidy/chat-completions): Chat Completions and response_format documented; exact strict schema behavior remains an integration test obligation.
- [ElevenLabs speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert) and [audio tags](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/how-do-audio-tags-work-with-eleven-v3-and-v4): separate audio API and model-specific emotional directions, not a shared LLM/TTS protocol.
