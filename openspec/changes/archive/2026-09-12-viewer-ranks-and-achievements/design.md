## Context

CommRelay already has canonical viewers, per-session/day/all-time stats, immutable interaction events for awards and contracts, command execution, one SQLite file, and a shared alert overlay. Awards are explicit operator recognition and the only existing manual XP source; Greetings recently established fixed Audience catalog editing and an overlay-debug preview audience. Progression must reuse those facts and patterns without becoming a second reward economy or replaying historical celebrations on startup.

The current viewer merge path sums only the current session/day rows while reassigning broader history. Progression makes that mismatch observable through stream-participation achievements, so complete historical merge behavior is part of this change.

## Goals / Non-Goals

Goals:

- derive stable viewer titles from all-time XP;
- configure bounded, explainable achievements over durable facts;
- preserve historical unlock meaning across rule edits and merges;
- publish at most one progression celebration for one live cause;
- make upgrade/backfill safe, idempotent, local, and silent;
- reuse the existing admin, debug preview, WebSocket, and alert surfaces.

Non-goals:

- Credits, purchases, redemptions, or rewards granted by achievements;
- automatic award grants, chat badges, streaks, or final-leaderboard MVP logic;
- per-achievement uploaded media or a separate OBS source;
- changing repeated-award policy tracked separately by OQ-005.

## Component / Process / IPC Boundaries

- `internal/store` owns progression tables, rule validation that depends on stored catalogs, aggregate metric queries, reconciliation, unlock uniqueness, and atomic merge consolidation.
- A progression application service coordinates fact-producing operations with store evaluation and returns a post-commit result bundle. Connectors remain unaware of levels or achievements.
- `internal/api` exposes bounded reads, POST-action mutations, and debug-only preview. The admin never computes authoritative progress.
- The existing bus/hub publishes one `viewer_progression` production frame from a committed result bundle. Existing clients may ignore it.
- `web/admin` owns catalog drafts and presentation. `web/alert` renders production/debug frames. `web/leaderboard` only renders the supplied level summary.
- Level-title visibility stays in each overlay preset in `config.json`; progression catalogs and global progression-alert presentation stay in SQLite beside other viewer data.

## State and Event Flow

1. A stable viewer action commits its existing durable fact: counted message/session stat, XP/award event, successful command event, or contract completion.
2. In the same serialized SQLite write transaction, the progression evaluator reads only metrics affected by that cause, compares old/new level, inserts missing unlock occurrences with uniqueness constraints, and returns snapshots eligible for a live announcement.
3. After commit, the caller publishes any source alert first, then one aggregate progression frame, then the usual leaderboard/viewer refreshes. No frame is published on rollback.
4. The admin refreshes an open viewer row/card from the progression frame; the alert overlay queues one combined splash.

Stream participation means a distinct stream session in which the canonical viewer has at least one counted message. Award and command metrics use stable catalog ids. A successful command event records its immutable command id as well as its historical trigger; command progress counts the id, never a mutable trigger. Upgrade backfill adopts a legacy event only when its saved trigger still resolves uniquely to a current command id; unresolved or deleted-command events remain durable history but are not counted by the id-based metric. Deleted subjects retain their saved label and historical count but cannot receive new facts. Contract wins count successfully completed contracts attributed to the viewer.

Catalog initialization uses a progression-specific bootstrap marker and a persisted pending locale. Schema migration creates empty structures; a cancellable reconciliation worker seeds/adopts definitions and scans viewers in bounded batches after startup. Rule revisions enqueue the same idempotent worker. Status is readable by the admin. Reconciliation inserts `backfilled` unlocks and never returns production events.

## Threading / Async / Cancellation

Normal live evaluation runs within the store's existing serialized write boundary so two simultaneous causes cannot duplicate an occurrence. Publication is post-commit and uses bounded hub queues; a slow OBS client cannot block storage.

Backfill/reconciliation processes deterministic viewer-id batches, checkpoints its requested revision, yields between batches, and obeys process cancellation. Restart resumes safely from uniqueness constraints and recorded state. A newer rule edit supersedes pending work for an older active revision without deleting its already recorded history.

## Security and Trust Boundaries

All APIs remain on the existing local HTTP boundary. Strings have Unicode-code-point limits; numeric targets, catalog counts, and presentation fields are bounded. Metric and subject ids are allowlisted. Preview accepts complete drafts but sends them only to the existing debug audience and performs no durable mutations. Wire text is rendered with text nodes, never HTML. Responses and logs omit filesystem paths, secrets, raw message text, and hidden achievement details.

## Decisions and Alternatives

### Decision: Awards grant XP; achievements only recognize facts

Achievements do not grant XP. This prevents feedback loops (`XP -> achievement -> XP`) and keeps operator awards distinct from computed milestones. Award repetition remains legal and every successful grant contributes to the selected award metric.

### Decision: Levels are derived, not stored per viewer

The current level is the highest configured threshold not exceeding all-time XP. This avoids stale denormalized state. Live level alerts compare the title immediately before and after the committed cause; edits, backfill, and merges are silent.

### Decision: Conditions use typed metrics, not an expression language

The first version supports six indexed metrics with an optional award/command subject and one positive target. An expression language was rejected because it complicates validation, explainability, query cost, migration, and UI accessibility.

### Decision: Command progress keys historical events by stable command id

Successful command events persist the selected command's stable id at execution time, while retaining the trigger as a historical display snapshot. An additive migration backfills only unambiguous legacy rows by matching their saved trigger to a currently existing command. Events that cannot be mapped safely remain visible in the journal but do not satisfy an id-based achievement. Treating triggers as subjects was rejected because renaming a command would silently split or redirect viewer progress.

### Decision: Condition edits create immutable revisions

Metric, subject, target, and repeat mode create a new revision; presentation and delivery flags do not. Unlocks snapshot revision and display text. Rewriting old unlocks in place was rejected because it makes prior recognition change meaning.

### Decision: One-time and linear repeatable achievements

Repeatable occurrences unlock at integer multiples of the target. Custom threshold sequences are deferred; linear rules are predictable and can be expressed compactly in the editor.

### Decision: Aggregate notifications by causal operation

One award may cross a level and several achievement thresholds. A single progression frame/card avoids queue floods while preserving all recognition. The source award/contract alert remains first so the on-stream story is causal.

### Decision: Shared progression media settings

Global settings control achievement/level toggles, layout, built-in sound/silence, volume, and duration. Per-definition `announce` remains available, but uploaded per-achievement media is deferred to avoid duplicating the command/award media editor and asset-reference lifecycle.

### Decision: Seed editable examples on upgrades as well as fresh installs

Progression has no legacy user-owned catalog, so all installations receive the same stable ids and thresholds once, localized using the persisted initialization locale. After insertion they are ordinary deletable/editable data. `MVP` is omitted because CommRelay has no authoritative end-of-stream final-ranking fact; `Contractor` provides a currently measurable replacement.

## Risks / Trade-offs

- Backfill cost grows with viewer and event history. Indexed aggregates, bounded batches, status reporting, and idempotent checkpoints limit startup and UI impact.
- Rule revisions can create multiple historical unlock versions. History fidelity is preferred; the viewer UI groups by definition and labels repeat counts rather than exposing storage rows by default.
- Threshold edits can immediately change displayed titles without a celebration. This is intentional to prevent administrative alert floods.
- Adding titles increases leaderboard row height. They default off and are the first optional element removed by responsive fitting.
- Complete historical merges touch more rows and increase transaction duration. The operation remains explicit, atomic, and audited.

## Migration / Rollout / Rollback

Additive SQLite migrations create catalogs, revisions, unlocks, alert settings, reconciliation state, and the viewer opt-out field. A follow-up additive migration adds nullable `command_id` to interaction events and safely backfills only rows whose historical trigger resolves to a current command. A separate bootstrap phase inserts locale-aware seeds once and schedules silent reconciliation. No migration rewrites or deletes unresolved historical interaction rows.

`show_viewer_titles` is an optional preset field resolving false, so old config files and pinned overlay URLs retain their appearance. Older binaries ignore additive SQLite tables and the unknown optional config field; they cannot display progression but retain the underlying viewer history. Rollback does not delete progression data. A later forward upgrade resumes reconciliation idempotently.

## Open Questions

None block implementation. Streak achievements and final-session MVP remain explicit future design work because their boundary semantics are not yet canonical.
