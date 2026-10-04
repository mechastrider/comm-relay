package store

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/require"
	_ "modernc.org/sqlite"
)

func TestMigration00023_WhenExistingLevels_ExpectEmblemsWithoutQuotaChanges(t *testing.T) {
	// Arrange.
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "comm-relay.db"))
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 22))
	_, err = db.Exec(`INSERT INTO progression_levels (id, title, min_xp, like_quota, buff_quota, announce, created_at, updated_at) VALUES ('recruit', 'Renamed', 0, 73, 100, 0, '2026-10-01', '2026-10-01'), ('custom', 'Custom', 77, 9, 0, 0, '2026-10-01', '2026-10-01')`)
	require.NoError(t, err)

	// Act: apply, reverse, reapply.
	require.NoError(t, goose.UpTo(db, "migrations", 23))
	require.NoError(t, goose.DownTo(db, "migrations", 22))
	require.NoError(t, goose.UpTo(db, "migrations", 23))

	// Assert.
	var emblem, title string
	var like, buff int
	require.NoError(t, db.QueryRow(`SELECT title, emblem, like_quota, buff_quota FROM progression_levels WHERE id='recruit'`).Scan(&title, &emblem, &like, &buff))
	require.Equal(t, "Renamed", title)
	require.Equal(t, "chevron_1", emblem)
	require.Equal(t, 73, like)
	require.Equal(t, 100, buff)
	require.NoError(t, db.QueryRow(`SELECT emblem FROM progression_levels WHERE id='custom'`).Scan(&emblem))
	require.Equal(t, "shield", emblem)
}
