package store_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestProgressionMetricValue_WhenDurableFactsExist_ExpectSixIndependentCounts(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "metrics", DisplayName: "Metrics"}
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{}, testDayResetHour, now))
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{}, testDayResetHour, now.Add(time.Minute)))
	viewerID, known := s.ViewerIDForIdentity("twitch", "metrics")
	require.True(t, known)
	_, err := s.GrantAward(store.GrantAwardInput{Identity: identity, AwardID: "spotter", AwardName: "Spotter", Points: 25, DayResetHour: testDayResetHour, Now: now})
	require.NoError(t, err)
	require.NoError(t, s.AppendInteractionEvent(store.AppendInteractionEventInput{Kind: store.InteractionEventCommand, ViewerID: viewerID, CommandID: "gg", CommandTrigger: "gg", Now: now}))
	require.NoError(t, s.StartSession(now.Add(2*time.Minute)))
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{}, testDayResetHour, now.Add(3*time.Minute)))
	contract, err := s.OpenViewerContract(store.OpenViewerContractInput{Title: "Metric contract", Objective: "Prove the metric", RewardID: "spotter", Now: now.Add(4 * time.Minute)})
	require.NoError(t, err)
	_, err = s.AwardViewerContract(store.AwardViewerContractInput{ID: contract.ID, ViewerID: viewerID, DayResetHour: testDayResetHour, Now: now.Add(5 * time.Minute)})
	require.NoError(t, err)

	// Act / Assert
	cases := []struct {
		metric  store.ProgressionMetric
		subject string
		want    int
	}{
		{store.ProgressionMetricMessageCount, "", 3},
		{store.ProgressionMetricXP, "", 50},
		{store.ProgressionMetricAwardCount, "spotter", 2},
		{store.ProgressionMetricCommandCount, "gg", 1},
		{store.ProgressionMetricSessionCount, "", 2},
		{store.ProgressionMetricContractWinCount, "", 1},
	}
	for _, test := range cases {
		t.Run(string(test.metric), func(t *testing.T) {
			got, err := s.ProgressionMetricValue(viewerID, test.metric, test.subject)
			require.NoError(t, err)
			assert.Equal(t, test.want, got)
		})
	}
}

func TestProgressionMetricValue_WhenSubjectIsDeleted_ExpectHistoricalValueWithoutNewFacts(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "deleted", DisplayName: "Deleted"}
	award, err := s.GrantAward(store.GrantAwardInput{Identity: identity, AwardID: "spotter", AwardName: "Spotter", Points: 25, DayResetHour: testDayResetHour, Now: now})
	require.NoError(t, err)
	require.NoError(t, s.DeleteAward("spotter"))

	// Act
	got, err := s.ProgressionMetricValue(award.ViewerID, store.ProgressionMetricAwardCount, "spotter")

	// Assert
	require.NoError(t, err)
	assert.Equal(t, 1, got)
}

func TestResolveProgressionLevel_WhenThresholdCrossed_ExpectHighestQualifiedLevel(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	_, err := s.CreateProgressionLevel(store.CreateProgressionLevelInput{ID: "level_1000", Title: "Elite", MinXP: 1000, Now: now})
	require.NoError(t, err)

	// Act
	level, err := s.ResolveProgressionLevel(1000)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, "level_1000", level.ID)
}
