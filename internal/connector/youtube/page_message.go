package youtube

import (
	"strconv"
	"strings"
	"time"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/youtube/innertube"
)

// MapPageChatMessage converts an InnerTube live chat item to the unified chat model.
func MapPageChatMessage(item innertube.LiveChatItem) bus.ChatMessage {
	ts := time.Now().UTC()
	if item.TimestampUsec != "" {
		if usec, err := strconv.ParseInt(item.TimestampUsec, 10, 64); err == nil {
			ts = time.UnixMicro(usec).UTC()
		}
	}

	id := strings.TrimSpace(item.ID)
	if id == "" {
		id = item.UserID + "-" + item.TimestampUsec
	}
	if id == "-" || id == "" {
		id = "youtube-" + ts.Format(time.RFC3339Nano)
	}

	displayName := strings.TrimSpace(item.DisplayName)
	if displayName == "" {
		displayName = item.UserID
	}

	return bus.ChatMessage{
		ID:          id,
		Platform:    platformYouTube,
		UserID:      item.UserID,
		Username:    displayName,
		DisplayName: displayName,
		Message:     item.Message,
		AvatarURL:   item.AvatarURL,
		Badges:      item.Badges,
		Timestamp:   ts,
	}
}
