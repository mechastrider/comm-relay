package store

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMigration00026_WhenLegacyAndOldWriter_ExpectPreservedFactsAndDefaults(t *testing.T) {
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "migration.db"))
	require.NoError(t, err)
	defer func() { require.NoError(t, db.Close()) }()
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 25))
	insert := `INSERT INTO interaction_events(id,kind,award_id,reward_name,points,created_at) VALUES (?,'award','old','Old reward',5,'2026-10-15T12:00:00Z')`
	_, err = db.Exec(insert, "legacy")
	require.NoError(t, err)
	require.NoError(t, goose.UpTo(db, "migrations", 26))
	_, err = db.Exec(insert, "old-writer")
	require.NoError(t, err)
	for _, id := range []string{"legacy", "old-writer"} {
		var actor sql.NullString
		var hidden, points int
		require.NoError(t, db.QueryRow(`SELECT actor_viewer_id,feed_hidden,points FROM interaction_events WHERE id=?`, id).Scan(&actor, &hidden, &points))
		assert.False(t, actor.Valid)
		assert.Zero(t, hidden)
		assert.Equal(t, 5, points)
	}
	require.NoError(t, goose.DownTo(db, "migrations", 25))
	var count int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM interaction_events`).Scan(&count))
	assert.Equal(t, 2, count)
	require.NoError(t, goose.UpTo(db, "migrations", 26))
}
