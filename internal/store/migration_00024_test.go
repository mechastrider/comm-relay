package store

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/require"
	_ "modernc.org/sqlite"
)

func TestMigration00024_WhenExistingViewers_ExpectChannelOwnerDefaultsOff(t *testing.T) {
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "comm-relay.db"))
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 23))
	_, err = db.Exec(`INSERT INTO viewers (id, last_seen_at, created_at) VALUES ('viewer', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z')`)
	require.NoError(t, err)

	require.NoError(t, goose.UpTo(db, "migrations", 24))
	require.NoError(t, goose.DownTo(db, "migrations", 23))
	require.NoError(t, goose.UpTo(db, "migrations", 24))

	var owner int
	require.NoError(t, db.QueryRow(`SELECT channel_owner FROM viewers WHERE id = 'viewer'`).Scan(&owner))
	require.Equal(t, 0, owner)
}
