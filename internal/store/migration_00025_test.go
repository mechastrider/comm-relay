package store

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/require"
	_ "modernc.org/sqlite"
)

func TestMigration00025_WhenExistingSessions_ExpectEmptyTitle(t *testing.T) {
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "comm-relay.db"))
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 24))
	_, err = db.Exec(`INSERT INTO stream_sessions (id, started_at, ended_at) VALUES ('prior', '2026-10-01T00:00:00Z', NULL)`)
	require.NoError(t, err)

	require.NoError(t, goose.UpTo(db, "migrations", 25))
	require.NoError(t, goose.DownTo(db, "migrations", 24))
	require.NoError(t, goose.UpTo(db, "migrations", 25))

	var title string
	require.NoError(t, db.QueryRow(`SELECT title FROM stream_sessions WHERE id = 'prior'`).Scan(&title))
	require.Empty(t, title)
}
