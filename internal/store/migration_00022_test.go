package store

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	_ "modernc.org/sqlite"
)

func TestMigration00022_WhenExistingIdentities_ExpectIndexedLookupWithoutDataChanges(t *testing.T) {
	// Arrange: existing viewer with linked identities and different timestamps.
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "comm-relay.db"))
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 21))
	_, err = db.Exec(`
		INSERT INTO viewers (id, display_name, last_seen_at, created_at)
		VALUES ('viewer', 'Operator-owned name', '2026-10-02', '2026-10-01');
		INSERT INTO viewer_identities (platform, user_id, viewer_id, username, last_seen_at)
		VALUES ('twitch', 'first', 'viewer', 'Older', '2026-10-01'),
		       ('youtube', 'second', 'viewer', 'Latest', '2026-10-02');`)
	require.NoError(t, err)

	// Act: upgrade, reverse, and reapply on the populated database.
	require.NoError(t, goose.UpTo(db, "migrations", 22))
	require.NoError(t, goose.DownTo(db, "migrations", 21))
	require.NoError(t, goose.UpTo(db, "migrations", 22))

	// Assert: the repeated per-viewer lookup uses an index rather than a scan/sort.
	var id, parent, unused int
	var plan string
	require.NoError(t, db.QueryRow(`EXPLAIN QUERY PLAN SELECT username FROM viewer_identities
		WHERE viewer_id = ? ORDER BY last_seen_at DESC LIMIT 1`, "viewer").Scan(&id, &parent, &unused, &plan))
	assert.Contains(t, plan, "USING INDEX idx_viewer_identities_viewer_last_seen")
	var name string
	require.NoError(t, db.QueryRow(`SELECT display_name FROM viewers WHERE id = 'viewer'`).Scan(&name))
	assert.Equal(t, "Operator-owned name", name)
	require.NoError(t, db.QueryRow(`SELECT username FROM viewer_identities WHERE viewer_id = 'viewer' ORDER BY last_seen_at DESC LIMIT 1`).Scan(&name))
	assert.Equal(t, "Latest", name)
	var count int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM viewer_identities`).Scan(&count))
	assert.Equal(t, 2, count)
}
