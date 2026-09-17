package store_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestViewerSessionCount_WhenThreeChatSessions_ExpectListGetAndProgressionAgree(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "streams", DisplayName: "Streams"}
	activity := store.ActivitySettings{}
	require.NoError(t, s.ApplyChat(identity, activity, testDayResetHour, now))
	require.NoError(t, s.StartSession(now.Add(time.Minute)))
	require.NoError(t, s.ApplyChat(identity, activity, testDayResetHour, now.Add(2*time.Minute)))
	require.NoError(t, s.StartSession(now.Add(3*time.Minute)))
	require.NoError(t, s.ApplyChat(identity, activity, testDayResetHour, now.Add(4*time.Minute)))
	viewerID := viewerID(t, s, "twitch", "streams", testDayResetHour, now.Add(4*time.Minute))

	// Act
	list := listAt(t, s, "", testDayResetHour, now.Add(4*time.Minute))
	got := getAt(t, s, viewerID, testDayResetHour, now.Add(4*time.Minute))
	metric, err := s.ProgressionMetricValue(viewerID, store.ProgressionMetricSessionCount, "")

	// Assert
	require.NoError(t, err)
	assert.Equal(t, 3, metric)
	require.Len(t, list, 1)
	assert.Equal(t, 3, list[0].SessionCount)
	assert.Equal(t, 3, got.SessionCount)
}

func TestViewerSessionCount_WhenAwardOnlySession_ExpectSessionNotCounted(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "award-only", DisplayName: "Award"}
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{}, testDayResetHour, now))
	viewerID := viewerID(t, s, "twitch", "award-only", testDayResetHour, now)
	require.NoError(t, s.StartSession(now.Add(time.Minute)))
	_, err := s.GrantAward(store.GrantAwardInput{
		Identity:     identity,
		AwardID:      "spotter",
		AwardName:    "Spotter",
		Points:       10,
		DayResetHour: testDayResetHour,
		Now:          now.Add(2 * time.Minute),
	})
	require.NoError(t, err)

	// Act
	got := getAt(t, s, viewerID, testDayResetHour, now.Add(2*time.Minute))
	metric, err := s.ProgressionMetricValue(viewerID, store.ProgressionMetricSessionCount, "")

	// Assert
	require.NoError(t, err)
	assert.Equal(t, 1, got.SessionCount)
	assert.Equal(t, 1, metric)
}

func TestViewerSessionCount_WhenNewStream_ExpectLifetimeCountUnchanged(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "lifetime", DisplayName: "Lifetime"}
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{}, testDayResetHour, now))
	require.NoError(t, s.StartSession(now.Add(time.Minute)))
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{}, testDayResetHour, now.Add(2*time.Minute)))
	viewerID := viewerID(t, s, "twitch", "lifetime", testDayResetHour, now.Add(2*time.Minute))

	before := getAt(t, s, viewerID, testDayResetHour, now.Add(2*time.Minute))
	require.Equal(t, 2, before.SessionCount)
	require.Equal(t, 1, before.SessionMessageCount)

	// Act
	require.NoError(t, s.StartSession(now.Add(3*time.Minute)))
	after := getAt(t, s, viewerID, testDayResetHour, now.Add(4*time.Minute))

	// Assert
	assert.Equal(t, 2, after.SessionCount)
	assert.Equal(t, 0, after.SessionMessageCount)
	assert.Equal(t, before.MessageCount, after.MessageCount)
}

func TestViewerSessionCount_WhenAwardOnlyNeverChatted_ExpectZero(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "silent", DisplayName: "Silent"}
	_, err := s.GrantAward(store.GrantAwardInput{
		Identity:     identity,
		AwardID:      "spotter",
		AwardName:    "Spotter",
		Points:       10,
		DayResetHour: testDayResetHour,
		Now:          now,
	})
	require.NoError(t, err)
	viewerID, known := s.ViewerIDForIdentity("twitch", "silent")
	require.True(t, known)

	// Act
	got := getAt(t, s, viewerID, testDayResetHour, now)
	metric, err := s.ProgressionMetricValue(viewerID, store.ProgressionMetricSessionCount, "")

	// Assert
	require.NoError(t, err)
	assert.Equal(t, 0, got.SessionCount)
	assert.Equal(t, 0, metric)
}
