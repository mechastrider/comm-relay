package store_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestApplyAward_WhenExistingViewer_ExpectScoreOnlyIncrement(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 3, 15, 12, 0, 0, 0, time.UTC)

	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:    "twitch",
		UserID:      "42",
		DisplayName: "Alice",
	}, defaultActivity(), testDayResetHour, now))

	_, err := s.ApplyAward(store.ChatIdentity{
		Platform:    "twitch",
		UserID:      "42",
		DisplayName: "Alice",
	}, 10, testDayResetHour, now.Add(time.Minute))
	require.NoError(t, err)

	id := viewerID(t, s, "twitch", "42", testDayResetHour, now.Add(time.Minute))
	viewer := getAt(t, s, id, testDayResetHour, now.Add(time.Minute))
	assert.Equal(t, 1, viewer.MessageCount)
	assert.Equal(t, 11, viewer.XP)
	assert.Equal(t, 1, viewer.SessionMessageCount)
	assert.Equal(t, 11, viewer.SessionXP)
	assert.Equal(t, 1, viewer.DayMessageCount)
	assert.Equal(t, 11, viewer.DayXP)
}

func TestApplyAward_WhenEmptyUserID_ExpectError(t *testing.T) {
	s, _ := openTestStore(t)

	_, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch",
		UserID:   "",
	}, 10, testDayResetHour, time.Now())
	assert.ErrorIs(t, err, store.ErrInvalidIdentity)
}

func TestApplyAward_WhenUnknownIdentity_ExpectViewerCreated(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 3, 15, 12, 0, 0, 0, time.UTC)

	result, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch",
		UserID:   "new-user",
	}, 10, testDayResetHour, now)
	require.NoError(t, err)
	require.NotEmpty(t, result.ViewerID)

	id := viewerID(t, s, "twitch", "new-user", testDayResetHour, now)
	viewer := getAt(t, s, id, testDayResetHour, now)
	assert.Equal(t, 0, viewer.MessageCount)
	assert.Equal(t, 10, viewer.XP)
}

func TestApplyAward_WhenDuplicateGrants_ExpectCumulativeScore(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 3, 15, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}

	require.NoError(t, s.ApplyChat(identity, defaultActivity(), testDayResetHour, now))
	_, err := s.ApplyAward(identity, 10, testDayResetHour, now.Add(time.Minute))
	require.NoError(t, err)
	_, err = s.ApplyAward(identity, 50, testDayResetHour, now.Add(2*time.Minute))
	require.NoError(t, err)

	id := viewerID(t, s, "twitch", "42", testDayResetHour, now.Add(2*time.Minute))
	viewer := getAt(t, s, id, testDayResetHour, now.Add(2*time.Minute))
	assert.Equal(t, 1, viewer.MessageCount)
	assert.Equal(t, 61, viewer.XP)
}

func TestApplyAward_WhenXPChangesOutsideThenInsideTopThree_ExpectMeaningfulFlag(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 3, 15, 12, 0, 0, 0, time.UTC)
	viewers := []struct {
		id     string
		points int
	}{
		{id: "one", points: 100},
		{id: "two", points: 90},
		{id: "three", points: 80},
		{id: "four", points: 10},
	}
	for index, viewer := range viewers {
		_, err := s.ApplyAward(store.ChatIdentity{
			Platform: "twitch",
			UserID:   viewer.id,
		}, viewer.points, testDayResetHour, now.Add(time.Duration(index)*time.Second))
		require.NoError(t, err)
	}

	lower, err := s.ApplyAward(store.ChatIdentity{Platform: "twitch", UserID: "four"}, 5, testDayResetHour, now.Add(time.Minute))
	require.NoError(t, err)
	require.False(t, lower.MeaningfulRankChange)

	newLeader, err := s.ApplyAward(store.ChatIdentity{Platform: "twitch", UserID: "four"}, 100, testDayResetHour, now.Add(2*time.Minute))
	require.NoError(t, err)
	require.True(t, newLeader.MeaningfulRankChange)
}
