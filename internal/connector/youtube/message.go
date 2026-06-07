package youtube

import (
	"strings"
	"time"

	"google.golang.org/api/youtube/v3"

	"github.com/mechastrider/comm-relay/internal/bus"
)

// MapLiveChatMessage converts a YouTube Live Chat API message to the unified chat model.
func MapLiveChatMessage(item *youtube.LiveChatMessage) bus.ChatMessage {
	ts := time.Now().UTC()
	if item.Snippet != nil && item.Snippet.PublishedAt != "" {
		if parsed, err := time.Parse(time.RFC3339, item.Snippet.PublishedAt); err == nil {
			ts = parsed.UTC()
		}
	}

	id := strings.TrimSpace(item.Id)
	if id == "" {
		id = "youtube-" + ts.Format(time.RFC3339Nano)
	}

	username := ""
	displayName := ""
	userID := ""
	avatarURL := ""

	if item.AuthorDetails != nil {
		userID = item.AuthorDetails.ChannelId
		displayName = strings.TrimSpace(item.AuthorDetails.DisplayName)
	}

	message := ""
	if item.Snippet != nil {
		message = item.Snippet.DisplayMessage
		if item.Snippet.Type != "" && item.Snippet.Type != "textMessageEvent" {
			if message == "" {
				message = item.Snippet.Type
			}
		}
	}

	if displayName == "" {
		displayName = userID
	}
	username = displayName

	var badges []string
	if item.AuthorDetails != nil {
		if item.AuthorDetails.IsChatOwner {
			badges = append(badges, "owner")
		}
		if item.AuthorDetails.IsChatModerator {
			badges = append(badges, "moderator")
		}
		if item.AuthorDetails.IsVerified {
			badges = append(badges, "verified")
		}
		if item.AuthorDetails.IsChatSponsor {
			badges = append(badges, "member")
		}
	}

	return bus.ChatMessage{
		ID:          id,
		Platform:    platformYouTube,
		UserID:      userID,
		Username:    username,
		DisplayName: displayName,
		Message:     message,
		AvatarURL:   avatarURL,
		Badges:      badges,
		Timestamp:   ts,
	}
}
