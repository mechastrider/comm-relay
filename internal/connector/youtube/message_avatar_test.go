package youtube

import (
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/api/youtube/v3"
)

func TestMapLiveChatMessage_WhenProfileImageUrlPresent_ExpectAvatarURL(t *testing.T) {
	t.Parallel()

	item := &youtube.LiveChatMessage{
		Id: "yt-avatar",
		AuthorDetails: &youtube.LiveChatMessageAuthorDetails{
			ChannelId:       "UC123",
			DisplayName:     "Viewer",
			ProfileImageUrl: "https://yt3.ggpht.com/photo.jpg",
		},
	}

	msg := MapLiveChatMessage(item)
	require.Equal(t, "https://yt3.ggpht.com/photo.jpg", msg.AvatarURL)
}

func TestMapLiveChatMessage_WhenProfileImageUrlEmpty_ExpectNoAvatarURL(t *testing.T) {
	t.Parallel()

	item := &youtube.LiveChatMessage{
		Id: "yt-no-avatar",
		AuthorDetails: &youtube.LiveChatMessageAuthorDetails{
			ChannelId:   "UC123",
			DisplayName: "Viewer",
		},
	}

	msg := MapLiveChatMessage(item)
	require.Empty(t, msg.AvatarURL)
}
