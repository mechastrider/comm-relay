## Context

CommRelay already has canonical viewers, an editable award catalog, atomic award XP/event writes, reward history, leaderboard publication, and a priority alert queue. The experiment should compose those pieces rather than introduce viewer participation automation or a second progression model. The only new durable domain state is the operator's current contract and its terminal result.

## Goals / Non-Goals

Goals are a restart-safe single-active lifecycle, a concise Live workflow, deterministic promised reward terms, atomic winner settlement, and an on-stream announcement that works on every supported overlay theme.

Non-goals are automatic completion, chat-command enrollment, candidate tracking, multiple active contracts, contract templates or history UI, external chat posting, predictions/voting, currencies, and a generic trigger/conditions/actions engine.

## Component / Process / IPC Boundaries

- `internal/store` owns contract records, the one-active invariant, reward snapshots, and settlement transactions in the existing SQLite database.
- `internal/api` owns validation/status mapping, five POST actions plus the current read, process-local presentation state, wire payload construction, logging, and post-commit leaderboard/alert publication.
- `web/admin` adds a fourth Live tab and uses existing award/viewer APIs for selectors; it never derives authority from browser state.
- `web/alert` recognizes `source: "contract"`; `web/leaderboard` and `web/dock` consume the separate authoritative `viewer_contract_state` frame while other `/ws` consumers ignore it.
- Headless and Wails builds use the same localhost HTTP/WebSocket boundary. No Wails binding, connector, config, filesystem, or OS integration changes.

## State and Event Flow

Opening validates text and loads the selected award under the store mutex. One transaction inserts an `active` contract with reward fields snapshotted, then the handler resets process-local presentation to `contract`/visible, broadcasts its state, and broadcasts a contract alert. Broadcast loss does not roll back persisted state; reconnect restores the persistent card while Repeat announcement remains the explicit recovery for the brief splash.

The presentation controller stores only `content` and `visible` for the current contract id. On startup it reads the durable active contract and defaults to `contract`/visible. A display action verifies the active id before changing the process-local state. New WebSocket clients receive a snapshot. The leaderboard client keeps the latest ranking in memory, renders either ranking or a compact contract card in the same themed root, and ignores ordinary leaderboard visibility while the contract presentation is active. Settlement broadcasts an inactive contract state; the untouched ordinary leaderboard visibility controller then governs the surface again.

Awarding locks the store, selects the requested active row, verifies a non-hidden canonical viewer, ensures the current session, captures leaderboard ranks, updates all three XP periods, appends an `award` interaction event with nullable `contract_id`, marks the contract `awarded`, and commits. The handler then clears and broadcasts contract presentation, emits the ordinary award alert from the snapshot, and refreshes leaderboards/visibility using existing paths. No-result close transitions `active` to `closed` and also clears presentation. Reads return only the active row.

Catalog name and points are the promised terms and remain authoritative after edits/deletion. Presentation fields are also captured for deterministic replay; if a referenced file is later removed, the alert client's existing safe fallback applies rather than blocking settlement.

## Threading / Async / Cancellation

No runnable or timer is added. Store methods use the existing process-local mutex and a SQLite transaction, while presentation state uses its own mutex and revalidates the durable active id through the handler. Concurrent close/award calls serialize and a conditional active-row update makes only one terminal transition succeed. Request cancellation may stop work before commit; after commit, the durable result is authoritative even if the client disconnects or a bounded WebSocket queue drops a frame. Admin and dock loads ignore stale responses.

## Security and Trust Boundaries

The API remains on the existing local trust boundary. Contract ids are opaque server ids; client-supplied reward/viewer ids are resolved server-side. Unicode code-point limits bound operator-authored title/objective data. JSON clients render both with `textContent`; neither text nor full chat bodies enter Info logs or interaction events. Snapshot media stays subject to generated-filename checks and alert fallback rules. No network request, connector credential, remote URL fetch, or new filesystem path is introduced.

## Decisions and Alternatives

1. **One durable active row, enforced by SQLite.** Use lifecycle values `active`, `awarded`, and `closed` plus a nullable unique `active_slot=1`. This survives restart and protects against multiple processes better than an in-memory flag. A config.json singleton was rejected because viewer/progression state already belongs in SQLite and settlement needs one transaction.
2. **Snapshot the catalog reward on open.** Name and points cannot change after the audience hears the promise; capturing alert fields also makes repeats deterministic. A live foreign-key-only reference was rejected because catalog edits/deletion would change or strand an active contract.
3. **Use canonical `viewer_id` for settlement.** The operator selects an existing Audience record, so merged cross-platform identities receive one result. Reusing `platform`/`user_id` would expose connector detail and could recreate a hidden merge source.
4. **Reuse both existing OBS surfaces.** The large alert remains brief and protected alongside awards; the small leaderboard surface carries the persistent objective by replacing its content. A third Browser Source would increase layout collisions and operator setup.
5. **Keep presentation control server-authoritative but process-local.** A dedicated `viewer_contract_state` snapshot converges the dock and leaderboard after reconnect. Content/visibility overrides are not durable preferences: restart deliberately returns an active contract to the safest visible-objective default.
6. **Retain terminal rows without exposing history.** They provide idempotency and audit support at negligible local scale. The UI and public read endpoint expose only the active row.
7. **Do not rewrite leaderboard visibility policy.** Contract presentation temporarily owns the shared surface. When inactive, existing automatic/on-request/always state and runtime behavior resume exactly as they were.
8. **Use logs, not new diagnostics counters.** Lifecycle volume is low and has no silent streaming pipeline skip; existing WebSocket drop counters already cover announcement and state delivery pressure.

## Risks / Trade-offs

- An alert can be missed while OBS is disconnected; reconnect restores the persistent card but the brief alert is intentionally replayed only by the operator.
- Snapshotting presentation duplicates award columns and can retain stale filenames; rendering falls back safely, while a future general asset collector may reclaim unreferenced files.
- Terminal rows grow slowly and have no UI; this is accepted for the experiment and can be revisited only with evidence.
- A display override is lost on process restart by design; this prevents an active objective from remaining accidentally hidden after recovery.
- Long objectives can crowd small Browser Source rectangles despite the 280-code-point cap; theme smoke tests and wrapping/clamping are required.

## Migration / Rollout / Rollback

Add one Goose migration creating `viewer_contracts` and a nullable `contract_id` on `interaction_events`, including indexes and foreign keys that do not prevent award-catalog deletion. Fresh and upgraded stores run the same migration. Existing rows/config are untouched. The prior binary can ignore the additive table/column because its inserts name columns; rollback to that binary is operationally safe while leaving the new schema in place. A schema downgrade is backup-first and removes contract rows/provenance. Ship server, embedded web assets, and migration together; no packaging or installer change is needed.

## Open Questions

None block the experiment. Whether contracts deserve templates, history, automatic signals, or viewer participation must be decided from use after this bounded lifecycle ships, not added during implementation.
