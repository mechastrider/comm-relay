## Context

CommRelay already has canonical viewers, an editable award catalog, atomic award XP/event writes, reward history, leaderboard publication, and a priority alert queue. The experiment should compose those pieces rather than introduce viewer participation automation or a second progression model. The only new durable domain state is the operator's current contract and its terminal result.

## Goals / Non-Goals

Goals are a restart-safe single-active lifecycle, a concise Live workflow, deterministic promised reward terms, atomic winner settlement, and an on-stream announcement that works on every supported overlay theme.

Non-goals are automatic completion, chat-command enrollment, candidate tracking, multiple active contracts, contract templates or history UI, external chat posting, predictions/voting, currencies, and a generic trigger/conditions/actions engine.

## Component / Process / IPC Boundaries

- `internal/store` owns contract records, the one-active invariant, reward snapshots, and settlement transactions in the existing SQLite database.
- `internal/api` owns validation/status mapping, four POST actions plus the current read, wire payload construction, logging, and post-commit leaderboard/alert publication.
- `web/admin` adds a fourth Live tab and uses existing award/viewer APIs for selectors; it never derives authority from browser state.
- `web/alert` recognizes `source: "contract"`; other `/ws` consumers ignore it.
- Headless and Wails builds use the same localhost HTTP/WebSocket boundary. No Wails binding, connector, config, filesystem, or OS integration changes.

## State and Event Flow

Opening validates text and loads the selected award under the store mutex. One transaction inserts an `active` contract with reward fields snapshotted, then the handler broadcasts a contract alert. Broadcast loss does not roll back persisted state; Repeat announcement is the explicit recovery.

Awarding locks the store, selects the requested active row, verifies a non-hidden canonical viewer, ensures the current session, captures leaderboard ranks, updates all three XP periods, appends an `award` interaction event with nullable `contract_id`, marks the contract `awarded`, and commits. The handler then emits the ordinary award alert from the snapshot and refreshes leaderboards/visibility using existing paths. No-result close only transitions `active` to `closed`. Reads return only the active row.

Catalog name and points are the promised terms and remain authoritative after edits/deletion. Presentation fields are also captured for deterministic replay; if a referenced file is later removed, the alert client's existing safe fallback applies rather than blocking settlement.

## Threading / Async / Cancellation

No runnable or timer is added. Store methods use the existing process-local mutex and a SQLite transaction, so concurrent close/award calls serialize and a conditional active-row update makes only one terminal transition succeed. Request cancellation may stop work before commit; after commit, the durable result is authoritative even if the client disconnects or a bounded WebSocket queue drops a frame. Admin loads use an abortable request and ignore stale responses when the tab/workspace or selected viewer changes.

## Security and Trust Boundaries

The API remains on the existing local trust boundary. Contract ids are opaque server ids; client-supplied reward/viewer ids are resolved server-side. Unicode code-point limits bound operator-authored title/objective data. JSON clients render both with `textContent`; neither text nor full chat bodies enter Info logs or interaction events. Snapshot media stays subject to generated-filename checks and alert fallback rules. No network request, connector credential, remote URL fetch, or new filesystem path is introduced.

## Decisions and Alternatives

1. **One durable active row, enforced by SQLite.** Use lifecycle values `active`, `awarded`, and `closed` plus a nullable unique `active_slot=1`. This survives restart and protects against multiple processes better than an in-memory flag. A config.json singleton was rejected because viewer/progression state already belongs in SQLite and settlement needs one transaction.
2. **Snapshot the catalog reward on open.** Name and points cannot change after the audience hears the promise; capturing alert fields also makes repeats deterministic. A live foreign-key-only reference was rejected because catalog edits/deletion would change or strand an active contract.
3. **Use canonical `viewer_id` for settlement.** The operator selects an existing Audience record, so merged cross-platform identities receive one result. Reusing `platform`/`user_id` would expose connector detail and could recreate a hidden merge source.
4. **Extend the existing alert envelope and queue.** Contract announcements are protected alongside awards, while winner settlement remains `source: "award"`. A new overlay URL or a generic interaction renderer would exceed the experiment.
5. **Keep lifecycle control HTTP-authoritative.** The admin reloads current state on tab entry and after conflicts. No new persistent WebSocket state snapshot is needed; announcement frames are ephemeral by design.
6. **Retain terminal rows without exposing history.** They provide idempotency and audit support at negligible local scale. The UI and public read endpoint expose only the active row.
7. **Use logs, not new diagnostics counters.** Lifecycle volume is low and has no silent streaming pipeline skip; existing WebSocket drop counters already cover announcement delivery pressure.

## Risks / Trade-offs

- An alert can be missed while OBS is disconnected; the active card's Repeat action is the bounded recovery and automatic replay is intentionally avoided.
- Snapshotting presentation duplicates award columns and can retain stale filenames; rendering falls back safely, while a future general asset collector may reclaim unreferenced files.
- Terminal rows grow slowly and have no UI; this is accepted for the experiment and can be revisited only with evidence.
- Two admin windows do not receive a dedicated close-without-result push; a stale action fails with 409 and reloads authoritative state.
- Long objectives can crowd small Browser Source rectangles despite the 280-code-point cap; theme smoke tests and wrapping/clamping are required.

## Migration / Rollout / Rollback

Add one Goose migration creating `viewer_contracts` and a nullable `contract_id` on `interaction_events`, including indexes and foreign keys that do not prevent award-catalog deletion. Fresh and upgraded stores run the same migration. Existing rows/config are untouched. The prior binary can ignore the additive table/column because its inserts name columns; rollback to that binary is operationally safe while leaving the new schema in place. A schema downgrade is backup-first and removes contract rows/provenance. Ship server, embedded web assets, and migration together; no packaging or installer change is needed.

## Open Questions

None block the experiment. Whether contracts deserve templates, history, automatic signals, or viewer participation must be decided from use after this bounded lifecycle ships, not added during implementation.
