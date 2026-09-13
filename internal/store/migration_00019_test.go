package store

import (
	"database/sql"
	"fmt"
	"path/filepath"
	"testing"

	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	_ "modernc.org/sqlite"
)

func seedMigration00019UnlockCatalog(t *testing.T, db *sql.DB) {
	_, err := db.Exec(`
		INSERT INTO viewers (id, message_count, xp, last_seen_at, hidden, created_at)
		VALUES ('viewer', 0, 0, '2026-09-12T09:00:00.000000000Z', 0, '2026-09-12T09:00:00.000000000Z');
		INSERT INTO achievement_definitions (id, name, description, enabled, secret, announce, active_revision, created_at, updated_at)
		VALUES ('ach', 'Achievement', '', 1, 0, 1, 1, '2026-09-12T09:00:00.000000000Z', '2026-09-12T09:00:00.000000000Z');
		INSERT INTO achievement_revisions (achievement_id, revision, metric, subject_id, subject_label, target, repeatable, created_at)
		VALUES ('ach', 1, 'message_count', NULL, '', 1, 0, '2026-09-12T09:00:00.000000000Z');`)
	require.NoError(t, err)
}

func TestMigration00019_WhenSessionIntervalsVary_ExpectConservativeAttributionAndReversibleSchema(t *testing.T) {
	cases := []struct {
		name        string
		seed        func(t *testing.T, db *sql.DB)
		assertUp    func(t *testing.T, db *sql.DB)
		countTables map[string]int
	}{
		{
			name: "empty_database",
			seed: func(t *testing.T, db *sql.DB) {},
			assertUp: func(t *testing.T, db *sql.DB) {
				assert.True(t, sqliteTableExists(t, db, "stream_recaps"))
				assertMigration00019Indexes(t, db)
			},
			countTables: map[string]int{
				"stream_sessions": 0, "interaction_events": 0, "viewer_achievement_unlocks": 0,
			},
		},
		{
			name: "current_only_session",
			seed: func(t *testing.T, db *sql.DB) {
				seedMigration00019UnlockCatalog(t, db)
				_, err := db.Exec(`
					INSERT INTO stream_sessions (id, started_at, ended_at) VALUES ('open', '2026-09-12T10:00:00.000000000Z', NULL);
					INSERT INTO interaction_events (id, kind, points, created_at) VALUES ('evt_open', 'activity', 1, '2026-09-12T11:00:00.000000000Z');
					INSERT INTO viewer_achievement_unlocks (id, viewer_id, achievement_id, revision, occurrence, progress_value, name, description, backfilled, unlocked_at)
					VALUES ('unlock_live', 'viewer', 'ach', 1, 1, 1, 'A', '', 0, '2026-09-12T11:00:00.000000000Z');`)
				require.NoError(t, err)
			},
			assertUp: func(t *testing.T, db *sql.DB) {
				var eventSession, unlockSession sql.NullString
				require.NoError(t, db.QueryRow(`SELECT session_id FROM interaction_events WHERE id = 'evt_open'`).Scan(&eventSession))
				require.NoError(t, db.QueryRow(`SELECT session_id FROM viewer_achievement_unlocks WHERE id = 'unlock_live'`).Scan(&unlockSession))
				assert.Equal(t, "open", eventSession.String)
				assert.Equal(t, "open", unlockSession.String)
			},
			countTables: map[string]int{
				"stream_sessions": 1, "interaction_events": 1, "viewer_achievement_unlocks": 1,
			},
		},
		{
			name: "exact_start_boundary_included",
			seed: func(t *testing.T, db *sql.DB) {
				_, err := db.Exec(`
					INSERT INTO stream_sessions (id, started_at, ended_at) VALUES
						('closed', '2026-09-12T10:00:00.000000000Z', '2026-09-12T12:00:00.000000000Z'),
						('open', '2026-09-12T12:00:00.000000000Z', NULL);
					INSERT INTO interaction_events (id, kind, points, created_at) VALUES ('evt_start', 'activity', 1, '2026-09-12T12:00:00.000000000Z');`)
				require.NoError(t, err)
			},
			assertUp: func(t *testing.T, db *sql.DB) {
				var sessionID sql.NullString
				require.NoError(t, db.QueryRow(`SELECT session_id FROM interaction_events WHERE id = 'evt_start'`).Scan(&sessionID))
				assert.Equal(t, "open", sessionID.String)
			},
			countTables: map[string]int{
				"stream_sessions": 2, "interaction_events": 1,
			},
		},
		{
			name: "exclusive_end_boundary_not_attributed",
			seed: func(t *testing.T, db *sql.DB) {
				_, err := db.Exec(`
					INSERT INTO stream_sessions (id, started_at, ended_at) VALUES
						('closed', '2026-09-12T10:00:00.000000000Z', '2026-09-12T12:00:00.000000000Z'),
						('open', '2026-09-12T12:00:00.000000000Z', NULL);
					INSERT INTO interaction_events (id, kind, points, created_at) VALUES
						('evt_open_start', 'activity', 1, '2026-09-12T12:00:00.000000000Z'),
						('evt_closed_end', 'activity', 1, '2026-09-12T11:59:59.999999999Z');`)
				require.NoError(t, err)
			},
			assertUp: func(t *testing.T, db *sql.DB) {
				var openStart, closedEnd sql.NullString
				require.NoError(t, db.QueryRow(`SELECT session_id FROM interaction_events WHERE id = 'evt_open_start'`).Scan(&openStart))
				require.NoError(t, db.QueryRow(`SELECT session_id FROM interaction_events WHERE id = 'evt_closed_end'`).Scan(&closedEnd))
				assert.Equal(t, "open", openStart.String)
				assert.Equal(t, "closed", closedEnd.String)
			},
			countTables: map[string]int{
				"stream_sessions": 2, "interaction_events": 2,
			},
		},
		{
			name: "gapped_timestamp_remains_null",
			seed: func(t *testing.T, db *sql.DB) {
				_, err := db.Exec(`
					INSERT INTO stream_sessions (id, started_at, ended_at) VALUES
						('first', '2026-09-12T10:00:00.000000000Z', '2026-09-12T11:00:00.000000000Z'),
						('second', '2026-09-12T12:00:00.000000000Z', NULL);
					INSERT INTO interaction_events (id, kind, points, created_at) VALUES ('evt_gap', 'activity', 1, '2026-09-12T11:30:00.000000000Z');`)
				require.NoError(t, err)
			},
			assertUp: func(t *testing.T, db *sql.DB) {
				var sessionID sql.NullString
				require.NoError(t, db.QueryRow(`SELECT session_id FROM interaction_events WHERE id = 'evt_gap'`).Scan(&sessionID))
				assert.False(t, sessionID.Valid)
			},
			countTables: map[string]int{
				"stream_sessions": 2, "interaction_events": 1,
			},
		},
		{
			name: "overlapping_intervals_remain_null",
			seed: func(t *testing.T, db *sql.DB) {
				_, err := db.Exec(`
					INSERT INTO stream_sessions (id, started_at, ended_at) VALUES
						('overlap_a', '2026-09-12T10:00:00.000000000Z', '2026-09-12T13:00:00.000000000Z'),
						('overlap_b', '2026-09-12T11:00:00.000000000Z', '2026-09-12T14:00:00.000000000Z');
					INSERT INTO interaction_events (id, kind, points, created_at) VALUES ('evt_overlap', 'activity', 1, '2026-09-12T12:00:00.000000000Z');`)
				require.NoError(t, err)
			},
			assertUp: func(t *testing.T, db *sql.DB) {
				var sessionID sql.NullString
				require.NoError(t, db.QueryRow(`SELECT session_id FROM interaction_events WHERE id = 'evt_overlap'`).Scan(&sessionID))
				assert.False(t, sessionID.Valid)
			},
			countTables: map[string]int{
				"stream_sessions": 2, "interaction_events": 1,
			},
		},
		{
			name: "multiple_open_rows_remain_null",
			seed: func(t *testing.T, db *sql.DB) {
				_, err := db.Exec(`
					INSERT INTO stream_sessions (id, started_at, ended_at) VALUES
						('open_a', '2026-09-12T10:00:00.000000000Z', NULL),
						('open_b', '2026-09-12T11:00:00.000000000Z', NULL);
					INSERT INTO interaction_events (id, kind, points, created_at) VALUES ('evt_ambiguous', 'activity', 1, '2026-09-12T12:00:00.000000000Z');`)
				require.NoError(t, err)
			},
			assertUp: func(t *testing.T, db *sql.DB) {
				var sessionID sql.NullString
				require.NoError(t, db.QueryRow(`SELECT session_id FROM interaction_events WHERE id = 'evt_ambiguous'`).Scan(&sessionID))
				assert.False(t, sessionID.Valid)
			},
			countTables: map[string]int{
				"stream_sessions": 2, "interaction_events": 1,
			},
		},
		{
			name: "backfilled_unlock_remains_null",
			seed: func(t *testing.T, db *sql.DB) {
				seedMigration00019UnlockCatalog(t, db)
				_, err := db.Exec(`
					INSERT INTO stream_sessions (id, started_at, ended_at) VALUES ('open', '2026-09-12T10:00:00.000000000Z', NULL);
					INSERT INTO viewer_achievement_unlocks (id, viewer_id, achievement_id, revision, occurrence, progress_value, name, description, backfilled, unlocked_at)
					VALUES ('unlock_backfilled', 'viewer', 'ach', 1, 1, 1, 'A', '', 1, '2026-09-12T11:00:00.000000000Z');`)
				require.NoError(t, err)
			},
			assertUp: func(t *testing.T, db *sql.DB) {
				var sessionID sql.NullString
				require.NoError(t, db.QueryRow(`SELECT session_id FROM viewer_achievement_unlocks WHERE id = 'unlock_backfilled'`).Scan(&sessionID))
				assert.False(t, sessionID.Valid)
			},
			countTables: map[string]int{
				"stream_sessions": 1, "viewer_achievement_unlocks": 1,
			},
		},
		{
			name: "non_backfilled_unlock_attributed",
			seed: func(t *testing.T, db *sql.DB) {
				seedMigration00019UnlockCatalog(t, db)
				_, err := db.Exec(`
					INSERT INTO stream_sessions (id, started_at, ended_at) VALUES
						('closed', '2026-09-12T10:00:00.000000000Z', '2026-09-12T12:00:00.000000000Z'),
						('open', '2026-09-12T12:00:00.000000000Z', NULL);
					INSERT INTO viewer_achievement_unlocks (id, viewer_id, achievement_id, revision, occurrence, progress_value, name, description, backfilled, unlocked_at)
					VALUES ('unlock_closed', 'viewer', 'ach', 1, 1, 1, 'A', '', 0, '2026-09-12T11:00:00.000000000Z');`)
				require.NoError(t, err)
			},
			assertUp: func(t *testing.T, db *sql.DB) {
				var sessionID sql.NullString
				require.NoError(t, db.QueryRow(`SELECT session_id FROM viewer_achievement_unlocks WHERE id = 'unlock_closed'`).Scan(&sessionID))
				assert.Equal(t, "closed", sessionID.String)
			},
			countTables: map[string]int{
				"stream_sessions": 2, "viewer_achievement_unlocks": 1,
			},
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "comm-relay.db")
			db, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
			require.NoError(t, err)
			db.SetMaxOpenConns(1)
			t.Cleanup(func() { require.NoError(t, db.Close()) })
			goose.SetBaseFS(embedMigrations)
			require.NoError(t, goose.SetDialect("sqlite3"))
			require.NoError(t, goose.UpTo(db, "migrations", 18))

			beforeCounts := map[string]int{}
			for table := range tc.countTables {
				var count int
				require.NoError(t, db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM %s`, table)).Scan(&count))
				beforeCounts[table] = count
			}

			tc.seed(t, db)
			for table := range tc.countTables {
				var count int
				require.NoError(t, db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM %s`, table)).Scan(&count))
				assert.GreaterOrEqual(t, count, beforeCounts[table])
			}

			require.NoError(t, goose.UpTo(db, "migrations", 19))
			tc.assertUp(t, db)
			assertMigration00019Integrity(t, db)

			for table, expected := range tc.countTables {
				var count int
				require.NoError(t, db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM %s`, table)).Scan(&count))
				assert.Equal(t, expected, count, table)
			}

			require.NoError(t, goose.DownTo(db, "migrations", 18))
			assert.False(t, sqliteTableExists(t, db, "stream_recaps"))
			for table := range tc.countTables {
				var count int
				require.NoError(t, db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM %s`, table)).Scan(&count))
				assert.Equal(t, tc.countTables[table], count, table)
			}

			require.NoError(t, goose.UpTo(db, "migrations", 19))
			assertMigration00019Integrity(t, db)
		})
	}
}

func TestMigration00019_WhenRecapConstraintsApplied_ExpectUniqueSessionAndValidJSON(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 18))
	_, err = db.Exec(`INSERT INTO stream_sessions (id, started_at, ended_at) VALUES ('session', '2026-09-12T10:00:00.000000000Z', NULL)`)
	require.NoError(t, err)
	require.NoError(t, goose.UpTo(db, "migrations", 19))

	_, err = db.Exec(`INSERT INTO stream_recaps (id, session_id, schema_version, payload_json, captured_at, created_at)
		VALUES ('recap', 'session', 1, '{"version":1}', '2026-09-12T12:00:00.000000000Z', '2026-09-12T12:00:00.000000000Z')`)
	require.NoError(t, err)

	_, err = db.Exec(`INSERT INTO stream_recaps (id, session_id, schema_version, payload_json, captured_at, created_at)
		VALUES ('recap_dup', 'session', 1, '{"version":1}', '2026-09-12T12:00:00.000000000Z', '2026-09-12T12:00:00.000000000Z')`)
	require.Error(t, err)

	_, err = db.Exec(`INSERT INTO stream_recaps (id, session_id, schema_version, payload_json, captured_at, created_at)
		VALUES ('recap_bad', 'session', 1, 'not-json', '2026-09-12T12:00:00.000000000Z', '2026-09-12T12:00:00.000000000Z')`)
	require.Error(t, err)
}

func assertMigration00019Indexes(t *testing.T, db *sql.DB) {
	t.Helper()
	for _, index := range []string{
		"idx_interaction_events_session_created",
		"idx_viewer_achievement_unlocks_session_unlocked",
		"idx_stream_sessions_started",
	} {
		var name string
		err := db.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?`, index).Scan(&name)
		require.NoError(t, err)
		assert.Equal(t, index, name)
	}
}

func assertMigration00019Integrity(t *testing.T, db *sql.DB) {
	t.Helper()
	assert.True(t, sqliteTableExists(t, db, "stream_recaps"))
	assertMigration00019Indexes(t, db)
	foreignKeys, err := db.Query(`PRAGMA foreign_key_check`)
	require.NoError(t, err)
	defer func() { require.NoError(t, foreignKeys.Close()) }()
	assert.False(t, foreignKeys.Next(), "foreign keys must be valid after migration 00019")
}
