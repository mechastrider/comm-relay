package api

import (
	"encoding/json"
	"testing"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/stretchr/testify/require"
)

func TestChatMessageWirePayload_WhenDisplayNameSet_ExpectSnakeCaseJSON(t *testing.T) {
	t.Parallel()

	payload, err := chatMessageWirePayload(bus.ChatMessage{
		Platform:    "twitch",
		Username:    "cmd_user",
		DisplayName: "Commander",
		Message:     "Hello",
		AvatarURL:   "https://example.com/avatar.png",
		Badges:      []string{"mod"},
	})
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(payload, &decoded))

	require.Equal(t, "message", decoded["type"])
	require.Equal(t, "twitch", decoded["platform"])
	require.Equal(t, "Commander", decoded["user"])
	require.Equal(t, "Hello", decoded["message"])
	require.Equal(t, "Commander", decoded["display_name"])
	require.Equal(t, "https://example.com/avatar.png", decoded["avatar_url"])
	require.Equal(t, []any{"mod"}, decoded["badges"])
}
