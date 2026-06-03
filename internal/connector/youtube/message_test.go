package youtube

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"google.golang.org/api/youtube/v3"
)

func TestMapLiveChatMessage_WhenTextMessage_ExpectUnifiedFields(t *testing.T) {
	t.Parallel()

	item := &youtube.LiveChatMessage{
		Id: "yt-1",
		Snippet: &youtube.LiveChatMessageSnippet{
			Type:           "textMessageEvent",
			DisplayMessage: "Hello chat",
			PublishedAt:    time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC).Format(time.RFC3339),
		},
		AuthorDetails: &youtube.LiveChatMessageAuthorDetails{
			ChannelId:       "UC123",
			DisplayName:     "Streamer",
			IsChatOwner:     true,
			IsChatModerator: false,
		},
	}

	msg := MapLiveChatMessage(item)
	require.Equal(t, "yt-1", msg.ID)
	require.Equal(t, "youtube", msg.Platform)
	require.Equal(t, "UC123", msg.UserID)
	require.Equal(t, "Hello chat", msg.Message)
	require.Equal(t, "Streamer", msg.DisplayName)
	require.Contains(t, msg.Badges, "owner")
}
