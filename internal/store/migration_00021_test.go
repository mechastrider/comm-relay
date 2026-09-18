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

func TestMigration00021_WhenUpFrom20_ExpectSocialColumnsAndStarterQuotas(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 20))

	_, err = db.Exec(`INSERT INTO progression_levels (id, title, min_xp, announce, created_at, updated_at) VALUES ('recruit', 'Recruit', 0, 1, '2020-01-01T00:00:00.000000000Z', '2020-01-01T00:00:00.000000000Z')`)
	require.NoError(t, err)

	require.NoError(t, goose.UpTo(db, "migrations", 21))

	assert.True(t, commandsTableHasColumn(t, db, "points"))
	assert.True(t, commandsTableHasColumn(t, db, "award_id"))

	var likeQuota, buffQuota int
	require.NoError(t, db.QueryRow(`SELECT like_quota, buff_quota FROM progression_levels WHERE id = 'recruit'`).Scan(&likeQuota, &buffQuota))
	assert.Equal(t, 1, likeQuota)
	assert.Equal(t, 1, buffQuota)

	columns, err := interactionEventColumns(db)
	require.NoError(t, err)
	assert.Contains(t, columns, "recipient_viewer_id")
	assert.Contains(t, columns, "parent_event_id")

	require.NoError(t, goose.DownTo(db, "migrations", 20))
	assert.False(t, commandsTableHasColumn(t, db, "points"))
}

func interactionEventColumns(db *sql.DB) ([]string, error) {
	rows, err := db.Query(`PRAGMA table_info(interaction_events)`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var columns []string
	for rows.Next() {
		var cid, notNull, pk int
		var name, columnType string
		var defaultValue any
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &pk); err != nil {
			return nil, err
		}
		columns = append(columns, name)
	}
	return columns, rows.Err()
}
