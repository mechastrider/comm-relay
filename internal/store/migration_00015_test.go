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

func TestMigration00015_WhenVersion14Database_ExpectReversibleContractSchema(t *testing.T) {
	// Arrange
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	db.SetMaxOpenConns(1)
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 14))

	// Act
	require.NoError(t, goose.UpTo(db, "migrations", 15))

	// Assert
	require.True(t, viewerContractsTableExists(t, db))
	require.True(t, interactionEventsTableHasColumn(t, db, "contract_id"))
	require.True(t, interactionEventsIndexExists(t, db, "idx_interaction_events_contract_id"))
	require.True(t, viewerContractsIndexExists(t, db, "idx_viewer_contracts_status_announced"))
	_, err = db.Exec(`
		INSERT INTO viewer_contracts (
			id, status, active_slot, title, objective, reward_id, reward_name, reward_points,
			reward_splash_template, reward_sound, reward_duration_ms, reward_sound_volume,
			reward_layout, reward_image_fit, reward_image_size_pct, announced_at
		) VALUES ('active', 'active', 1, 'Title', 'Objective', 'joke', 'Joke', 10,
			'Joke', 'soft', 5000, 100, 'card', 'cover', 100, '2026-01-01T00:00:00Z')`)
	require.NoError(t, err)
	_, err = db.Exec(`
		INSERT INTO viewer_contracts (
			id, status, active_slot, title, objective, reward_id, reward_name, reward_points,
			reward_splash_template, reward_sound, reward_duration_ms, reward_sound_volume,
			reward_layout, reward_image_fit, reward_image_size_pct, announced_at
		) VALUES ('second', 'active', 1, 'Title', 'Objective', 'joke', 'Joke', 10,
			'Joke', 'soft', 5000, 100, 'card', 'cover', 100, '2026-01-01T00:00:00Z')`)
	require.Error(t, err)
	_, err = db.Exec(`INSERT INTO interaction_events (id, kind, points, created_at) VALUES ('legacy', 'activity', 1, '2026-01-01T00:00:00Z')`)
	require.NoError(t, err, "a previous binary names all pre-v15 event columns")

	require.NoError(t, goose.DownTo(db, "migrations", 14))
	assert.False(t, viewerContractsTableExists(t, db))
	assert.False(t, interactionEventsTableHasColumn(t, db, "contract_id"))
	require.NoError(t, goose.UpTo(db, "migrations", 15))
	assert.True(t, viewerContractsTableExists(t, db))
	assert.True(t, interactionEventsTableHasColumn(t, db, "contract_id"))
}

func viewerContractsTableExists(t *testing.T, db *sql.DB) bool {
	t.Helper()
	var name string
	err := db.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'viewer_contracts'`).Scan(&name)
	if err == sql.ErrNoRows {
		return false
	}
	require.NoError(t, err)
	return true
}

func viewerContractsIndexExists(t *testing.T, db *sql.DB, index string) bool {
	t.Helper()
	var name string
	err := db.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?`, index).Scan(&name)
	if err == sql.ErrNoRows {
		return false
	}
	require.NoError(t, err)
	return true
}
