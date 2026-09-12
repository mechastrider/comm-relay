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

func TestMigration00018_WhenLegacyCommandEventsResolve_ExpectStableIDsAndReversibleBackfill(t *testing.T) {
	// Arrange
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 17))
	_, err = db.Exec(`
		INSERT INTO commands (id, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms)
		VALUES ('command_stable', 'active', 1, 0, 'Active', '', 5000);
		INSERT INTO interaction_events (id, kind, viewer_id, command_trigger, points, created_at)
		VALUES
			('eligible', 'command', NULL, 'active', 0, '2026-09-12T12:00:00.000000000Z'),
			('unresolved', 'command', NULL, 'removed', 0, '2026-09-12T12:00:01.000000000Z');`)
	require.NoError(t, err)

	// Act
	require.NoError(t, goose.UpTo(db, "migrations", 18))

	// Assert
	var eligible, unresolved sql.NullString
	require.NoError(t, db.QueryRow(`SELECT command_id FROM interaction_events WHERE id = 'eligible'`).Scan(&eligible))
	require.NoError(t, db.QueryRow(`SELECT command_id FROM interaction_events WHERE id = 'unresolved'`).Scan(&unresolved))
	assert.Equal(t, "command_stable", eligible.String)
	assert.False(t, unresolved.Valid)
	assertProgressionSchemaIntegrity(t, db)

	// Reversing and applying again proves that both the schema transition and
	// conditional adoption are repeatable on a disposable upgrade fixture.
	require.NoError(t, goose.DownTo(db, "migrations", 17))
	require.NoError(t, goose.UpTo(db, "migrations", 18))
	require.NoError(t, db.QueryRow(`SELECT command_id FROM interaction_events WHERE id = 'eligible'`).Scan(&eligible))
	assert.Equal(t, "command_stable", eligible.String)
}
