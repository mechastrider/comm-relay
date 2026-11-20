# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|---|---|---|---|---|
| preferences | Feature, profiles, policy, limits, catalog | Existing config.json | Additive snake_case object | Context and voice IDs; no key values |
| database | Bounded AI job audit, deduplication and revisions | Existing comm-relay.db | New migration/table | Viewer text and moderation reasons |
| secrets | Provider API keys | Process environment, referenced by variable name | Not exported or persisted by app | Secret |
| media | Generated speech | Existing overlay-assets beside config | Generated safe filename; ownership recorded in audit | Spoken viewer text |
| memory | Worker queue and cooldowns | Process-local | Reconstructed as canceled, not replayed | Transient |

## Changed Structures / Formats

Config adds `features.experimental_ai_messages` and `ai_messages` with `llm`, `tts`, `stream_context`, `denylist`, `limits`, `characters`. LLM contains preset/adapter, base_url, model, api_key_env, output_mode and timeout_seconds. TTS contains adapter/base_url/model/api_key_env/output_format/timeout_seconds. Character entries have id/label/description/voice_id/default_delivery/images; images have id/command_id/description. All IDs are bounded stable strings; duplicate IDs, empty voices, missing/non-alert image sources and incompatible bindings fail validation. No external pack paths or source audio files are required at runtime.

Add `ai_message_jobs`: id (primary key), revision, state, created_at, updated_at and a JSON payload containing the typed job, immutable prepared result, presentation, config revision hash, safe usage and stage timings. The payload uses the application's current job contract; incompatible/corrupt payloads pause AI without preventing chat startup. Indexed columns support compare-and-swap updates and state/time lookup. Source identity is reserved transactionally in `ai_message_dedupe`, whose unique primary key combines platform and source message ID. For missing source IDs a per-admission UUID deliberately avoids content-based deduplication; there is no reconnect dedupe guarantee for such connectors.

Prepared content contains display text, spoken segments and selected IDs. Presentation stores operator-owned media, voice, layout, sizing and volume; the config revision hash invalidates work across model/policy changes. No credential values are stored. Active review snapshots pin media; catalog changes cancel pending jobs.

Terminal history retention is seven days and at most 1,000 rows, whichever removes a record first; active rows are additionally bounded by queues. Dedupe tombstones (source identity and timestamp only) survive history clearing/eviction for seven days to prevent reconnect duplicates from spending again. A separate bounded tombstone table capped at 100,000 rows is sufficient; reject further AI admission until cleanup if full rather than evict live dedupe protection. No cross-restart replay promise for connectors that provide no stable source identity; reconnect history must remain excluded from AI intake.

## Atomicity / Concurrency / Locking

Use existing SQLite migration/transaction infrastructure. Compare-and-swap revision for review actions, plus serialized service admission/cooldown reservation. No database transaction spans network I/O. Commit prepared review data before exposing approval. Write audio to a temporary file, validate duration/size, rename atomically, then commit ready metadata. If commit fails, file is an orphan eligible for cleanup; do not dispatch. Dispatch is at-most-once attempt: record terminal dispatched before publishing, accepting possible loss on crash rather than paid/replayed duplication.

## Encryption / Secret Storage / Privacy

Audit data is local plaintext like existing application data; do not claim encryption. Environment variable names may be exported, values may not. UI warns that submitted text, context and catalog descriptions reach configured providers. General logs omit text. Explicit history clearing removes terminal content/media, retaining only bounded dedupe tombstones. Rejected originals remain accessible only in the local operator audit until retention expires.

## Migration / Downgrade / Backup / Export

Create the next migration number at implementation time; never reserve a number in this plan. Additive tables and config defaults; do not rewrite existing command data. Existing missing/false feature flag stays false. Backup config/database using existing procedure before upgrade. Downgrade requires disabling first and retaining backup; older binaries ignore new config fields only where existing loader supports it, so verify round-trip and warn that an older save may discard AI settings. Do not drop new tables automatically. Pack export/import is unchanged and must not include credentials or generated message history.

## Corruption Recovery / Cleanup / Uninstall

Mark nonterminal rows canceled at startup. Missing/corrupt audio fails playback safely; never regenerate automatically. Remove temporary files and unreferenced AI-owned assets only; never delete imported pack media. Terminal generated media is retained for 24 hours or until history clearing/retention, whichever first, with a two-minute grace after dispatch to cover active clients. Cleanup recognizes a bounded AI-owned filename namespace and DB references, not all files under overlay-assets. A failed cleanup logs a bounded error and retries maintenance, not synthesis. If audit persistence cannot commit, pause AI intake rather than operate unaudited. Existing uninstall/data-retention policy remains authoritative.

## Verification

Migration from existing DB; repeated startup; config omission/false round-trip; duplicate source message; concurrent approve; failed write/rename/commit; dangling catalog asset; crash before/after dispatch marker; retention while an alert is playing; cleanup never touches ordinary assets; missing environment key; downgrade with backed-up config.

## Not applicable

No cloud persistence, schema migration of existing command packs, keychain migration or destructive down migration.
