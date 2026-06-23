package youtube

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/youtube/innertube"
)

func TestMapPageChatMessage_WhenRendererFieldsPresent_ExpectChatMessage(t *testing.T) {
	t.Parallel()

	msg := MapPageChatMessage(innertube.LiveChatItem{
		ID:            "msg-1",
		UserID:        "UC123",
		DisplayName:   "Viewer",
		Message:       "hello",
		MessageText:   "hello",
		AvatarURL:     "https://example.com/avatar.jpg",
		Badges:        []string{"moderator"},
		TimestampUsec: "1710000000000000",
	})

	require.Equal(t, "msg-1", msg.ID)
	require.Equal(t, platformYouTube, msg.Platform)
	require.Equal(t, "UC123", msg.UserID)
	require.Equal(t, "Viewer", msg.DisplayName)
	require.Equal(t, "hello", msg.Message)
	require.Equal(t, "https://example.com/avatar.jpg", msg.AvatarURL)
	require.Equal(t, []string{"moderator"}, msg.Badges)
	require.Equal(t, time.UnixMicro(1710000000000000).UTC(), msg.Timestamp)
}
