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

func TestMigration00017_WhenFreshOrVersion16Database_ExpectConstrainedReversibleProgressionSchema(t *testing.T) {
	for _, version := range []int{0, 16} {
		version := version
		t.Run(fmt.Sprintf("version_%d", version), func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "comm-relay.db")
			db, err := sql.Open("sqlite", path)
			require.NoError(t, err)
			t.Cleanup(func() { require.NoError(t, db.Close()) })
			goose.SetBaseFS(embedMigrations)
			require.NoError(t, goose.SetDialect("sqlite3"))
			if version != 0 {
				require.NoError(t, goose.UpTo(db, "migrations", int64(version)))
			}
			require.NoError(t, goose.UpTo(db, "migrations", 17))

			assertProgressionSchemaIntegrity(t, db)
			require.NoError(t, goose.DownTo(db, "migrations", 16))
			assert.False(t, sqliteTableExists(t, db, "progression_levels"))
			require.NoError(t, goose.UpTo(db, "migrations", 17))
			assertProgressionSchemaIntegrity(t, db)
		})
	}
}

func assertProgressionSchemaIntegrity(t *testing.T, db *sql.DB) {
	t.Helper()
	for _, table := range []string{
		"progression_levels", "achievement_definitions", "achievement_revisions",
		"viewer_achievement_unlocks", "progression_alert_settings", "progression_reconciliation",
	} {
		assert.True(t, sqliteTableExists(t, db, table), table)
	}
	columns, err := db.Query(`PRAGMA table_info(viewers)`)
	require.NoError(t, err)
	defer func() { require.NoError(t, columns.Close()) }()
	var hasAlertExclusion bool
	for columns.Next() {
		var cid int
		var name, columnType string
		var notNull, primaryKey int
		var defaultValue sql.NullString
		require.NoError(t, columns.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &primaryKey))
		hasAlertExclusion = hasAlertExclusion || name == "progression_alerts_disabled"
	}
	require.NoError(t, columns.Err())
	assert.True(t, hasAlertExclusion)

	foreignKeys, err := db.Query(`PRAGMA foreign_key_check`)
	require.NoError(t, err)
	defer func() { require.NoError(t, foreignKeys.Close()) }()
	assert.False(t, foreignKeys.Next(), "foreign keys must be valid after migration")

	var integrity string
	require.NoError(t, db.QueryRow(`PRAGMA integrity_check`).Scan(&integrity))
	assert.Equal(t, "ok", integrity)
}

func sqliteTableExists(t *testing.T, db *sql.DB, table string) bool {
	t.Helper()
	var found string
	err := db.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, table).Scan(&found)
	if err == sql.ErrNoRows {
		return false
	}
	require.NoError(t, err)
	return true
}
