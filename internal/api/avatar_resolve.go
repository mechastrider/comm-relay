package api

import (
	"strings"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/store"
)

// fillChatMessageAvatar sets AvatarURL from the identity portrait cache when the connector left it empty.
func fillChatMessageAvatar(viewerStore *store.Store, msg bus.ChatMessage) bus.ChatMessage {
	if viewerStore == nil || strings.TrimSpace(msg.AvatarURL) != "" {
		return msg
	}
	if strings.TrimSpace(msg.Platform) == "" || strings.TrimSpace(msg.UserID) == "" {
		return msg
	}

	resolved, err := viewerStore.ResolveIdentityPortraitURL(msg.Platform, msg.UserID)
	if err != nil || resolved == "" {
		return msg
	}

	msg.AvatarURL = resolved
	return msg
}
