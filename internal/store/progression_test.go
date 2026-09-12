package store_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestProgressionCatalog_WhenCreatingUpdatingAndDeleting_ExpectBoundedRevisionedState(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 11, 12, 0, 0, 0, time.UTC)

	// Act
	level, err := s.CreateProgressionLevel(store.CreateProgressionLevelInput{ID: "level_operator", Title: "Operator", MinXP: 750, Announce: true, Now: now})
	require.NoError(t, err)
	updatedLevel, err := s.UpdateProgressionLevel(store.UpdateProgressionLevelInput{ID: level.ID, Title: "Veteran operator", MinXP: 750, Announce: false, Now: now.Add(time.Minute)})
	require.NoError(t, err)
	achievement, err := s.CreateAchievement(store.CreateAchievementInput{ID: "award_spotter_twice", Name: "Spotter twice", Description: "Two awards", Enabled: true, Announce: true, Metric: store.ProgressionMetricAwardCount, SubjectID: "spotter", SubjectLabel: "Spotter", Target: 2, Now: now})
	require.NoError(t, err)
	updatedAchievement, err := s.UpdateAchievement(store.UpdateAchievementInput{ID: achievement.ID, Name: "Spotter twice", Description: "Two awards", Enabled: true, Announce: true, Repeatable: true, Metric: store.ProgressionMetricAwardCount, SubjectID: "spotter", SubjectLabel: "Spotter", Target: 2, Now: now.Add(time.Minute)})
	require.NoError(t, err)

	// Assert
	assert.Equal(t, "Veteran operator", updatedLevel.Title)
	assert.Equal(t, 2, updatedAchievement.ActiveRevision)
	assert.True(t, updatedAchievement.Revision.Repeatable)
	require.NoError(t, s.DeleteProgressionLevel(level.ID))
	require.NoError(t, s.DeleteAchievement(achievement.ID, now.Add(2*time.Minute)))
	_, err = s.GetAchievement(achievement.ID)
	assert.ErrorIs(t, err, store.ErrAchievementNotFound)
}

func TestProgressionUnlockSettingsAndStatus_WhenRetried_ExpectPersistentIdempotentState(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 11, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{Platform: "twitch", UserID: "progress", DisplayName: "Progress"}, store.ActivitySettings{}, testDayResetHour, now))
	viewerID, known := s.ViewerIDForIdentity("twitch", "progress")
	require.True(t, known)

	// Act
	inserted, err := s.InsertAchievementUnlock(store.InsertAchievementUnlockInput{ViewerID: viewerID, AchievementID: "achievement_contractor", Revision: 1, Occurrence: 1, ProgressValue: 1, Name: "Contractor", UnlockedAt: now})
	require.NoError(t, err)
	retried, err := s.InsertAchievementUnlock(store.InsertAchievementUnlockInput{ViewerID: viewerID, AchievementID: "achievement_contractor", Revision: 1, Occurrence: 1, ProgressValue: 1, Name: "Contractor", UnlockedAt: now})
	require.NoError(t, err)
	settings, err := s.UpdateProgressionAlertSettings(store.ProgressionAlertSettings{AchievementEnabled: true, Layout: "card", SoundVolume: 70, DurationMs: 5000}, now)
	require.NoError(t, err)
	status, err := s.UpdateProgressionReconciliationStatus(store.ProgressionReconciliationStatus{BootstrapState: "complete", RequestedGeneration: 2, CompletedGeneration: 1, Status: "running", LastViewerID: viewerID}, now)
	require.NoError(t, err)

	// Assert
	assert.True(t, inserted)
	assert.False(t, retried)
	unlockHistory, err := s.ListAchievementUnlocks(viewerID)
	require.NoError(t, err)
	require.Len(t, unlockHistory, 2)
	assert.True(t, settings.AchievementEnabled)
	assert.Equal(t, "running", status.Status)
	assert.Equal(t, viewerID, status.LastViewerID)
}

func TestProgressionCatalog_WhenInvalidInput_ExpectNoPersistentChange(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)

	// Act
	_, err := s.CreateAchievement(store.CreateAchievementInput{Name: "Invalid", Enabled: true, Metric: store.ProgressionMetricAwardCount, Target: 1})

	// Assert
	assert.ErrorIs(t, err, store.ErrProgressionValidation)
	levels, listErr := s.ListProgressionLevels()
	require.NoError(t, listErr)
	assert.NotEmpty(t, levels)
}
