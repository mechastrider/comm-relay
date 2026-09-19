package store

import (
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	_ "modernc.org/sqlite"
)

func TestOnPointCatalogBootstrap_WhenFreshRussianDatabase_ExpectAwardAndAchievement(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := Open(path, OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	award, err := s.GetAward("on_point")
	require.NoError(t, err)
	assert.Equal(t, "В точку", award.Name)
	assert.Equal(t, 20, award.Points)
	assert.Equal(t, "В точку: {viewer}! +{points}", award.SplashTemplate)
	assert.Equal(t, "ping", award.Sound)
	assert.Equal(t, 5000, award.DurationMs)

	achievement, err := s.GetAchievement("achievement_on_point")
	require.NoError(t, err)
	assert.Equal(t, "Синхрон", achievement.Name)
	assert.Equal(t, "Получите десять наград «В точку».", achievement.Description)
	assert.Equal(t, ProgressionMetricAwardCount, achievement.Revision.Metric)
	assert.Equal(t, "on_point", achievement.Revision.SubjectID)
	assert.Equal(t, "В точку", achievement.Revision.SubjectLabel)
	assert.Equal(t, 10, achievement.Revision.Target)

	state, err := s.onPointCatalogBootstrapStateLocked()
	require.NoError(t, err)
	assert.Equal(t, "1", state)
}

func TestOnPointCatalogBootstrap_WhenFreshEnglishDatabase_ExpectLocalizedCopy(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	award, err := s.GetAward("on_point")
	require.NoError(t, err)
	assert.Equal(t, "On Point", award.Name)
	assert.Equal(t, "On Point: {viewer}! +{points}", award.SplashTemplate)

	achievement, err := s.GetAchievement("achievement_on_point")
	require.NoError(t, err)
	assert.Equal(t, "In Sync", achievement.Name)
	assert.Equal(t, "Receive ten On Point awards.", achievement.Description)
	assert.Equal(t, "On Point", achievement.Revision.SubjectLabel)
}

func TestOnPointCatalogBootstrap_WhenUpgradedDatabaseWithoutSeeds_ExpectInsertOnce(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 21))

	_, err = db.Exec(`INSERT INTO store_bootstrap (key, value) VALUES (?, '1'), (?, '1'), (?, '1')`,
		starterCatalogBootstrapKey, progressionBootstrapKey, socialCatalogBootstrapKey)
	require.NoError(t, err)
	_, err = db.Exec(`INSERT INTO store_bootstrap (key, value) VALUES (?, ?)`,
		onPointCatalogBootstrapKey, starterCatalogPendingPrefix+"ru-RU")
	require.NoError(t, err)
	require.NoError(t, db.Close())

	s, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	award, err := s.GetAward("on_point")
	require.NoError(t, err)
	assert.Equal(t, "В точку", award.Name)

	achievement, err := s.GetAchievement("achievement_on_point")
	require.NoError(t, err)
	assert.Equal(t, "Синхрон", achievement.Name)
}

func TestOnPointCatalogBootstrap_WhenCustomOnPointExists_ExpectRowUnchanged(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	db, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	goose.SetBaseFS(embedMigrations)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.UpTo(db, "migrations", 21))

	_, err = db.Exec(`INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms)
		VALUES ('on_point', 'Custom On Point', 99, 'Custom {viewer}! +{points}', 'chime', 3000)`)
	require.NoError(t, err)
	_, err = db.Exec(`INSERT INTO store_bootstrap (key, value) VALUES (?, '1'), (?, '1'), (?, '1')`,
		starterCatalogBootstrapKey, progressionBootstrapKey, socialCatalogBootstrapKey)
	require.NoError(t, err)
	_, err = db.Exec(`INSERT INTO store_bootstrap (key, value) VALUES (?, ?)`,
		onPointCatalogBootstrapKey, starterCatalogPendingPrefix+"en-GB")
	require.NoError(t, err)
	require.NoError(t, db.Close())

	s, err := Open(path, OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	award, err := s.GetAward("on_point")
	require.NoError(t, err)
	assert.Equal(t, "Custom On Point", award.Name)
	assert.Equal(t, 99, award.Points)
	assert.Equal(t, "Custom {viewer}! +{points}", award.SplashTemplate)
	assert.Equal(t, "chime", award.Sound)
	assert.Equal(t, 3000, award.DurationMs)
}

func TestOnPointCatalogBootstrap_WhenDeletedAndReopened_ExpectStillAbsent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := Open(path, OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	require.NoError(t, s.DeleteAward("on_point"))
	require.NoError(t, s.Close())

	reopened, err := Open(path, OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, reopened.Close()) })

	_, err = reopened.GetAward("on_point")
	require.ErrorIs(t, err, ErrAwardNotFound)
}

func TestOnPointCatalogBootstrap_WhenAchievementDeletedAndReopened_ExpectStillAbsent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := Open(path, OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	now := time.Date(2026, 9, 18, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.DeleteAchievement("achievement_on_point", now))
	require.NoError(t, s.Close())

	reopened, err := Open(path, OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, reopened.Close()) })

	_, err = reopened.GetAchievement("achievement_on_point")
	require.ErrorIs(t, err, ErrAchievementNotFound)

	achievements, err := reopened.ListAchievements()
	require.NoError(t, err)
	for _, achievement := range achievements {
		assert.NotEqual(t, "achievement_on_point", achievement.ID)
	}

	state, err := reopened.onPointCatalogBootstrapStateLocked()
	require.NoError(t, err)
	assert.Equal(t, "1", state)
}

func TestOnPointCatalogBootstrap_WhenTenthGrant_ExpectSyncUnlockWithoutBonusXP(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	now := time.Date(2026, 9, 18, 12, 0, 0, 0, time.UTC)
	identity := ChatIdentity{Platform: "twitch", UserID: "sync-viewer", Username: "sync", DisplayName: "Sync"}
	require.NoError(t, s.ApplyChat(identity, ActivitySettings{}, 6, now))

	var lastResult *ApplyAwardResult
	for i := range 10 {
		result, grantErr := s.GrantAward(GrantAwardInput{
			Identity:     identity,
			AwardID:      "on_point",
			AwardName:    "On Point",
			Points:       20,
			DayResetHour: 6,
			Now:          now.Add(time.Duration(i) * time.Minute),
		})
		require.NoError(t, grantErr)
		lastResult = result
	}

	var syncUnlocks []AchievementUnlock
	for _, unlock := range lastResult.Progression.Unlocks {
		if unlock.AchievementID == "achievement_on_point" {
			syncUnlocks = append(syncUnlocks, unlock)
		}
	}
	require.Len(t, syncUnlocks, 1)

	viewerID, known := s.ViewerIDForIdentity("twitch", "sync-viewer")
	require.True(t, known)
	xp, err := s.ProgressionMetricValue(viewerID, ProgressionMetricXP, "")
	require.NoError(t, err)
	assert.Equal(t, 200, xp)
}
