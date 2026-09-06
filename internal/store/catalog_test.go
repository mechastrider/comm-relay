package store_test

import (
	"database/sql"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestCommands_WhenFreshDatabase_ExpectSeedRows(t *testing.T) {
	s, _ := openTestStore(t)

	commands, err := s.ListCommands()
	require.NoError(t, err)
	require.Len(t, commands, 2)

	triggers := map[string]store.Command{}
	for _, cmd := range commands {
		triggers[cmd.Trigger] = cmd
	}

	gg, ok := triggers["gg"]
	require.True(t, ok)
	assert.Equal(t, "gg", gg.ID)
	assert.Equal(t, store.CommandActionAlert, gg.Action)
	assert.True(t, gg.Enabled)
	assert.Equal(t, 30, gg.CooldownSeconds)
	assert.Equal(t, "Good game, {viewer}!", gg.SplashTemplate)
	assert.Equal(t, "chime", gg.Sound)
	assert.Equal(t, 5000, gg.DurationMs)

	hi, ok := triggers["hi"]
	require.True(t, ok)
	assert.Equal(t, "hi", hi.ID)
	assert.Equal(t, "ping", hi.Sound)

	awards, err := s.ListAwards()
	require.NoError(t, err)
	require.Len(t, awards, 8)

	byID := map[string]store.AwardType{}
	for _, award := range awards {
		byID[award.ID] = award
	}

	joke := byID["joke"]
	assert.Equal(t, "Joke", joke.Name)
	assert.Equal(t, 10, joke.Points)
	assert.Equal(t, "Joke for {viewer}! +{points}", joke.SplashTemplate)
	assert.Equal(t, "soft", joke.Sound)

	advice := byID["advice"]
	assert.Equal(t, "Advice", advice.Name)
	assert.Equal(t, 50, advice.Points)
	assert.Equal(t, "Advice for {viewer}! +{points}", advice.SplashTemplate)
	assert.Equal(t, "alert", advice.Sound)

	spotter := byID["spotter"]
	assert.Equal(t, "Spotter", spotter.Name)
	assert.Equal(t, 25, spotter.Points)
	assert.Equal(t, "Spotter for {viewer}! +{points}", spotter.SplashTemplate)
	assert.Equal(t, "ping", spotter.Sound)

	intel := byID["intel"]
	assert.Equal(t, "Intel", intel.Name)
	assert.Equal(t, 30, intel.Points)
	assert.Equal(t, "Intel for {viewer}! +{points}", intel.SplashTemplate)
	assert.Equal(t, "chime", intel.Sound)

	expert := byID["expert"]
	assert.Equal(t, "Expert", expert.Name)
	assert.Equal(t, 40, expert.Points)
	assert.Equal(t, "Expert for {viewer}! +{points}", expert.SplashTemplate)
	assert.Equal(t, "alert", expert.Sound)

	meme := byID["meme"]
	assert.Equal(t, "Meme", meme.Name)
	assert.Equal(t, 20, meme.Points)
	assert.Equal(t, "Meme for {viewer}! +{points}", meme.SplashTemplate)
	assert.Equal(t, "soft", meme.Sound)

	clutch := byID["clutch"]
	assert.Equal(t, "Clutch Help", clutch.Name)
	assert.Equal(t, 50, clutch.Points)
	assert.Equal(t, "Clutch Help for {viewer}! +{points}", clutch.SplashTemplate)
	assert.Equal(t, "alert", clutch.Sound)

	mvp := byID["mvp"]
	assert.Equal(t, "MVP", mvp.Name)
	assert.Equal(t, 100, mvp.Points)
	assert.Equal(t, "MVP for {viewer}! +{points}", mvp.SplashTemplate)
	assert.Equal(t, "chime", mvp.Sound)
}

func TestCommands_WhenCreateShowLeaderboard_ExpectNoAlertPresentationRequired(t *testing.T) {
	s, _ := openTestStore(t)

	created, err := s.CreateCommand(store.CreateCommandInput{
		Action:          store.CommandActionShowLeaderboard,
		Trigger:         "leaderboard",
		Enabled:         true,
		CooldownSeconds: 180,
	})
	require.NoError(t, err)
	require.Equal(t, store.CommandActionShowLeaderboard, created.Action)
	require.Equal(t, "leaderboard", created.Trigger)
	require.Equal(t, 180, created.CooldownSeconds)

	loaded, err := s.GetCommand(created.ID)
	require.NoError(t, err)
	require.Equal(t, store.CommandActionShowLeaderboard, loaded.Action)
}

func TestCommands_WhenSwitchAlertToShowLeaderboard_ExpectPresentationRetained(t *testing.T) {
	s, _ := openTestStore(t)
	existing, err := s.GetCommand("gg")
	require.NoError(t, err)

	updated, err := s.UpdateCommand(store.UpdateCommandInput{
		ID:              existing.ID,
		Action:          store.CommandActionShowLeaderboard,
		Trigger:         existing.Trigger,
		Enabled:         existing.Enabled,
		CooldownSeconds: existing.CooldownSeconds,
	})
	require.NoError(t, err)
	require.Equal(t, store.CommandActionShowLeaderboard, updated.Action)
	require.Equal(t, existing.SplashTemplate, updated.SplashTemplate)
	require.Equal(t, existing.Sound, updated.Sound)
	require.Equal(t, existing.DurationMs, updated.DurationMs)
}

func TestCommands_WhenActionInvalid_ExpectError(t *testing.T) {
	s, _ := openTestStore(t)
	_, err := s.CreateCommand(store.CreateCommandInput{
		Action:          "launch_missiles",
		Trigger:         "nope",
		Enabled:         true,
		CooldownSeconds: 0,
	})
	require.ErrorIs(t, err, store.ErrInvalidCommandAction)
}

func TestCommands_WhenDeleteSeedAndReopen_ExpectStillAbsent(t *testing.T) {
	s, path := openTestStore(t)

	require.NoError(t, s.DeleteCommand("gg"))
	require.NoError(t, s.Close())

	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, reopened.Close())
	})

	commands, err := reopened.ListCommands()
	require.NoError(t, err)

	for _, cmd := range commands {
		assert.NotEqual(t, "gg", cmd.Trigger)
		assert.NotEqual(t, "gg", cmd.ID)
	}
}

func TestCommands_WhenDuplicateTrigger_ExpectError(t *testing.T) {
	s, _ := openTestStore(t)

	_, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "gg",
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "dup",
		Sound:           "",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrDuplicateTrigger))
}

func TestCommands_WhenInvalidTrigger_ExpectError(t *testing.T) {
	s, _ := openTestStore(t)

	_, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "!gg",
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "bad",
		Sound:           "",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrInvalidTrigger))

	_, err = s.CreateCommand(store.CreateCommandInput{
		Trigger:         "ab-cd",
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "bad",
		Sound:           "",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrInvalidTrigger))
}

func TestAwards_WhenPointsZero_ExpectError(t *testing.T) {
	s, _ := openTestStore(t)

	_, err := s.CreateAward(store.CreateAwardInput{
		Name:           "Empty",
		Points:         0,
		SplashTemplate: "nope",
		Sound:          "",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrInvalidPoints))
}

func TestAwards_WhenDeleteSeedAndReopen_ExpectStillAbsent(t *testing.T) {
	s, path := openTestStore(t)

	require.NoError(t, s.DeleteAward("joke"))
	require.NoError(t, s.Close())

	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, reopened.Close())
	})

	awards, err := reopened.ListAwards()
	require.NoError(t, err)

	for _, award := range awards {
		assert.NotEqual(t, "joke", award.ID)
	}
}

func TestAwards_WhenDeleteSpotterAndReopen_ExpectStillAbsent(t *testing.T) {
	s, path := openTestStore(t)

	require.NoError(t, s.DeleteAward("spotter"))
	require.NoError(t, s.Close())

	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, reopened.Close())
	})

	awards, err := reopened.ListAwards()
	require.NoError(t, err)

	for _, award := range awards {
		assert.NotEqual(t, "spotter", award.ID)
	}
}

func TestAwards_WhenUpgradedFrom00002_ExpectExtraSeedsWithoutRewritingJokeAdvice(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "comm-relay.db")

	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)

	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	migrationsDir := filepath.Join(filepath.Dir(filename), "migrations")

	migration01, err := os.ReadFile(filepath.Join(migrationsDir, "00001_viewer_schema.sql"))
	require.NoError(t, err)
	migration02, err := os.ReadFile(filepath.Join(migrationsDir, "00002_commands_awards.sql"))
	require.NoError(t, err)

	for _, stmt := range splitGooseStatements(string(migration01)) {
		if stmt == "" {
			continue
		}
		_, err = db.Exec(stmt)
		require.NoError(t, err)
	}
	for _, stmt := range splitGooseStatements(string(migration02)) {
		if stmt == "" {
			continue
		}
		_, err = db.Exec(stmt)
		require.NoError(t, err)
	}

	_, err = db.Exec(`CREATE TABLE goose_db_version (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		version_id INTEGER NOT NULL,
		is_applied INTEGER NOT NULL,
		tstamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)
	require.NoError(t, err)
	_, err = db.Exec(`INSERT INTO goose_db_version (version_id, is_applied) VALUES (1, 1)`)
	require.NoError(t, err)
	_, err = db.Exec(`INSERT INTO goose_db_version (version_id, is_applied) VALUES (2, 1)`)
	require.NoError(t, err)
	require.NoError(t, db.Close())

	s, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, s.Close())
	})

	awards, err := s.ListAwards()
	require.NoError(t, err)
	require.Len(t, awards, 8)

	byID := map[string]store.AwardType{}
	for _, award := range awards {
		byID[award.ID] = award
	}

	joke := byID["joke"]
	assert.Equal(t, "Joke", joke.Name)
	assert.Equal(t, 10, joke.Points)

	advice := byID["advice"]
	assert.Equal(t, "Advice", advice.Name)
	assert.Equal(t, 50, advice.Points)

	require.Contains(t, byID, "spotter")
	require.Contains(t, byID, "intel")
	require.Contains(t, byID, "expert")
	require.Contains(t, byID, "meme")
	require.Contains(t, byID, "clutch")
	require.Contains(t, byID, "mvp")
}
