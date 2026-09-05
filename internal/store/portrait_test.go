package store_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestResolvePortraitURL_WhenCachePresent_ExpectLocalAssetURL(t *testing.T) {
	t.Parallel()

	url := store.ResolvePortraitURL(store.PortraitFields{
		AvatarCache: "asset_deadbeef.png",
		RemoteURL:   "https://example.com/remote.png",
	})
	assert.Equal(t, "/overlay/assets/asset_deadbeef.png", url)
}

func TestResolvePortraitURL_WhenCacheMissing_ExpectRemoteURL(t *testing.T) {
	t.Parallel()

	url := store.ResolvePortraitURL(store.PortraitFields{
		RemoteURL: "https://example.com/remote.png",
	})
	assert.Equal(t, "https://example.com/remote.png", url)
}

func TestResolvePortraitURL_WhenBothEmpty_ExpectEmpty(t *testing.T) {
	t.Parallel()

	assert.Empty(t, store.ResolvePortraitURL(store.PortraitFields{}))
}

func TestSetAvatarCache_WhenIdentityExists_ExpectResolvedPortrait(t *testing.T) {
	s, _ := openTestStore(t)
	now := fixedNow()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:    "youtube",
		UserID:      "UC1",
		DisplayName: "Viewer",
		AvatarURL:   "https://example.com/remote.png",
	}, defaultActivity(), testDayResetHour, now))

	require.NoError(t, s.SetAvatarCache("youtube", "UC1", "asset_abc123.png"))

	resolved, err := s.ResolveIdentityPortraitURL("youtube", "UC1")
	require.NoError(t, err)
	assert.Equal(t, "/overlay/assets/asset_abc123.png", resolved)
}

func TestAvatarFetchCandidate_WhenCachePresent_ExpectFalse(t *testing.T) {
	s, _ := openTestStore(t)
	now := fixedNow()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC1",
		AvatarURL: "https://example.com/remote.png",
	}, defaultActivity(), testDayResetHour, now))
	require.NoError(t, s.SetAvatarCache("youtube", "UC1", "asset_abc123.png"))

	_, ok, err := s.AvatarFetchCandidate("youtube", "UC1")
	require.NoError(t, err)
	assert.False(t, ok)
}

func TestApplyChat_WhenEmptyIncomingAvatar_ExpectStoredRemotePreserved(t *testing.T) {
	s, _ := openTestStore(t)
	now := fixedNow()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC1",
		AvatarURL: "https://example.com/remote.png",
	}, defaultActivity(), testDayResetHour, now))
	require.NoError(t, s.SetAvatarCache("youtube", "UC1", "asset_abc123.png"))

	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC1",
		AvatarURL: "",
	}, defaultActivity(), testDayResetHour, now.Add(time.Minute)))

	resolved, err := s.ResolveIdentityPortraitURL("youtube", "UC1")
	require.NoError(t, err)
	assert.Equal(t, "/overlay/assets/asset_abc123.png", resolved)
}

func TestLeaderboard_WhenAvatarCacheSet_ExpectLocalAssetURL(t *testing.T) {
	s, _ := openTestStore(t)
	now := fixedNow()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:    "youtube",
		UserID:      "UC1",
		DisplayName: "Top",
		AvatarURL:   "https://example.com/remote.png",
	}, defaultActivity(), testDayResetHour, now))
	_, err := s.ApplyAward(store.ChatIdentity{
		Platform:    "youtube",
		UserID:      "UC1",
		DisplayName: "Top",
	}, 5, testDayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, s.SetAvatarCache("youtube", "UC1", "asset_abc123.png"))

	entries, err := s.Leaderboard("all", 20, testDayResetHour, now)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	assert.Equal(t, "/overlay/assets/asset_abc123.png", entries[0].AvatarURL)
}

func TestOpen_WhenFreshDatabase_ExpectAvatarCacheColumnUsable(t *testing.T) {
	s, _ := openTestStore(t)
	now := fixedNow()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC-migrate",
		AvatarURL: "https://example.com/remote.png",
	}, defaultActivity(), testDayResetHour, now))
	require.NoError(t, s.SetAvatarCache("youtube", "UC-migrate", "asset_abc123.png"))
}

func fixedNow() time.Time {
	return time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
}
