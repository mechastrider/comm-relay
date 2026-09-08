package store

import (
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	_ "modernc.org/sqlite"
)

func TestMigration00014_WhenVersion13Database_ExpectCanonicalRewardHistory(t *testing.T) {
	// Arrange
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	db.SetMaxOpenConns(1)
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 13))
	_, err = db.Exec(`
		INSERT INTO viewers (id, last_seen_at, created_at) VALUES ('viewer', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
		UPDATE award_types SET name = 'Renamed Advice' WHERE id = 'advice';
		INSERT INTO interaction_events (id, kind, viewer_id, award_id, points, created_at) VALUES
			('award-exact', 'award', 'viewer', 'advice', 50, '2026-01-01T12:00:00Z'),
			('award-one', 'award', 'viewer', 'deleted-award', 10, '2026-01-01T12:00:00.1Z'),
			('award-nine', 'award', 'viewer', 'joke', 10, '2026-01-01T12:00:00.123456789Z'),
			('command', 'command', 'viewer', NULL, 0, '2026-01-01T12:00:00.12Z'),
			('activity', 'activity', 'viewer', NULL, 5, '2026-01-01T12:00:00.1234Z');`)
	require.NoError(t, err)

	// Act
	require.NoError(t, goose.UpTo(db, "migrations", 14))

	// Assert
	rows, err := db.Query(`SELECT id, reward_name, created_at FROM interaction_events ORDER BY id`)
	require.NoError(t, err)
	defer func() { require.NoError(t, rows.Close()) }()
	gotNames := map[string]sql.NullString{}
	gotTimes := map[string]string{}
	for rows.Next() {
		var id, createdAt string
		var rewardName sql.NullString
		require.NoError(t, rows.Scan(&id, &rewardName, &createdAt))
		gotNames[id] = rewardName
		gotTimes[id] = createdAt
	}
	require.NoError(t, rows.Err())
	assert.Equal(t, "Renamed Advice", gotNames["award-exact"].String)
	assert.Equal(t, "deleted-award", gotNames["award-one"].String)
	assert.False(t, gotNames["command"].Valid)
	assert.False(t, gotNames["activity"].Valid)
	assert.Equal(t, "2026-01-01T12:00:00.000000000Z", gotTimes["award-exact"])
	assert.Equal(t, "2026-01-01T12:00:00.100000000Z", gotTimes["award-one"])
	assert.Equal(t, "2026-01-01T12:00:00.123456789Z", gotTimes["award-nine"])
	assert.Equal(t, "2026-01-01T12:00:00.120000000Z", gotTimes["command"])
	assert.Equal(t, "2026-01-01T12:00:00.123400000Z", gotTimes["activity"])
	originalTimes := map[string]string{
		"award-exact": "2026-01-01T12:00:00Z",
		"award-one":   "2026-01-01T12:00:00.1Z",
		"award-nine":  "2026-01-01T12:00:00.123456789Z",
		"command":     "2026-01-01T12:00:00.12Z",
		"activity":    "2026-01-01T12:00:00.1234Z",
	}
	for id, raw := range gotTimes {
		parsed, parseErr := time.Parse(time.RFC3339Nano, raw)
		require.NoError(t, parseErr)
		original, originalErr := time.Parse(time.RFC3339Nano, originalTimes[id])
		require.NoError(t, originalErr)
		assert.Equal(t, original, parsed)
	}
	require.True(t, interactionEventsIndexExists(t, db, "idx_interaction_events_reward_history"))
	require.True(t, interactionEventsIndexExists(t, db, "idx_interaction_events_viewer_reward_history"))
	require.True(t, interactionEventsTriggerExists(t, db, "trg_interaction_events_reward_history_compat"))

	// Down deliberately retains the canonical timestamp spelling; reapplying restores snapshots.
	require.NoError(t, goose.DownTo(db, "migrations", 13))
	require.False(t, interactionEventsTableHasColumn(t, db, "reward_name"))
	require.False(t, interactionEventsIndexExists(t, db, "idx_interaction_events_reward_history"))
	require.False(t, interactionEventsTriggerExists(t, db, "trg_interaction_events_reward_history_compat"))
	var canonicalAfterDown string
	require.NoError(t, db.QueryRow(`SELECT created_at FROM interaction_events WHERE id = 'award-one'`).Scan(&canonicalAfterDown))
	assert.Equal(t, "2026-01-01T12:00:00.100000000Z", canonicalAfterDown)

	require.NoError(t, goose.UpTo(db, "migrations", 14))
	var restoredName string
	require.NoError(t, db.QueryRow(`SELECT reward_name FROM interaction_events WHERE id = 'award-one'`).Scan(&restoredName))
	assert.Equal(t, "deleted-award", restoredName)
}

func TestMigration00014_WhenPreviousBinaryWritesAfterUpgrade_ExpectCompatibleHistoryAfterReopen(t *testing.T) {
	// Arrange: upgrade a version-13 database, then write as the previous binary
	// would: name the pre-v14 columns and use RFC3339Nano's variable-width form.
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 13))
	_, err = db.Exec(`INSERT INTO viewers (id, last_seen_at, created_at) VALUES ('viewer', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`)
	require.NoError(t, err)
	require.NoError(t, goose.UpTo(db, "migrations", 14))
	_, err = db.Exec(`UPDATE award_types SET name = 'Catalog Advice' WHERE id = 'advice'`)
	require.NoError(t, err)
	_, err = db.Exec(`
		INSERT INTO interaction_events (id, kind, viewer_id, award_id, points, created_at) VALUES
			('legacy-exact', 'award', 'viewer', 'advice', 50, '2026-01-01T12:00:00Z'),
			('legacy-middle', 'award', 'viewer', 'joke', 10, '2026-01-01T12:00:00.1Z'),
			('legacy-newest', 'award', 'viewer', 'advice', 50, '2026-01-01T12:00:00.9Z')`)
	require.NoError(t, err)
	require.NoError(t, db.Close())

	// Act: normal current-store startup sees v14 already applied; it must read
	// the older writer's rows without relying on migration 14 to run again.
	reopened, err := Open(path, OpenOptions{})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, reopened.Close()) })
	first, err := reopened.ListRewardHistory(RewardHistoryQuery{Limit: 1})
	require.NoError(t, err)
	second, err := reopened.ListRewardHistory(RewardHistoryQuery{Limit: 1, Cursor: first.NextCursor})
	require.NoError(t, err)
	third, err := reopened.ListRewardHistory(RewardHistoryQuery{Limit: 1, Cursor: second.NextCursor})
	require.NoError(t, err)

	// Assert
	require.Len(t, first.Entries, 1)
	require.Len(t, second.Entries, 1)
	require.Len(t, third.Entries, 1)
	assert.Equal(t, "legacy-newest", first.Entries[0].ID)
	assert.Equal(t, "legacy-middle", second.Entries[0].ID)
	assert.Equal(t, "legacy-exact", third.Entries[0].ID)
	assert.Equal(t, "Catalog Advice", first.Entries[0].RewardName)
	assert.Equal(t, "Joke", second.Entries[0].RewardName)
	assert.Equal(t, "Catalog Advice", third.Entries[0].RewardName)
	assert.Equal(t, "2026-01-01T12:00:00.900000000Z", formatInteractionEventTime(first.Entries[0].CreatedAt))
	assert.Equal(t, "2026-01-01T12:00:00.100000000Z", formatInteractionEventTime(second.Entries[0].CreatedAt))
	assert.Equal(t, "2026-01-01T12:00:00.000000000Z", formatInteractionEventTime(third.Entries[0].CreatedAt))
	assert.NotEmpty(t, first.NextCursor)
	assert.NotEmpty(t, second.NextCursor)
	assert.Empty(t, third.NextCursor)
}

func TestInteractionEventTimeFormatting_WhenOtherStoreTimestampsAreVariable_ExpectOnlyEventsFixedWidth(t *testing.T) {
	value := time.Date(2026, 9, 3, 12, 0, 0, 100000000, time.UTC)
	assert.Equal(t, "2026-09-03T12:00:00.1Z", formatTime(value))
	assert.Equal(t, "2026-09-03T12:00:00.100000000Z", formatInteractionEventTime(value))
}

func interactionEventsTableHasColumn(t *testing.T, db *sql.DB, column string) bool {
	t.Helper()
	rows, err := db.Query(`PRAGMA table_info(interaction_events)`)
	require.NoError(t, err)
	defer func() { require.NoError(t, rows.Close()) }()
	for rows.Next() {
		var cid, notNull, primaryKey int
		var name, columnType string
		var defaultValue any
		require.NoError(t, rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &primaryKey))
		if name == column {
			return true
		}
	}
	require.NoError(t, rows.Err())
	return false
}

func interactionEventsIndexExists(t *testing.T, db *sql.DB, index string) bool {
	t.Helper()
	var name string
	err := db.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?`, index).Scan(&name)
	if err == sql.ErrNoRows {
		return false
	}
	require.NoError(t, err)
	return true
}

func interactionEventsTriggerExists(t *testing.T, db *sql.DB, trigger string) bool {
	t.Helper()
	var name string
	err := db.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = ?`, trigger).Scan(&name)
	if err == sql.ErrNoRows {
		return false
	}
	require.NoError(t, err)
	return true
}
