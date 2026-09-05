package store_test

import (
	"database/sql"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestStarterCatalog_WhenFreshRussianDatabase_ExpectLocalizedSeeds(t *testing.T) {
	s, _ := openTestStoreWithLocale(t, "ru-RU")

	commands, err := s.ListCommands()
	require.NoError(t, err)
	require.Len(t, commands, 2)

	byTrigger := map[string]store.Command{}
	for _, cmd := range commands {
		byTrigger[cmd.Trigger] = cmd
	}

	gg := byTrigger["gg"]
	assert.Equal(t, "Хорошая игра, {viewer}!", gg.SplashTemplate)

	hi := byTrigger["hi"]
	assert.Equal(t, "Привет, {viewer}!", hi.SplashTemplate)

	awards, err := s.ListAwards()
	require.NoError(t, err)
	require.Len(t, awards, 8)

	byID := map[string]store.AwardType{}
	for _, award := range awards {
		byID[award.ID] = award
	}

	assert.Equal(t, "Шутка", byID["joke"].Name)
	assert.Equal(t, "Шутка для {viewer}! +{points}", byID["joke"].SplashTemplate)
	assert.Equal(t, "Совет", byID["advice"].Name)
	assert.Equal(t, "Совет для {viewer}! +{points}", byID["advice"].SplashTemplate)
	assert.Equal(t, "Зоркий глаз", byID["spotter"].Name)
	assert.Equal(t, "Зоркий глаз: {viewer}! +{points}", byID["spotter"].SplashTemplate)
	assert.Equal(t, "Информация", byID["intel"].Name)
	assert.Equal(t, "Информация от {viewer}! +{points}", byID["intel"].SplashTemplate)
	assert.Equal(t, "Эксперт", byID["expert"].Name)
	assert.Equal(t, "Эксперт: {viewer}! +{points}", byID["expert"].SplashTemplate)
	assert.Equal(t, "Мем", byID["meme"].Name)
	assert.Equal(t, "Мем для {viewer}! +{points}", byID["meme"].SplashTemplate)
	assert.Equal(t, "Решающая помощь", byID["clutch"].Name)
	assert.Equal(t, "Решающая помощь от {viewer}! +{points}", byID["clutch"].SplashTemplate)
	assert.Equal(t, "MVP", byID["mvp"].Name)
	assert.Equal(t, "MVP: {viewer}! +{points}", byID["mvp"].SplashTemplate)
}

func TestStarterCatalog_WhenFreshEnglishDatabase_ExpectEnglishSeeds(t *testing.T) {
	s, _ := openTestStoreWithLocale(t, "en-GB")

	commands, err := s.ListCommands()
	require.NoError(t, err)
	require.Len(t, commands, 2)

	byTrigger := map[string]store.Command{}
	for _, cmd := range commands {
		byTrigger[cmd.Trigger] = cmd
	}

	assert.Equal(t, "Good game, {viewer}!", byTrigger["gg"].SplashTemplate)
	assert.Equal(t, "Hi, {viewer}!", byTrigger["hi"].SplashTemplate)

	awards, err := s.ListAwards()
	require.NoError(t, err)
	require.Len(t, awards, 8)

	byID := map[string]store.AwardType{}
	for _, award := range awards {
		byID[award.ID] = award
	}

	assert.Equal(t, "Joke", byID["joke"].Name)
	assert.Equal(t, "Joke for {viewer}! +{points}", byID["joke"].SplashTemplate)
	assert.Equal(t, "Advice", byID["advice"].Name)
	assert.Equal(t, "Clutch Help", byID["clutch"].Name)
	assert.Equal(t, "Clutch Help for {viewer}! +{points}", byID["clutch"].SplashTemplate)
}

func TestStarterCatalog_WhenUpgradedExistingDatabase_ExpectCatalogUnchanged(t *testing.T) {
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
	migration08, err := os.ReadFile(filepath.Join(migrationsDir, "00008_splash_viewer_not_name.sql"))
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
	for _, stmt := range splitGooseStatements(string(migration08)) {
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

	s, err := store.Open(path, store.OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, s.Close())
	})

	commands, err := s.ListCommands()
	require.NoError(t, err)
	require.Len(t, commands, 2)

	byTrigger := map[string]store.Command{}
	for _, cmd := range commands {
		byTrigger[cmd.Trigger] = cmd
	}
	assert.Equal(t, "Good game, {viewer}!", byTrigger["gg"].SplashTemplate)
	assert.Equal(t, "Hi, {viewer}!", byTrigger["hi"].SplashTemplate)

	awards, err := s.ListAwards()
	require.NoError(t, err)
	require.GreaterOrEqual(t, len(awards), 2)

	byID := map[string]store.AwardType{}
	for _, award := range awards {
		byID[award.ID] = award
	}
	assert.Equal(t, "Joke", byID["joke"].Name)
	assert.Equal(t, "Joke for {viewer}! +{points}", byID["joke"].SplashTemplate)
	assert.Equal(t, "Advice", byID["advice"].Name)
	assert.Equal(t, "Advice for {viewer}! +{points}", byID["advice"].SplashTemplate)
}

func TestStarterCatalog_WhenLocaleChangesAfterInit_ExpectNoRetranslation(t *testing.T) {
	s, path := openTestStoreWithLocale(t, "en-GB")

	commandsBefore, err := s.ListCommands()
	require.NoError(t, err)
	require.NoError(t, s.Close())

	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, reopened.Close())
	})

	commandsAfter, err := reopened.ListCommands()
	require.NoError(t, err)
	require.Equal(t, commandsBefore, commandsAfter)
}

func TestStarterCatalog_WhenDeleteSeedAndReopen_ExpectStillAbsent(t *testing.T) {
	s, path := openTestStoreWithLocale(t, "ru-RU")

	require.NoError(t, s.DeleteCommand("gg"))
	require.NoError(t, s.DeleteAward("joke"))
	require.NoError(t, s.Close())

	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, reopened.Close())
	})

	commands, err := reopened.ListCommands()
	require.NoError(t, err)
	for _, cmd := range commands {
		assert.NotEqual(t, "gg", cmd.ID)
	}

	awards, err := reopened.ListAwards()
	require.NoError(t, err)
	for _, award := range awards {
		assert.NotEqual(t, "joke", award.ID)
	}
}

func TestStarterCatalog_WhenEmptyAfterInit_ExpectStillEmptyOnReopen(t *testing.T) {
	s, path := openTestStoreWithLocale(t, "ru-RU")

	commands, err := s.ListCommands()
	require.NoError(t, err)
	for _, cmd := range commands {
		require.NoError(t, s.DeleteCommand(cmd.ID))
	}

	awards, err := s.ListAwards()
	require.NoError(t, err)
	for _, award := range awards {
		require.NoError(t, s.DeleteAward(award.ID))
	}
	require.NoError(t, s.Close())

	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, reopened.Close())
	})

	commands, err = reopened.ListCommands()
	require.NoError(t, err)
	assert.Empty(t, commands)

	awards, err = reopened.ListAwards()
	require.NoError(t, err)
	assert.Empty(t, awards)
}

func TestStarterCatalog_WhenReopenFreshDatabase_ExpectIdempotent(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "comm-relay.db")

	s, err := store.Open(path, store.OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)

	commandsBefore, err := s.ListCommands()
	require.NoError(t, err)
	awardsBefore, err := s.ListAwards()
	require.NoError(t, err)
	require.NoError(t, s.Close())

	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, reopened.Close())
	})

	commandsAfter, err := reopened.ListCommands()
	require.NoError(t, err)
	awardsAfter, err := reopened.ListAwards()
	require.NoError(t, err)

	assert.Equal(t, commandsBefore, commandsAfter)
	assert.Equal(t, awardsBefore, awardsAfter)
}

func TestStarterCatalog_WhenBootstrapStateMissingFromMigratedDatabase_ExpectCatalogAdopted(t *testing.T) {
	s, path := openTestStoreWithLocale(t, "en-GB")
	require.NoError(t, s.Close())

	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	_, err = db.Exec(`DELETE FROM store_bootstrap WHERE key = 'starter_catalog_initialized'`)
	require.NoError(t, err)
	_, err = db.Exec(`DELETE FROM commands WHERE id = 'gg'`)
	require.NoError(t, err)
	_, err = db.Exec(`UPDATE award_types SET name = 'Custom joke' WHERE id = 'joke'`)
	require.NoError(t, err)
	require.NoError(t, db.Close())

	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, reopened.Close())
	})

	commands, err := reopened.ListCommands()
	require.NoError(t, err)
	for _, cmd := range commands {
		assert.NotEqual(t, "gg", cmd.ID)
	}

	awards, err := reopened.ListAwards()
	require.NoError(t, err)
	byID := map[string]store.AwardType{}
	for _, award := range awards {
		byID[award.ID] = award
	}
	assert.Equal(t, "Custom joke", byID["joke"].Name)
}

func TestStarterCatalog_WhenBootstrapInterruptedAfterMigrations_ExpectPersistedLocaleUsed(t *testing.T) {
	s, path := openTestStoreWithLocale(t, "en-GB")
	require.NoError(t, s.Close())

	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	_, err = db.Exec(
		`UPDATE store_bootstrap SET value = 'pending:ru-RU' WHERE key = 'starter_catalog_initialized'`,
	)
	require.NoError(t, err)
	require.NoError(t, db.Close())

	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, reopened.Close())
	})

	commands, err := reopened.ListCommands()
	require.NoError(t, err)
	byTrigger := map[string]store.Command{}
	for _, cmd := range commands {
		byTrigger[cmd.Trigger] = cmd
	}
	assert.Equal(t, "Хорошая игра, {viewer}!", byTrigger["gg"].SplashTemplate)

	awards, err := reopened.ListAwards()
	require.NoError(t, err)
	byID := map[string]store.AwardType{}
	for _, award := range awards {
		byID[award.ID] = award
	}
	assert.Equal(t, "Шутка", byID["joke"].Name)
}

func TestStarterCatalog_WhenUnsupportedLocale_ExpectRussianFallback(t *testing.T) {
	s, _ := openTestStoreWithLocale(t, "browser")

	commands, err := s.ListCommands()
	require.NoError(t, err)
	require.Len(t, commands, 2)

	byTrigger := map[string]store.Command{}
	for _, cmd := range commands {
		byTrigger[cmd.Trigger] = cmd
	}
	assert.Equal(t, "Хорошая игра, {viewer}!", byTrigger["gg"].SplashTemplate)
}

func TestStarterCatalog_WhenLocaleEmpty_ExpectRussianFallback(t *testing.T) {
	s, _ := openTestStoreWithLocale(t, "")

	commands, err := s.ListCommands()
	require.NoError(t, err)
	require.Len(t, commands, 2)

	byTrigger := map[string]store.Command{}
	for _, cmd := range commands {
		byTrigger[cmd.Trigger] = cmd
	}
	assert.Equal(t, "Хорошая игра, {viewer}!", byTrigger["gg"].SplashTemplate)
}
