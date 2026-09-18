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

func TestSocialCatalogBootstrap_WhenLikeTriggerTaken_ExpectBuffOnly(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 20))

	_, err = db.Exec(`INSERT INTO commands (id, action, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms, sound_volume, layout, image_fit, image_size_pct)
		VALUES ('custom_like', 'alert', 'like', 1, 5, 'Taken', '', 5000, 70, 'card', 'contain', 100)`)
	require.NoError(t, err)
	_, err = db.Exec(`INSERT INTO store_bootstrap (key, value) VALUES (?, '1'), (?, '1')`, starterCatalogBootstrapKey, progressionBootstrapKey)
	require.NoError(t, err)
	_, err = db.Exec(`INSERT INTO store_bootstrap (key, value) VALUES (?, ?)`, socialCatalogBootstrapKey, starterCatalogPendingPrefix+"en-GB")
	require.NoError(t, err)
	require.NoError(t, db.Close())

	s, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	_, err = s.GetCommand("like")
	require.ErrorIs(t, err, ErrCommandNotFound)

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	assert.Equal(t, CommandActionBuff, buff.Action)
	require.NotNil(t, buff.Points)
	assert.Equal(t, 5, *buff.Points)

	var awardName string
	require.NoError(t, s.db.QueryRow(`SELECT name FROM award_types WHERE id = 'viewer_like'`).Scan(&awardName))
	assert.Equal(t, "Viewer Like", awardName)
}

func TestCreateCommand_WhenLikeWithoutAward_ExpectFieldError(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	_, err = s.CreateCommand(CreateCommandInput{
		Action:          CommandActionLike,
		Trigger:         "mylike",
		CooldownSeconds: 5,
	})
	require.Error(t, err)
	fields := CommandCatalogFields(err)
	require.Equal(t, "award is required for like commands", fields["award_id"])
}

func TestCreateCommand_WhenBuffWithoutPoints_ExpectFieldError(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	_, err = s.CreateCommand(CreateCommandInput{
		Action:          CommandActionBuff,
		Trigger:         "mybuff",
		CooldownSeconds: 5,
	})
	require.Error(t, err)
	fields := CommandCatalogFields(err)
	require.Equal(t, "points must be between 1 and 1000 for buff commands", fields["points"])
}

func TestCreateCommand_WhenLikeWithViewerLike_ExpectStoredBinding(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	cmd, err := s.CreateCommand(CreateCommandInput{
		Action:          CommandActionLike,
		Trigger:         "peerlike",
		AwardID:         "viewer_like",
		CooldownSeconds: 5,
	})
	require.NoError(t, err)
	assert.Equal(t, "viewer_like", cmd.AwardID)
}
