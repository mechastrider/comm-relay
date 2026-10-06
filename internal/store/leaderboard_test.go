package store_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestLeaderboard_WhenSessionXP_ExpectOrderedByXPThenMessages(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)

	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "1", DisplayName: "Low",
	}, defaultActivity(), testDayResetHour, now))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "2", DisplayName: "High",
	}, disabledActivity(), testDayResetHour, now))
	_, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "2", DisplayName: "High",
	}, 5, testDayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "3", DisplayName: "TieScore",
	}, disabledActivity(), testDayResetHour, now))
	_, err = s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "3", DisplayName: "TieScore",
	}, 3, testDayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "3", DisplayName: "TieScore",
	}, disabledActivity(), testDayResetHour, now.Add(time.Minute)))

	entries, err := s.Leaderboard("session", 20, testDayResetHour, now.Add(time.Minute), true)
	require.NoError(t, err)
	require.Len(t, entries, 3)
	assert.Equal(t, 1, entries[0].Rank)
	assert.Equal(t, "High", entries[0].DisplayName)
	assert.Equal(t, 5, entries[0].XP)
	assert.Equal(t, "TieScore", entries[1].DisplayName)
	assert.Equal(t, 3, entries[1].XP)
	assert.Equal(t, 2, entries[1].MessageCount)
	assert.Equal(t, "Low", entries[2].DisplayName)
}

func TestLeaderboard_WhenInvalidPeriod_ExpectSession(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, disabledActivity(), testDayResetHour, now))
	_, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, 2, testDayResetHour, now)
	require.NoError(t, err)

	entries, err := s.Leaderboard("week", 20, testDayResetHour, now, true)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	assert.Equal(t, 2, entries[0].XP)
}

func TestLeaderboard_WhenZeroXPAndZeroMessages_ExpectOmitted(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, defaultActivity(), testDayResetHour, now))
	require.NoError(t, s.StartSession(now.Add(time.Hour)))

	entries, err := s.Leaderboard("session", 20, testDayResetHour, now.Add(time.Hour), true)
	require.NoError(t, err)
	assert.Empty(t, entries)
}

func TestLeaderboard_WhenHiddenMergeSource_ExpectOmitted(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "1", DisplayName: "A",
	}, disabledActivity(), testDayResetHour, now))
	_, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "1", DisplayName: "A",
	}, 2, testDayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "youtube", UserID: "2", DisplayName: "B",
	}, disabledActivity(), testDayResetHour, now))
	_, err = s.ApplyAward(store.ChatIdentity{
		Platform: "youtube", UserID: "2", DisplayName: "B",
	}, 3, testDayResetHour, now)
	require.NoError(t, err)
	fromID := viewerID(t, s, "twitch", "1", testDayResetHour, now)
	intoID := viewerID(t, s, "youtube", "2", testDayResetHour, now)
	require.NoError(t, s.Merge(fromID, intoID, testDayResetHour, now))

	entries, err := s.Leaderboard("all", 20, testDayResetHour, now, true)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	assert.Equal(t, 5, entries[0].XP)
}

func TestLeaderboard_WhenSessionPeriod_ExpectLevelFromAllTimeXP(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}
	_, err := s.ApplyAward(identity, 150, testDayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, s.StartSession(now.Add(2*time.Hour)))
	require.NoError(t, s.ApplyChat(identity, disabledActivity(), testDayResetHour, now.Add(2*time.Hour)))

	entries, err := s.Leaderboard("session", 20, testDayResetHour, now.Add(2*time.Hour), true)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	assert.Equal(t, 0, entries[0].XP)
	require.NotNil(t, entries[0].Level)
	assert.Equal(t, "Regular", entries[0].Level.Title)
}

func TestLeaderboard_WhenAllPeriod_ExpectAllTimeCounters(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, disabledActivity(), testDayResetHour, now))
	_, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, 4, testDayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, s.StartSession(now.Add(2*time.Hour)))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, defaultActivity(), testDayResetHour, now.Add(2*time.Hour)))

	allEntries, err := s.Leaderboard("all", 20, testDayResetHour, now.Add(2*time.Hour), true)
	require.NoError(t, err)
	require.Len(t, allEntries, 1)
	assert.Equal(t, 5, allEntries[0].XP)
	assert.Equal(t, 2, allEntries[0].MessageCount)

	sessionEntries, err := s.Leaderboard("session", 20, testDayResetHour, now.Add(2*time.Hour), true)
	require.NoError(t, err)
	require.Len(t, sessionEntries, 1)
	assert.Equal(t, 1, sessionEntries[0].XP)
}

func TestLeaderboard_WhenDisplayNameOverride_ExpectOverrideUsed(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, defaultActivity(), testDayResetHour, now))
	id := viewerID(t, s, "twitch", "42", testDayResetHour, now)
	require.NoError(t, s.UpdateDisplayName(id, "Commander"))

	entries, err := s.Leaderboard("all", 20, testDayResetHour, now, true)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	assert.Equal(t, "Commander", entries[0].DisplayName)
}

func TestLeaderboard_WhenLimitZero_ExpectDefaultCap(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	for i := range 25 {
		require.NoError(t, s.ApplyChat(store.ChatIdentity{
			Platform: "twitch", UserID: fmt.Sprintf("user-%d", i), DisplayName: "Viewer",
		}, defaultActivity(), testDayResetHour, now))
	}

	entries, err := s.Leaderboard("all", 0, testDayResetHour, now, true)
	require.NoError(t, err)
	assert.Len(t, entries, 5)
}

func TestLeaderboard_WhenLeaderboardHidden_ExpectOmittedAndReranked(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "1", DisplayName: "Top",
	}, disabledActivity(), testDayResetHour, now))
	_, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "1", DisplayName: "Top",
	}, 5, testDayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "2", DisplayName: "Second",
	}, disabledActivity(), testDayResetHour, now))
	_, err = s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "2", DisplayName: "Second",
	}, 3, testDayResetHour, now)
	require.NoError(t, err)

	topID := viewerID(t, s, "twitch", "1", testDayResetHour, now)
	require.NoError(t, s.UpdateLeaderboardHidden(topID, true))

	entries, err := s.Leaderboard("all", 20, testDayResetHour, now, true)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	assert.Equal(t, 1, entries[0].Rank)
	assert.Equal(t, "Second", entries[0].DisplayName)

	viewer, err := s.Get(topID, testDayResetHour, now)
	require.NoError(t, err)
	assert.True(t, viewer.LeaderboardHidden)
}

func TestLeaderboard_WhenChannelLoginMatches_ExpectOwnerOmittedAndReranked(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "broadcaster", Username: "MechaStrider", DisplayName: "Mecha",
	}, disabledActivity(), testDayResetHour, now))
	_, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "broadcaster", Username: "MechaStrider", DisplayName: "Mecha",
	}, 9, testDayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "viewer", Username: "alice", DisplayName: "Alice",
	}, disabledActivity(), testDayResetHour, now))
	_, err = s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "viewer", Username: "alice", DisplayName: "Alice",
	}, 2, testDayResetHour, now)
	require.NoError(t, err)

	changed, err := s.SyncChannelOwners(store.NewChannelAccounts("#MechaStrider", "", ""))
	require.NoError(t, err)
	assert.True(t, changed)

	entries, err := s.Leaderboard("all", 20, testDayResetHour, now, true)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	assert.Equal(t, 1, entries[0].Rank)
	assert.Equal(t, "Alice", entries[0].DisplayName)

	ownerID := viewerID(t, s, "twitch", "broadcaster", testDayResetHour, now)
	owner, err := s.Get(ownerID, testDayResetHour, now)
	require.NoError(t, err)
	assert.False(t, owner.LeaderboardHidden)
}

func TestLeaderboard_WhenOwnerBadge_ExpectMarkedAndOmitted(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "youtube", UserID: "UC-owner", Username: "Channel", DisplayName: "Channel",
	}, disabledActivity(), testDayResetHour, now))
	_, err := s.ApplyAward(store.ChatIdentity{
		Platform: "youtube", UserID: "UC-owner", Username: "Channel", DisplayName: "Channel",
	}, 4, testDayResetHour, now)
	require.NoError(t, err)

	before, err := s.Leaderboard("all", 20, testDayResetHour, now, true)
	require.NoError(t, err)
	require.Len(t, before, 1)

	assert.True(t, store.IdentityIsChannelOwner("youtube", "Channel", "Channel", "UC-owner", []string{"owner"}, store.ChannelAccounts{}))
	marked, err := s.MarkChannelOwner("youtube", "UC-owner")
	require.NoError(t, err)
	assert.True(t, marked)
	markedAgain, err := s.MarkChannelOwner("youtube", "UC-owner")
	require.NoError(t, err)
	assert.False(t, markedAgain)

	entries, err := s.Leaderboard("all", 20, testDayResetHour, now, true)
	require.NoError(t, err)
	assert.Empty(t, entries)
}
