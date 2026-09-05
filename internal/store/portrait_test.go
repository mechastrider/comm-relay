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
	}, true)
	assert.Equal(t, "/overlay/assets/asset_deadbeef.png", url)
}

func TestResolvePortraitURL_WhenCacheMissing_ExpectRemoteURL(t *testing.T) {
	t.Parallel()

	url := store.ResolvePortraitURL(store.PortraitFields{
		RemoteURL: "https://example.com/remote.png",
	}, true)
	assert.Equal(t, "https://example.com/remote.png", url)
}

func TestResolvePortraitURL_WhenBothEmpty_ExpectEmpty(t *testing.T) {
	t.Parallel()

	assert.Empty(t, store.ResolvePortraitURL(store.PortraitFields{}, true))
}

func TestResolvePortraitURL_WhenCustomDisabled_ExpectCacheInstead(t *testing.T) {
	t.Parallel()

	url := store.ResolvePortraitURL(store.PortraitFields{
		CustomAvatar: "asset_custom.png",
		AvatarCache:  "asset_cache.png",
	}, false)
	assert.Equal(t, "/overlay/assets/asset_cache.png", url)
}

func TestResolvePortraitURL_WhenCustomEnabled_ExpectCustomOverridesCache(t *testing.T) {
	t.Parallel()

	url := store.ResolvePortraitURL(store.PortraitFields{
		CustomAvatar: "asset_custom.png",
		AvatarCache:  "asset_cache.png",
	}, true)
	assert.Equal(t, "/overlay/assets/asset_custom.png", url)
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

	entries, err := s.Leaderboard("all", 20, testDayResetHour, now, true)
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

func TestCustomAvatar_WhenDisabled_ExpectLeaderboardUsesCache(t *testing.T) {
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
	require.NoError(t, s.SetAvatarCache("youtube", "UC1", "asset_cache.png"))

	viewerID, ok := s.ViewerIDForIdentity("youtube", "UC1")
	require.True(t, ok)
	_, err = s.SetCustomAvatar(viewerID, "asset_custom.png")
	require.NoError(t, err)

	enabled, err := s.Leaderboard("all", 20, testDayResetHour, now, true)
	require.NoError(t, err)
	require.Len(t, enabled, 1)
	assert.Equal(t, "/overlay/assets/asset_custom.png", enabled[0].AvatarURL)

	disabled, err := s.Leaderboard("all", 20, testDayResetHour, now, false)
	require.NoError(t, err)
	require.Len(t, disabled, 1)
	assert.Equal(t, "/overlay/assets/asset_cache.png", disabled[0].AvatarURL)
}

func TestResolveCanonicalPortraitURL_WhenMergedViewerLastSeenTwitch_ExpectYouTubeCache(t *testing.T) {
	s, _ := openTestStore(t)
	now := fixedNow()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC1",
		AvatarURL: "https://example.com/youtube.png",
	}, defaultActivity(), testDayResetHour, now))
	require.NoError(t, s.SetAvatarCache("youtube", "UC1", "asset_youtube.png"))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch",
		UserID:   "12345",
	}, defaultActivity(), testDayResetHour, now.Add(time.Minute)))

	fromID, ok := s.ViewerIDForIdentity("twitch", "12345")
	require.True(t, ok)
	intoID, ok := s.ViewerIDForIdentity("youtube", "UC1")
	require.True(t, ok)
	require.NoError(t, s.Merge(fromID, intoID, testDayResetHour, now.Add(2*time.Minute)))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch",
		UserID:   "12345",
	}, defaultActivity(), testDayResetHour, now.Add(3*time.Minute)))

	resolved, err := s.ResolveCanonicalPortraitURL("twitch", "12345", true, "")
	require.NoError(t, err)
	assert.Equal(t, "/overlay/assets/asset_youtube.png", resolved)
}

func TestApplyChatResult_WhenRemoteURLRotates_ExpectReplacedCacheFilename(t *testing.T) {
	s, _ := openTestStore(t)
	now := fixedNow()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC1",
		AvatarURL: "https://example.com/old.png",
	}, defaultActivity(), testDayResetHour, now))
	require.NoError(t, s.SetAvatarCache("youtube", "UC1", "asset_old.png"))

	replaced, err := s.ApplyChatResult(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC1",
		AvatarURL: "https://example.com/new.png",
	}, defaultActivity(), testDayResetHour, now.Add(time.Minute))
	require.NoError(t, err)
	assert.Equal(t, "asset_old.png", replaced)
}

func TestSetAvatarCacheIfRemoteURL_WhenURLChanged_ExpectNotCommitted(t *testing.T) {
	s, _ := openTestStore(t)
	now := fixedNow()
	urlA := "https://example.com/a.png"
	urlB := "https://example.com/b.png"
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC1",
		AvatarURL: urlA,
	}, defaultActivity(), testDayResetHour, now))

	committed, err := s.SetAvatarCacheIfRemoteURL("youtube", "UC1", urlA, "asset_a.png")
	require.NoError(t, err)
	require.True(t, committed)

	_, err = s.ApplyChatResult(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC1",
		AvatarURL: urlB,
	}, defaultActivity(), testDayResetHour, now.Add(time.Minute))
	require.NoError(t, err)

	committed, err = s.SetAvatarCacheIfRemoteURL("youtube", "UC1", urlA, "asset_stale.png")
	require.NoError(t, err)
	assert.False(t, committed)

	cache, err := s.PortraitCacheFilename("youtube", "UC1")
	require.NoError(t, err)
	assert.Empty(t, cache)
}

func fixedNow() time.Time {
	return time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
}
