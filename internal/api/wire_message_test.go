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
	_, hasFragments := decoded["fragments"]
	require.False(t, hasFragments)
}

func TestChatMessageWirePayload_WhenFragmentsSet_ExpectSnakeCaseJSON(t *testing.T) {
	t.Parallel()

	payload, err := chatMessageWirePayload(bus.ChatMessage{
		Platform: "twitch",
		Username: "viewer",
		Message:  "Hello Kappa",
		Fragments: []bus.MessageFragment{
			{Type: bus.FragmentTypeText, Text: "Hello "},
			{
				Type:     bus.FragmentTypeEmote,
				Text:     "Kappa",
				Provider: "twitch",
				ID:       "25",
				URL:      "https://static-cdn.jtvnw.net/emoticons/v2/25/static/dark/2.0",
				Width:    28,
				Height:   28,
			},
		},
	})
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(payload, &decoded))

	require.Equal(t, "Hello Kappa", decoded["message"])
	fragments, ok := decoded["fragments"].([]any)
	require.True(t, ok)
	require.Len(t, fragments, 2)

	textFrag, ok := fragments[0].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "text", textFrag["type"])
	require.Equal(t, "Hello ", textFrag["text"])

	emoteFrag, ok := fragments[1].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "emote", emoteFrag["type"])
	require.Equal(t, "Kappa", emoteFrag["text"])
	require.Equal(t, "twitch", emoteFrag["provider"])
	require.Equal(t, "25", emoteFrag["id"])
}

func TestChatMessageWirePayload_WhenUnknownFragmentType_ExpectMessageStillDelivered(t *testing.T) {
	t.Parallel()

	payload, err := chatMessageWirePayload(bus.ChatMessage{
		Platform: "twitch",
		Username: "viewer",
		Message:  "fallback text",
		Fragments: []bus.MessageFragment{
			{Type: "future_type", Text: "ignored by old clients"},
		},
	})
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(payload, &decoded))
	require.Equal(t, "fallback text", decoded["message"])
	require.NotNil(t, decoded["fragments"])
}
