package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestReconcileProgression_WhenRuleAddedAfterFacts_ExpectSilentBackfilledUnlockAndCompletedCheckpoint(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 14, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "reconcile", DisplayName: "Reconcile"}
	for range 3 {
		require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{}, testDayResetHour, now))
	}
	viewerID, known := s.ViewerIDForIdentity("twitch", "reconcile")
	require.True(t, known)
	_, err := s.CreateAchievement(store.CreateAchievementInput{ID: "historical_messages", Name: "Historical messages", Enabled: true, Metric: store.ProgressionMetricMessageCount, Target: 3, Now: now})
	require.NoError(t, err)

	// Act
	require.NoError(t, s.ReconcileProgression(context.Background(), 1))

	// Assert
	history, err := s.ListAchievementUnlocks(viewerID)
	require.NoError(t, err)
	var historical *store.AchievementUnlock
	for i := range history {
		if history[i].AchievementID == "historical_messages" {
			historical = &history[i]
			break
		}
	}
	require.NotNil(t, historical)
	assert.True(t, historical.Backfilled)
	status, err := s.GetProgressionReconciliationStatus()
	require.NoError(t, err)
	assert.Equal(t, "idle", status.Status)
	assert.Equal(t, status.RequestedGeneration, status.CompletedGeneration)
	assert.Empty(t, status.LastViewerID)
}

func TestReconcileProgression_WhenCanceled_ExpectResumablePausedCheckpoint(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	// Act
	require.NoError(t, s.ReconcileProgression(ctx, 1))

	// Assert
	status, err := s.GetProgressionReconciliationStatus()
	require.NoError(t, err)
	assert.Equal(t, "paused", status.Status)
	assert.Less(t, status.CompletedGeneration, status.RequestedGeneration)
}
