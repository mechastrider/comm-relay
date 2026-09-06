package store

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/require"

	_ "modernc.org/sqlite"
)

func TestMigration00013_WhenVersion12Database_ExpectReversibleAlertDefault(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	db.SetMaxOpenConns(1)

	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 12))
	_, err = db.Exec(`
		INSERT INTO commands (id, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms)
		VALUES ('legacy', 'legacy', 1, 30, 'Legacy alert', 'chime', 5000)`)
	require.NoError(t, err)
	require.False(t, commandsTableHasColumn(t, db, "action"))

	require.NoError(t, goose.UpTo(db, "migrations", 13))
	var action string
	require.NoError(t, db.QueryRow(`SELECT action FROM commands WHERE id = 'legacy'`).Scan(&action))
	require.Equal(t, CommandActionAlert, action)

	require.NoError(t, goose.DownTo(db, "migrations", 12))
	require.False(t, commandsTableHasColumn(t, db, "action"))
	var splash string
	require.NoError(t, db.QueryRow(`SELECT splash_template FROM commands WHERE id = 'legacy'`).Scan(&splash))
	require.Equal(t, "Legacy alert", splash)

	require.NoError(t, goose.UpTo(db, "migrations", 13))
	require.NoError(t, db.QueryRow(`SELECT action FROM commands WHERE id = 'legacy'`).Scan(&action))
	require.Equal(t, CommandActionAlert, action)
}

func TestCommands_WhenStoredActionUnknown_ExpectReadFailsClosed(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	_, err = s.db.Exec(`UPDATE commands SET action = 'unknown' WHERE id = 'gg'`)
	require.NoError(t, err)
	_, err = s.GetCommand("gg")
	require.ErrorIs(t, err, ErrInvalidCommandAction)
}

func commandsTableHasColumn(t *testing.T, db *sql.DB, column string) bool {
	t.Helper()
	rows, err := db.Query(`PRAGMA table_info(commands)`)
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
