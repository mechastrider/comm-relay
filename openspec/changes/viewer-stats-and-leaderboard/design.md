## Context

See `proposal.md` for why. Today persistence is `config.json` plus an in-memory ring of 100 chat lines (`MessageHistory`). Admin `/` is a cockpit: live monitor plus settings dialogs. Overlay static files live under `web/overlay/` at `/overlay`. The neighboring KnowledgeDB app uses `modernc.org/sqlite` with hand-rolled `schema_meta` version bumps; CommRelay will keep the driver and WAL pragmas but not that migrator.

Config keys for this change stay in JSON: `points_per_message`, `day_reset_hour`. Viewer rows never go in JSON.

## Goals / Non-Goals

**Goals:**

- Fail closed on store open/migrate so HTTP never serves a half-ready schema.
- One writer path for ingest, merge, and new-session so SQLite stays simple.
- Grow the cockpit canvas for people work without replacing the visual language or moving settings out of dialogs.
- Serve leaderboard as a first-class Browser Source next to chat, not a theme of `/overlay`.

**Non-Goals:**

- Generic chat-event → action engine, commands, `/overlay/alert`.
- Moving `config.json` into SQLite or adding a required migrate CLI for operators.
- Full chat archive, unmerge UI, auto-merge, cloud sync.
- React/SPA rewrite or a new visual design system.

## Decisions

### 1. Goose on start with `modernc.org/sqlite`

**Choice:** `pressly/goose/v3` SQL files embedded in `internal/store/migrations`, `goose.SetDialect("sqlite3")`, `sql.Open("sqlite", path)` (modernc). Run `Up` in `bootstrap.New` before the HTTP server starts. First migration creates the full 6a schema (not an empty stub).

**Why:** KnowledgeDB’s Go `migrateToV2` + `CREATE IF NOT EXISTS` is the pattern to avoid. Goose is the migrator from day one. Pure Go keeps the Windows-friendly single binary. Dialect name `sqlite3` vs driver name `sqlite` is expected.

**Alternatives:** Hand-rolled version table (rejected). `mattn/go-sqlite3` (CGO, rejected). Separate operator `migrate` command (optional later; desktop/server must self-migrate).

### 2. Database path

**Choice:** `comm-relay.db` in `filepath.Dir(configPath)` (same rule as logs). Tests use temp dirs.

**Why:** One folder to back up; matches desktop `%AppData%\comm-relay\` and server `-config`.

### 3. Connection and writer

**Choice:** WAL, `foreign_keys=ON`, busy timeout. Store methods serialize with a mutex (ingest runnable + HTTP merge/session). Do not share the bus subscriber’s writes with unlocked handler goroutines.

**Why:** Chat bursts plus admin merge on one file. SQLite wants a single logical writer.

**Alternatives:** `SetMaxOpenConns(1)` only (weaker than an explicit store mutex for transactions).

### 4. Data model

**Choice:** Canonical `viewers` (UUID, optional display-name override, all-time `message_count`/`score`, `last_seen_at`). `viewer_identities` unique on `(platform, user_id)`. `stream_sessions` with one open row (`ended_at` null). `viewer_session_stats` and `viewer_day_stats` keyed by session or `day_key` (`YYYY-MM-DD`). `viewer_merges` audit (`from_id`, `into_id`, timestamp). Hidden merge sources are omitted from list/leaderboard (keep row for audit FK).

**Day key:** In the operator local zone, if `now` is before today’s `day_reset_hour:00`, use yesterday’s date; otherwise today’s date. Session and day increment in the same ingest transaction.

**Merge:** Transaction: re-point identities, sum counters into target (all-time + current session row + current day row), insert audit, mark source hidden.

**Empty `user_id`:** skip store writes.

### 5. Ingest path

**Choice:** A runnable like `message-history` subscribed to `ChatMessageReceived`. Read `points_per_message` from the config store per event (or on config update). Coalesce leaderboard WebSocket publishes (short debounce, e.g. 100–250 ms) with `session`, `day`, and `all` snapshots so a burst does not emit one frame per line × three periods.

**Why:** Matches existing bus isolation. Specs require live leaderboard without stalling chat.

**Alternatives:** Increment inside each connector (rejected: duplicates and bypasses unified model). Generic action engine (out of scope).

### 6. HTTP surface

**Choice:** `GET /api/viewers`, `GET /api/viewers/get?id=`, `POST /api/viewers/merge`, `POST /api/viewers/update`, `POST /api/sessions/start`, `GET /api/leaderboard?period=`. Identifiers in query or JSON body only.

**Leaderboard static:** `web/leaderboard/` (sibling of overlay/dock). Register `/overlay/leaderboard` and `/overlay/leaderboard/` **before** the `/overlay/` file server so chat assets stay isolated.

### 7. Admin IA

**Choice:** Tabs on the existing main canvas: Monitor (current message list) vs Viewers (search + list + card + merge picker). New stream in the top bar with a confirm dialog. `points_per_message` and `day_reset_hour` in Interface. OBS Setup: third Browser Source card with period select + copy URL (`?period=`). Keep cockpit CSS, dialogs, and dock.

**Why:** Merge is a workspace; a settings `<dialog>` is too small (1100×760 desktop). Full re-nav is unnecessary for 6a.

**Alternatives:** Viewers-only dialog (rejected). Multi-page app (rejected).

### 8. Leaderboard UI

**Choice:** One transparent HUD list (cockpit tokens), no preset/theme matrix. Sort `score` desc, then `message_count`. Ignore unknown `/ws` types in chat overlay (already true); leaderboard page handles `leaderboard` and ignores `message`.

## Risks / Trade-offs

- **[Risk] Chat burst + three leaderboard payloads** → Debounce coalesced snapshots; cap entry count (e.g. top 20) on the wire and overlay.
- **[Risk] Goose/modernc mismatch** → Integration test: open temp DB, Up, ingest, query.
- **[Risk] Mux `/overlay/` swallows `/overlay/leaderboard`** → Register the more specific path first; handler test for both URLs.
- **[Risk] Accidental New stream** → Confirm UI; session-only reset.
- **[Risk] Hidden merge source ids in bookmarks** → `GET /api/viewers/get` returns 404 for hidden sources.
- **[Trade-off] No unmerge** → Audit table only; restoring identities later is a new change.

## Migration Plan

- New file `comm-relay.db`; no conversion of existing JSON.
- First Goose version is additive. Never edit applied SQL.
- Rollback: restore previous binary and delete or rename `comm-relay.db` (stats lost) or keep the file unused by old builds.
- README: mention the SQLite file next to config when this ships; CHANGELOG under Unreleased for streamer-visible behavior.

## Open Questions

None that block specs or tasks. Overlay entry cap (top N) can stay an implementation constant (20) unless operators later need a config key.
