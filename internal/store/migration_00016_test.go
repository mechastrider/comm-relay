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

func TestMigration00016_WhenVersion15Database_ExpectBackfilledReversibleGreetingState(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 15))
	_, err = db.Exec(`INSERT INTO stream_sessions (id, started_at, ended_at) VALUES ('open', '2026-09-11T10:00:00Z', NULL);
		INSERT INTO viewers (id, message_count, last_seen_at, created_at) VALUES ('known', 3, '2026-09-11T11:00:00Z', '2026-09-11T10:00:00Z');
		INSERT INTO viewer_session_stats (viewer_id, session_id, message_count, xp) VALUES ('known', 'open', 2, 0);`)
	require.NoError(t, err)

	require.NoError(t, goose.UpTo(db, "migrations", 16))
	var allTime, session sql.NullString
	var excluded int
	require.NoError(t, db.QueryRow(`SELECT greetings_disabled, first_ordinary_message_at FROM viewers WHERE id = 'known'`).Scan(&excluded, &allTime))
	require.NoError(t, db.QueryRow(`SELECT first_ordinary_message_at FROM viewer_session_stats WHERE viewer_id = 'known' AND session_id = 'open'`).Scan(&session))
	assert.Equal(t, 0, excluded)
	assert.True(t, allTime.Valid)
	assert.True(t, session.Valid)
	assert.True(t, greetingDefinitionsTableExists(t, db))

	require.NoError(t, goose.DownTo(db, "migrations", 15))
	assert.False(t, greetingDefinitionsTableExists(t, db))
	require.NoError(t, goose.UpTo(db, "migrations", 16))
	assert.True(t, greetingDefinitionsTableExists(t, db))
}

func TestGreetingBootstrap_WhenLocaleProvided_ExpectDisabledDefinitionsWithoutRewrite(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	opened, err := Open(path, OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	greetings, err := opened.ListGreetings()
	require.NoError(t, err)
	require.NoError(t, opened.Close())
	require.Equal(t, "Добро пожаловать, {viewer}!", greetings[0].SplashTemplate)
	next, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	require.NoError(t, next.Close())
	// A second bootstrap only fills missing rows; it never translates owned values.
	reopened, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, reopened.Close()) })
	again, err := reopened.ListGreetings()
	require.NoError(t, err)
	assert.Equal(t, "Добро пожаловать, {viewer}!", again[0].SplashTemplate)
}

func greetingDefinitionsTableExists(t *testing.T, db *sql.DB) bool {
	t.Helper()
	var name string
	err := db.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'greeting_definitions'`).Scan(&name)
	if err == sql.ErrNoRows {
		return false
	}
	require.NoError(t, err)
	return true
}
