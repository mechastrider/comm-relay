package store

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoreExpertCatalog_WhenFreshDatabase_ExpectLocalizedAward(t *testing.T) {
	for _, tc := range []struct{ locale, name string }{
		{"ru-RU", "Знаток лора"}, {"en-GB", "Lore Expert"},
	} {
		t.Run(tc.locale, func(t *testing.T) {
			// Arrange / Act
			s, err := Open(filepath.Join(t.TempDir(), "comm-relay.db"), OpenOptions{TimeLocale: tc.locale})
			require.NoError(t, err)
			t.Cleanup(func() { require.NoError(t, s.Close()) })
			// Assert
			award, err := s.GetAward("lore_expert")
			require.NoError(t, err)
			assert.Equal(t, tc.name, award.Name)
			assert.Equal(t, 50, award.Points)
			assert.Equal(t, tc.name+": {viewer}! +{points}", award.SplashTemplate)
			assert.Equal(t, "chime", award.Sound)
			assert.Equal(t, 5000, award.DurationMs)
			assert.Equal(t, "fullscreen", award.Layout)
		})
	}
}

// Build a pre-feature database using the shipped migrations, without running Open.
func legacyLoreDatabase(t *testing.T) (string, *sql.DB) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.Up(db, "migrations"))
	return path, db
}

func TestLoreExpertCatalog_WhenUpgraded_ExpectAddedAndOtherAwardsPreserved(t *testing.T) {
	// Arrange
	path, db := legacyLoreDatabase(t)
	_, err := db.Exec(`UPDATE award_types SET name = 'My advice', points = 77 WHERE id = 'advice'`)
	require.NoError(t, err)
	require.NoError(t, db.Close())
	// Act
	s, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })
	// Assert
	award, err := s.GetAward("lore_expert")
	require.NoError(t, err)
	assert.Equal(t, "Lore Expert", award.Name)
	assert.Equal(t, 50, award.Points)
	advice, err := s.GetAward("advice")
	require.NoError(t, err)
	assert.Equal(t, "My advice", advice.Name)
	assert.Equal(t, 77, advice.Points)
}

func TestLoreExpertCatalog_WhenCustomRowExists_ExpectPreservedAcrossInitializationAndLocaleChange(t *testing.T) {
	// Arrange
	path, db := legacyLoreDatabase(t)
	_, err := db.Exec(`INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms, layout, sound_volume)
		VALUES ('lore_expert', 'My lore', 73, 'Custom {viewer}', 'soft', 3000, 'banner', 25)`)
	require.NoError(t, err)
	require.NoError(t, db.Close())
	// Act / Assert
	for _, locale := range []string{"ru-RU", "en-GB"} {
		s, openErr := Open(path, OpenOptions{TimeLocale: locale})
		require.NoError(t, openErr)
		t.Cleanup(func() { require.NoError(t, s.Close()) })
		award, getErr := s.GetAward("lore_expert")
		require.NoError(t, getErr)
		assert.Equal(t, "My lore", award.Name)
		assert.Equal(t, 73, award.Points)
		assert.Equal(t, "Custom {viewer}", award.SplashTemplate)
		assert.Equal(t, "soft", award.Sound)
		assert.Equal(t, 3000, award.DurationMs)
		assert.Equal(t, "banner", award.Layout)
		assert.Equal(t, 25, award.SoundVolume)
		require.NoError(t, s.Close())
	}
}

func TestLoreExpertCatalog_WhenDeletedAndLocaleChanged_ExpectAbsent(t *testing.T) {
	// Arrange
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := Open(path, OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })
	require.NoError(t, s.DeleteAward("lore_expert"))
	require.NoError(t, s.Close())
	// Act
	reopened, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, reopened.Close()) })
	// Assert
	_, err = reopened.GetAward("lore_expert")
	require.ErrorIs(t, err, ErrAwardNotFound)
}

func TestLoreExpertCatalog_WhenBootstrapFails_ExpectAtomicRetryInOriginalLocale(t *testing.T) {
	// Arrange
	path, db := legacyLoreDatabase(t)
	_, err := db.Exec(`CREATE TRIGGER fail_lore_marker BEFORE UPDATE ON store_bootstrap
		WHEN NEW.key = 'lore_expert_catalog_initialized' AND NEW.value = '1'
		BEGIN SELECT RAISE(ABORT, 'injected bootstrap failure'); END`)
	require.NoError(t, err)
	// Act
	_, err = Open(path, OpenOptions{TimeLocale: "ru-RU"})
	require.ErrorContains(t, err, "injected bootstrap failure")
	// Assert: award insert rolls back together with completion marker.
	var count int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM award_types WHERE id = 'lore_expert'`).Scan(&count))
	assert.Zero(t, count)
	var state string
	require.NoError(t, db.QueryRow(`SELECT value FROM store_bootstrap WHERE key = ?`, loreExpertCatalogBootstrapKey).Scan(&state))
	assert.Equal(t, "pending:ru-RU", state)
	_, err = db.Exec(`DROP TRIGGER fail_lore_marker`)
	require.NoError(t, err)
	require.NoError(t, db.Close())
	s, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })
	award, err := s.GetAward("lore_expert")
	require.NoError(t, err)
	assert.Equal(t, "Знаток лора", award.Name)
}
