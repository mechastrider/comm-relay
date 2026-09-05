package api

import (
	"strings"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

// fillChatMessageAvatar sets AvatarURL from the canonical viewer portrait when the connector left it empty.
func fillChatMessageAvatar(viewerStore *store.Store, cfgStore *config.Store, msg bus.ChatMessage) bus.ChatMessage {
	if viewerStore == nil || strings.TrimSpace(msg.AvatarURL) != "" {
		return msg
	}
	if strings.TrimSpace(msg.Platform) == "" || strings.TrimSpace(msg.UserID) == "" {
		return msg
	}

	customAvatarsEnabled := true
	if cfgStore != nil {
		customAvatarsEnabled = cfgStore.Snapshot().CustomAvatarsEnabled
	}

	resolved, err := viewerStore.ResolveCanonicalPortraitURL(msg.Platform, msg.UserID, customAvatarsEnabled)
	if err != nil || resolved == "" {
		return msg
	}

	msg.AvatarURL = resolved
	return msg
}
