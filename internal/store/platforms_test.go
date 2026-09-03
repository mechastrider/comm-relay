package store_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestList_WhenMergedTwitchAndYouTube_ExpectPlatformsLastSeenFirst(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	t0 := time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "t1", DisplayName: "Alice",
	}, 1, testDayResetHour, t0))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "youtube", UserID: "y1", DisplayName: "Alice",
	}, 1, testDayResetHour, t0.Add(time.Minute)))

	fromID := viewerID(t, s, "twitch", "t1", testDayResetHour, t0.Add(time.Minute))
	intoID := viewerID(t, s, "youtube", "y1", testDayResetHour, t0.Add(time.Minute))

	// Act
	require.NoError(t, s.Merge(fromID, intoID, testDayResetHour, t0.Add(time.Minute)))
	viewers := listAt(t, s, "", testDayResetHour, t0.Add(time.Minute))

	// Assert
	require.Len(t, viewers, 1)
	assert.Equal(t, []string{"youtube", "twitch"}, viewers[0].Platforms)
}

func TestList_WhenDuplicatePlatformIdentities_ExpectSinglePlatformID(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "user1", DisplayName: "Alice",
	}, 1, testDayResetHour, now))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "user2", DisplayName: "Alice",
	}, 1, testDayResetHour, now.Add(time.Minute)))

	fromID := viewerID(t, s, "twitch", "user1", testDayResetHour, now.Add(time.Minute))
	intoID := viewerID(t, s, "twitch", "user2", testDayResetHour, now.Add(time.Minute))

	// Act
	require.NoError(t, s.Merge(fromID, intoID, testDayResetHour, now.Add(time.Minute)))
	viewers := listAt(t, s, "", testDayResetHour, now.Add(time.Minute))

	// Assert
	require.Len(t, viewers, 1)
	assert.Equal(t, []string{"twitch"}, viewers[0].Platforms)
}

func TestList_WhenMultiplePlatforms_ExpectLastSeenFirstThenRecency(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	t0 := time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "t1", DisplayName: "Alice",
	}, 1, testDayResetHour, t0))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "vk", UserID: "v1", DisplayName: "Alice",
	}, 1, testDayResetHour, t0.Add(30*time.Minute)))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "youtube", UserID: "y1", DisplayName: "Alice",
	}, 1, testDayResetHour, t0.Add(time.Hour)))

	twitchID := viewerID(t, s, "twitch", "t1", testDayResetHour, t0.Add(time.Hour))
	vkID := viewerID(t, s, "vk", "v1", testDayResetHour, t0.Add(time.Hour))
	youtubeID := viewerID(t, s, "youtube", "y1", testDayResetHour, t0.Add(time.Hour))

	require.NoError(t, s.Merge(twitchID, youtubeID, testDayResetHour, t0.Add(time.Hour)))
	require.NoError(t, s.Merge(vkID, youtubeID, testDayResetHour, t0.Add(time.Hour)))

	// Act
	viewers := listAt(t, s, "", testDayResetHour, t0.Add(2*time.Hour))

	// Assert
	require.Len(t, viewers, 1)
	assert.Equal(t, []string{"youtube", "vk", "twitch"}, viewers[0].Platforms)
}
