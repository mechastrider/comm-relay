package store_test

import (
	"testing"
	"time"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestEvaluateProgression_WhenRepeatableThresholdCrossed_ExpectAllNewOccurrencesOnce(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 13, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "repeat", DisplayName: "Repeat"}
	for range 10 {
		require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{}, testDayResetHour, now))
	}
	viewerID, known := s.ViewerIDForIdentity("twitch", "repeat")
	require.True(t, known)
	_, err := s.CreateAchievement(store.CreateAchievementInput{ID: "repeat_messages", Name: "Repeat messages", Enabled: true, Metric: store.ProgressionMetricMessageCount, Target: 5, Repeatable: true, Now: now})
	require.NoError(t, err)

	// Act
	first, err := s.EvaluateProgression(store.ProgressionEvaluationInput{ViewerID: viewerID, CauseMetric: store.ProgressionMetricMessageCount, Now: now})
	require.NoError(t, err)
	second, err := s.EvaluateProgression(store.ProgressionEvaluationInput{ViewerID: viewerID, CauseMetric: store.ProgressionMetricMessageCount, Now: now.Add(time.Minute)})
	require.NoError(t, err)

	// Assert
	var repeated []store.AchievementUnlock
	for _, unlock := range first.Unlocks {
		if unlock.AchievementID == "repeat_messages" {
			repeated = append(repeated, unlock)
		}
	}
	require.Len(t, repeated, 2)
	assert.Equal(t, 1, repeated[0].Occurrence)
	assert.Equal(t, 2, repeated[1].Occurrence)
	assert.Empty(t, second.Unlocks)
}

func TestEvaluateProgression_WhenLevelChanges_ExpectDerivedTransitionWithoutXPBonus(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 13, 0, 0, 0, time.UTC)
	_, err := s.CreateProgressionLevel(store.CreateProgressionLevelInput{ID: "fifty", Title: "Fifty", MinXP: 50, Announce: true, Now: now})
	require.NoError(t, err)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "level", DisplayName: "Level"}
	award, err := s.GrantAward(store.GrantAwardInput{Identity: identity, AwardID: "spotter", AwardName: "Spotter", Points: 50, DayResetHour: testDayResetHour, Now: now})
	require.NoError(t, err)

	// Act
	result, err := s.EvaluateProgression(store.ProgressionEvaluationInput{ViewerID: award.ViewerID, CauseMetric: store.ProgressionMetricXP, PreviousXP: 0, HasPreviousXP: true, Now: now})

	// Assert
	require.NoError(t, err)
	require.NotNil(t, result.PreviousLevel)
	require.NotNil(t, result.CurrentLevel)
	assert.NotEqual(t, result.PreviousLevel.ID, result.CurrentLevel.ID)
	xp, err := s.ProgressionMetricValue(award.ViewerID, store.ProgressionMetricXP, "")
	require.NoError(t, err)
	assert.Equal(t, 50, xp)
}

func TestAppendInteractionEvent_WhenFactWriteFails_ExpectNoCommandUnlock(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 13, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "rollback", DisplayName: "Rollback"}
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{}, testDayResetHour, now))
	viewerID, known := s.ViewerIDForIdentity("twitch", "rollback")
	require.True(t, known)
	_, err := s.CreateAchievement(store.CreateAchievementInput{ID: "command_unlock", Name: "Command unlock", Enabled: true, Metric: store.ProgressionMetricCommandCount, SubjectID: "gg", SubjectLabel: "gg", Target: 1, Now: now})
	require.NoError(t, err)
	s.SetInteractionEventInsertHookForTest(func() error { return errors.New("injected failure") })

	// Act
	bundle, err := s.AppendInteractionEventResult(store.AppendInteractionEventInput{Kind: store.InteractionEventCommand, ViewerID: viewerID, CommandID: "gg", CommandTrigger: "gg", Now: now})
	s.SetInteractionEventInsertHookForTest(nil)

	// Assert
	require.Error(t, err)
	assert.Empty(t, bundle.Unlocks)
	unlockHistory, listErr := s.ListAchievementUnlocks(viewerID)
	require.NoError(t, listErr)
	for _, unlock := range unlockHistory {
		assert.NotEqual(t, "command_unlock", unlock.AchievementID)
	}
}

func TestAppendInteractionEventResult_WhenCommandUnlocks_ExpectOnePostCommitBundle(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 13, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "bundle", DisplayName: "Bundle"}
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{}, testDayResetHour, now))
	viewerID, known := s.ViewerIDForIdentity("twitch", "bundle")
	require.True(t, known)
	command, err := s.CreateCommand(store.CreateCommandInput{ID: "bundle_command", Trigger: "bundle", Enabled: true, SplashTemplate: "{viewer}", DurationMs: 3000})
	require.NoError(t, err)
	_, err = s.CreateAchievement(store.CreateAchievementInput{ID: "bundle_command", Name: "Bundle command", Enabled: true, Metric: store.ProgressionMetricCommandCount, SubjectID: command.ID, SubjectLabel: command.Trigger, Target: 1, Now: now})
	require.NoError(t, err)

	// Act
	bundle, err := s.AppendInteractionEventResult(store.AppendInteractionEventInput{Kind: store.InteractionEventCommand, ViewerID: viewerID, CommandID: command.ID, CommandTrigger: command.Trigger, Now: now})

	// Assert
	require.NoError(t, err)
	require.Len(t, bundle.Evaluations, 1)
	require.Len(t, bundle.Unlocks, 1)
	assert.Equal(t, "bundle_command", bundle.Unlocks[0].AchievementID)
	assert.NotEmpty(t, bundle.Unlocks[0].ID)
}
