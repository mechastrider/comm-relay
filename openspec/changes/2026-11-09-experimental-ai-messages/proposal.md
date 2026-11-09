## Why

Viewers can currently trigger only prepared alert content. An experimental `!m <text>` interaction should preserve a viewer's wording while correcting it, select an operator-approved character and image, synthesize expressive speech, and show an OBS banner. The operator approved automatic delivery, rejection of profanity and real-person insults, and manual confirmation only when the model reports uncertainty.

## Users and Supported Platforms

All viewers on existing connectors; operators in browser admin and the existing Wails desktop shell; OBS Browser Source. Preserve the currently supported platform/build matrix without new OS requirements.

## What Changes

- Add default-off `features.experimental_ai_messages` and independent LLM/TTS profiles.
- Use OpenAI-compatible Chat Completions for OpenAI, OpenRouter, RouterAI and Polza; use a separate ElevenLabs adapter.
- Return allow/reject/review decisions, corrected display text, expanded spoken text, approved character/image identifiers and delivery directions.
- Add bounded asynchronous work, operator review, cancellation, local generated audio, and dedicated expiring alert scheduling.
- Add operator-maintained character bindings to existing command images; no hardcoded themed pack.

## Capabilities

### New Capabilities
- `ai-messages`: moderation, preparation, provider contracts, operator workflow, limits and lifecycle.

### Modified Capabilities
- `chat-commands`: exact parameterized experimental trigger with separate asynchronous status.
- `overlay-alerts`: generated-message presentation, expiry and playback cancellation.
- `config-store`: experimental feature gate and persisted AI settings.

## Scope / Non-Goals

Preserve meaning; do not invent character dialogue. All viewers are eligible. No level gate, command parameters, chat history, vision, image generation, tools/agent loop, automatic paid retries, provider fallback, XP or economy rewards. Provider/proxy budgets remain the monetary authority. Level-based eligibility is a stabilization candidate, not implementation scope.

## Impact

Touches command intake, background orchestration, config, local audit storage/media, admin UI and OBS delivery. Only configured providers receive message content; secrets stay server-side. Existing command behavior remains unchanged when disabled. No new runtime service, installer, or release channel. This PR contains planning only; implementation must add user-facing release notes and sync specs after verification.
