package store_test

import (
	"sync"
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

func grantAwardByID(t *testing.T, s *store.Store, identity store.ChatIdentity, awardID, messageID string, now time.Time) (*store.ApplyAwardResult, error) {
	t.Helper()
	award, err := s.GetAward(awardID)
	require.NoError(t, err)
	input := store.GrantAwardInput{
		Identity:     identity,
		Points:       award.Points,
		DayResetHour: testDayResetHour,
		Now:          now,
		AwardID:      award.ID,
		AwardName:    award.Name,
	}
	if messageID != "" {
		input.MessagePlatform = identity.Platform
		input.MessageID = messageID
	}
	return s.GrantAward(input)
}

func TestGrantAward_WhenSameTypeTwiceOnMessage_ExpectConflictWithoutXP(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 19, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}
	require.NoError(t, s.ApplyChat(identity, defaultActivity(), testDayResetHour, now))

	_, err := grantAwardByID(t, s, identity, "like", "msg-like", now.Add(time.Minute))
	require.NoError(t, err)

	id := viewerID(t, s, "twitch", "42", testDayResetHour, now.Add(time.Minute))
	before := getAt(t, s, id, testDayResetHour, now.Add(time.Minute))
	beforeCount, err := s.CountInteractionEvents()
	require.NoError(t, err)

	_, err = grantAwardByID(t, s, identity, "like", "msg-like", now.Add(2*time.Minute))
	require.ErrorIs(t, err, store.ErrAwardAlreadyGranted)

	after := getAt(t, s, id, testDayResetHour, now.Add(2*time.Minute))
	afterCount, err := s.CountInteractionEvents()
	require.NoError(t, err)
	assert.Equal(t, before.XP, after.XP)
	assert.Equal(t, beforeCount, afterCount)

	granted, err := s.GrantedAwardIDsForMessages([]store.MessageRef{{Platform: "twitch", ID: "msg-like"}})
	require.NoError(t, err)
	assert.Equal(t, []string{"like"}, granted[store.MessageRef{Platform: "twitch", ID: "msg-like"}])
}

func TestGrantAward_WhenJokeThenAdviceOnSameMessage_ExpectBothSucceed(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 19, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}
	require.NoError(t, s.ApplyChat(identity, defaultActivity(), testDayResetHour, now))

	_, err := grantAwardByID(t, s, identity, "joke", "msg-1", now.Add(time.Minute))
	require.NoError(t, err)
	_, err = grantAwardByID(t, s, identity, "advice", "msg-1", now.Add(2*time.Minute))
	require.NoError(t, err)

	id := viewerID(t, s, "twitch", "42", testDayResetHour, now.Add(2*time.Minute))
	viewer := getAt(t, s, id, testDayResetHour, now.Add(2*time.Minute))
	assert.Equal(t, 36, viewer.XP)

	granted, err := s.GrantedAwardIDsForMessages([]store.MessageRef{{Platform: "twitch", ID: "msg-1"}})
	require.NoError(t, err)
	assert.Equal(t, []string{"joke", "advice"}, granted[store.MessageRef{Platform: "twitch", ID: "msg-1"}])
}

func TestGrantAward_WhenMissingMessageID_ExpectRepeatsAllowed(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 19, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}
	require.NoError(t, s.ApplyChat(identity, defaultActivity(), testDayResetHour, now))

	_, err := grantAwardByID(t, s, identity, "joke", "", now.Add(time.Minute))
	require.NoError(t, err)
	_, err = grantAwardByID(t, s, identity, "joke", "", now.Add(2*time.Minute))
	require.NoError(t, err)

	id := viewerID(t, s, "twitch", "42", testDayResetHour, now.Add(2*time.Minute))
	viewer := getAt(t, s, id, testDayResetHour, now.Add(2*time.Minute))
	assert.Equal(t, 21, viewer.XP)
}

func TestGrantAward_WhenConcurrentSameType_ExpectOneConflict(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 19, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}
	require.NoError(t, s.ApplyChat(identity, defaultActivity(), testDayResetHour, now))

	start := make(chan struct{})
	results := make(chan error, 2)
	var wg sync.WaitGroup
	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			_, grantErr := grantAwardByID(t, s, identity, "like", "msg-race", now.Add(time.Minute))
			results <- grantErr
		}()
	}
	close(start)
	wg.Wait()
	close(results)

	var success, conflict int
	for grantErr := range results {
		if grantErr == nil {
			success++
			continue
		}
		require.ErrorIs(t, grantErr, store.ErrAwardAlreadyGranted)
		conflict++
	}
	assert.Equal(t, 1, success)
	assert.Equal(t, 1, conflict)

	id := viewerID(t, s, "twitch", "42", testDayResetHour, now.Add(time.Minute))
	viewer := getAt(t, s, id, testDayResetHour, now.Add(time.Minute))
	assert.Equal(t, 6, viewer.XP)
}

func TestGrantedAwardIDsForMessages_WhenNoAwards_ExpectEmpty(t *testing.T) {
	s, _ := openTestStore(t)
	granted, err := s.GrantedAwardIDsForMessages([]store.MessageRef{{Platform: "twitch", ID: "plain"}})
	require.NoError(t, err)
	assert.Empty(t, granted)
}

func TestGrantedAwardIDsForMessages_WhenHistoricalDuplicates_ExpectUniqueOldestFirst(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 19, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}
	require.NoError(t, s.ApplyChat(identity, defaultActivity(), testDayResetHour, now))

	result, err := grantAwardByID(t, s, identity, "joke", "msg-dup", now.Add(time.Minute))
	require.NoError(t, err)

	require.NoError(t, s.AppendInteractionEvent(store.AppendInteractionEventInput{
		Kind:            store.InteractionEventAward,
		ViewerID:        result.ViewerID,
		AwardID:         "joke",
		AwardName:       "Joke",
		Points:          10,
		MessagePlatform: "twitch",
		MessageID:       "msg-dup",
		Now:             now.Add(2 * time.Minute),
	}))
	_, err = grantAwardByID(t, s, identity, "advice", "msg-dup", now.Add(3*time.Minute))
	require.NoError(t, err)

	granted, err := s.GrantedAwardIDsForMessages([]store.MessageRef{{Platform: "twitch", ID: "msg-dup"}})
	require.NoError(t, err)
	assert.Equal(t, []string{"joke", "advice"}, granted[store.MessageRef{Platform: "twitch", ID: "msg-dup"}])
}
