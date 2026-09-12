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

func TestProgressionBootstrap_WhenFreshAndUpgraded_ExpectStableLocaleCatalog(t *testing.T) {
	for _, test := range []struct {
		name, locale string
		version      int64
		levelTitle   string
	}{
		{"fresh_russian", "ru-RU", 0, "Новобранец"},
		{"upgraded_english", "en-GB", 16, "Recruit"},
	} {
		t.Run(test.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "comm-relay.db")
			if test.version != 0 {
				db, err := sql.Open("sqlite", path)
				require.NoError(t, err)
				goose.SetBaseFS(embedMigrations)
				require.NoError(t, goose.SetDialect("sqlite3"))
				require.NoError(t, goose.UpTo(db, "migrations", test.version))
				require.NoError(t, db.Close())
			}
			s, err := Open(path, OpenOptions{TimeLocale: test.locale})
			require.NoError(t, err)
			levels, err := s.ListProgressionLevels()
			require.NoError(t, err)
			require.Len(t, levels, 5)
			assert.Equal(t, test.levelTitle, levels[0].Title)
			assert.True(t, levels[0].Announce)
			achievements, err := s.ListAchievements()
			require.NoError(t, err)
			require.Len(t, achievements, 8)
			assert.NoError(t, s.Close())
		})
	}
}

func TestProgressionBootstrap_WhenPendingRetryAndUserEdits_ExpectNoReseedOrRetranslation(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	first, err := Open(path, OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	_, err = first.UpdateProgressionLevel(UpdateProgressionLevelInput{ID: "recruit", Title: "Мой титул", MinXP: 0})
	require.NoError(t, err)
	require.NoError(t, first.Close())

	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	_, err = db.Exec(`UPDATE store_bootstrap SET value = 'pending:ru-RU' WHERE key = ?`, progressionBootstrapKey)
	require.NoError(t, err)
	require.NoError(t, db.Close())

	retried, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, retried.Close()) })
	level, err := retried.getProgressionLevelLocked("recruit")
	require.NoError(t, err)
	assert.Equal(t, "Мой титул", level.Title)
	state, err := retried.progressionBootstrapStateLocked()
	require.NoError(t, err)
	assert.Equal(t, "1", state)
}
