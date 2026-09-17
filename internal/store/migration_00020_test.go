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

func TestMigration00020_WhenUpFrom19_ExpectEmptyAliasesAndReversibleTable(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 19))

	require.NoError(t, goose.UpTo(db, "migrations", 20))
	assert.True(t, sqliteTableExists(t, db, "command_aliases"))

	var aliasCount int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM command_aliases`).Scan(&aliasCount))
	assert.Equal(t, 0, aliasCount)

	var ggAliases int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM command_aliases WHERE command_id = 'gg'`).Scan(&ggAliases))
	assert.Equal(t, 0, ggAliases)
	var hiAliases int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM command_aliases WHERE command_id = 'hi'`).Scan(&hiAliases))
	assert.Equal(t, 0, hiAliases)

	require.NoError(t, goose.DownTo(db, "migrations", 19))
	assert.False(t, sqliteTableExists(t, db, "command_aliases"))

	require.NoError(t, goose.UpTo(db, "migrations", 20))
	assert.True(t, sqliteTableExists(t, db, "command_aliases"))
}
