package api

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/store"
)

func TestFillChatMessageAvatar_WhenCachePresent_ExpectLocalAssetURL(t *testing.T) {
	t.Parallel()

	viewerStore := testViewerStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
	require.NoError(t, viewerStore.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC1",
		AvatarURL: "https://example.com/remote.png",
	}, store.ActivitySettings{}, 6, now))
	require.NoError(t, viewerStore.SetAvatarCache("youtube", "UC1", "asset_abc123.png"))

	filled := fillChatMessageAvatar(viewerStore, nil, bus.ChatMessage{
		Platform: "youtube",
		UserID:   "UC1",
		Username: "Viewer",
		Message:  "hello",
	})
	payload, err := chatMessageWirePayload(filled, false)
	require.NoError(t, err)

	var decoded map[string]string
	require.NoError(t, json.Unmarshal(payload, &decoded))
	require.Equal(t, "/overlay/assets/asset_abc123.png", decoded["avatar_url"])
}

func TestMessageHistory_WhenCachedPortrait_ExpectRecentIncludesLocalAsset(t *testing.T) {
	viewerStore := testViewerStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
	require.NoError(t, viewerStore.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC1",
		AvatarURL: "https://example.com/remote.png",
	}, store.ActivitySettings{}, 6, now))
	require.NoError(t, viewerStore.SetAvatarCache("youtube", "UC1", "asset_abc123.png"))

	history := NewMessageHistory(10)
	history.SetViewerStore(viewerStore)
	history.SetConfigStore(nil)
	history.append(bus.ChatMessage{
		Platform:  "youtube",
		UserID:    "UC1",
		Username:  "Viewer",
		Message:   "cached avatar line",
		Timestamp: now,
	})

	recent := history.Recent(10)
	require.Len(t, recent, 1)
	require.Equal(t, "/overlay/assets/asset_abc123.png", recent[0].AvatarURL)
}
