package api

import (
	"strings"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

// fillChatMessageAvatar resolves AvatarURL from custom portrait, local cache, then remote URL.
func fillChatMessageAvatar(viewerStore *store.Store, cfgStore *config.Store, msg bus.ChatMessage) bus.ChatMessage {
	if viewerStore == nil || strings.TrimSpace(msg.Platform) == "" || strings.TrimSpace(msg.UserID) == "" {
		return msg
	}

	customAvatarsEnabled := true
	if cfgStore != nil {
		customAvatarsEnabled = cfgStore.Snapshot().CustomAvatarsEnabled
	}

	resolved, err := viewerStore.ResolveCanonicalPortraitURL(
		msg.Platform,
		msg.UserID,
		customAvatarsEnabled,
		msg.AvatarURL,
	)
	if err != nil || resolved == "" {
		return msg
	}

	msg.AvatarURL = resolved
	return msg
}
