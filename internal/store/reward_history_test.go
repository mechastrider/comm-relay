package store_test

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestGrantAward_WhenEventInsertFails_ExpectNoXPOrJournalCommit(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}
	require.NoError(t, s.ApplyChat(identity, disabledActivity(), testDayResetHour, now))
	viewerID := viewerID(t, s, "twitch", "42", testDayResetHour, now)
	before := getAt(t, s, viewerID, testDayResetHour, now)
	s.SetInteractionEventInsertHookForTest(func() error { return errors.New("event insert failed") })
	t.Cleanup(func() { s.SetInteractionEventInsertHookForTest(nil) })

	// Act
	_, err := s.GrantAward(store.GrantAwardInput{
		Identity:     identity,
		Points:       10,
		DayResetHour: testDayResetHour,
		Now:          now.Add(time.Second),
		AwardID:      "joke",
		AwardName:    "Joke",
	})

	// Assert
	require.Error(t, err)
	after := getAt(t, s, viewerID, testDayResetHour, now.Add(time.Second))
	assert.Equal(t, before.XP, after.XP)
	assert.Equal(t, before.SessionXP, after.SessionXP)
	assert.Equal(t, before.DayXP, after.DayXP)
	events, listErr := s.ListInteractionEventsByViewer(viewerID)
	require.NoError(t, listErr)
	assert.Empty(t, events)
}

func TestRewardHistory_WhenPaginatedAcrossEqualTimestamps_ExpectCompleteAwardOnlyTraversal(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
	alice := store.ChatIdentity{Platform: "twitch", UserID: "alice", DisplayName: "Alice"}
	bob := store.ChatIdentity{Platform: "youtube", UserID: "bob", DisplayName: "Bob"}
	grant := func(identity store.ChatIdentity, awardID, awardName string, at time.Time) *store.ApplyAwardResult {
		result, err := s.GrantAward(store.GrantAwardInput{
			Identity:     identity,
			Points:       10,
			DayResetHour: testDayResetHour,
			Now:          at,
			AwardID:      awardID,
			AwardName:    awardName,
		})
		require.NoError(t, err)
		return result
	}
	aliceResult := grant(alice, "joke", "Joke", now)
	grant(bob, "advice", "Advice", now)
	grant(alice, "mvp", "MVP", now.Add(time.Nanosecond))
	require.NoError(t, s.AppendInteractionEvent(store.AppendInteractionEventInput{
		Kind:           store.InteractionEventCommand,
		ViewerID:       aliceResult.ViewerID,
		CommandTrigger: "gg",
		Now:            now.Add(2 * time.Nanosecond),
	}))
	require.NoError(t, s.AppendInteractionEvent(store.AppendInteractionEventInput{
		Kind:     store.InteractionEventActivity,
		ViewerID: aliceResult.ViewerID,
		Points:   1,
		Now:      now.Add(3 * time.Nanosecond),
	}))

	// Act
	first, err := s.ListRewardHistory(store.RewardHistoryQuery{Limit: 2})
	require.NoError(t, err)
	second, err := s.ListRewardHistory(store.RewardHistoryQuery{Limit: 2, Cursor: first.NextCursor})
	require.NoError(t, err)
	scoped, err := s.ListRewardHistory(store.RewardHistoryQuery{ViewerID: aliceResult.ViewerID, Limit: 50})
	require.NoError(t, err)

	// Assert
	require.Len(t, first.Entries, 2)
	require.NotEmpty(t, first.NextCursor)
	require.Len(t, second.Entries, 1)
	assert.Empty(t, second.NextCursor)
	seen := map[string]bool{}
	for _, entry := range append(first.Entries, second.Entries...) {
		assert.Equal(t, store.InteractionEventAward, entry.Kind)
		assert.False(t, seen[entry.ID], "duplicate history entry")
		seen[entry.ID] = true
	}
	assert.Len(t, seen, 3)
	require.Len(t, scoped.Entries, 2)
	for _, entry := range scoped.Entries {
		assert.Equal(t, aliceResult.ViewerID, entry.ViewerID)
		assert.Equal(t, "Alice", entry.ViewerDisplayName)
	}
}

func TestRewardHistory_WhenViewerMerged_ExpectEntriesOnSurvivorOnly(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
	from, err := s.GrantAward(store.GrantAwardInput{
		Identity:     store.ChatIdentity{Platform: "twitch", UserID: "from", DisplayName: "From"},
		Points:       10,
		DayResetHour: testDayResetHour,
		Now:          now,
		AwardID:      "joke",
		AwardName:    "Joke",
	})
	require.NoError(t, err)
	into, err := s.ApplyAward(store.ChatIdentity{Platform: "youtube", UserID: "into", DisplayName: "Into"}, 1, testDayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, s.Merge(from.ViewerID, into.ViewerID, testDayResetHour, now.Add(time.Second)))

	// Act
	survivor, err := s.ListRewardHistory(store.RewardHistoryQuery{ViewerID: into.ViewerID})
	require.NoError(t, err)
	_, hiddenErr := s.ListRewardHistory(store.RewardHistoryQuery{ViewerID: from.ViewerID})

	// Assert
	require.Len(t, survivor.Entries, 1)
	assert.Equal(t, into.ViewerID, survivor.Entries[0].ViewerID)
	assert.ErrorIs(t, hiddenErr, store.ErrNotFound)
}

func TestRewardHistory_WhenInvalidInput_ExpectTypedError(t *testing.T) {
	s, _ := openTestStore(t)
	_, err := s.ListRewardHistory(store.RewardHistoryQuery{Limit: 101})
	assert.ErrorIs(t, err, store.ErrInvalidRewardHistoryLimit)
	_, err = s.ListRewardHistory(store.RewardHistoryQuery{Cursor: "not-a-cursor"})
	assert.ErrorIs(t, err, store.ErrInvalidRewardHistoryCursor)
}

func TestGrantAward_WhenDuplicateAndCatalogChangesAfterRestart_ExpectDurableSnapshots(t *testing.T) {
	// Arrange
	s, path := openTestStore(t)
	now := time.Date(2026, 9, 3, 12, 0, 0, 0, time.UTC)
	input := store.GrantAwardInput{
		Identity:     store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"},
		Points:       10,
		DayResetHour: testDayResetHour,
		Now:          now,
		AwardID:      "joke",
		AwardName:    "Joke at grant time",
	}
	first, err := s.GrantAward(input)
	require.NoError(t, err)
	input.Now = now.Add(time.Second)
	second, err := s.GrantAward(input)
	require.NoError(t, err)
	require.Equal(t, first.ViewerID, second.ViewerID)
	require.NoError(t, s.Close())

	// Act
	reopened, err := store.Open(filepath.Clean(path), store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, reopened.Close()) })
	_, err = reopened.UpdateAward(store.UpdateAwardInput{
		ID:             "joke",
		Name:           "Renamed Joke",
		Points:         10,
		SplashTemplate: "Joke for {viewer}",
		Sound:          "soft",
		DurationMs:     5000,
	})
	require.NoError(t, err)
	require.NoError(t, reopened.DeleteAward("joke"))
	page, err := reopened.ListRewardHistory(store.RewardHistoryQuery{ViewerID: first.ViewerID})
	require.NoError(t, err)
	viewer := getAt(t, reopened, first.ViewerID, testDayResetHour, now.Add(time.Second))

	// Assert
	require.Len(t, page.Entries, 2)
	for _, entry := range page.Entries {
		assert.Equal(t, "Joke at grant time", entry.RewardName)
		assert.Equal(t, "joke", entry.RewardID)
	}
	assert.Equal(t, 20, viewer.XP)
	assert.Equal(t, 20, viewer.SessionXP)
	assert.Equal(t, 20, viewer.DayXP)
}
