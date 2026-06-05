package bus_test

import (
	"encoding/json"
	"testing"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/stretchr/testify/require"
)

func TestMessageFragment_WhenTextType_ExpectJSONShape(t *testing.T) {
	t.Parallel()

	data, err := json.Marshal(bus.MessageFragment{
		Type: bus.FragmentTypeText,
		Text: "Hello ",
	})
	require.NoError(t, err)
	require.JSONEq(t, `{"type":"text","text":"Hello "}`, string(data))
}

func TestMessageFragment_WhenEmoteType_ExpectJSONShape(t *testing.T) {
	t.Parallel()

	data, err := json.Marshal(bus.MessageFragment{
		Type:     bus.FragmentTypeEmote,
		Text:     "Kappa",
		Provider: "twitch",
		ID:       "25",
		URL:      "https://static-cdn.jtvnw.net/emoticons/v2/25/static/dark/2.0",
		Width:    28,
		Height:   28,
	})
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(data, &decoded))
	require.Equal(t, "emote", decoded["type"])
	require.Equal(t, "Kappa", decoded["text"])
	require.Equal(t, "twitch", decoded["provider"])
	require.Equal(t, "25", decoded["id"])
	require.Equal(t, float64(28), decoded["width"])
	require.Equal(t, float64(28), decoded["height"])
}

func TestMessageFragment_WhenImageLinkType_ExpectJSONShape(t *testing.T) {
	t.Parallel()

	data, err := json.Marshal(bus.MessageFragment{
		Type:   bus.FragmentTypeImageLink,
		Text:   "https://example.com/image.png",
		URL:    "https://example.com/image.png",
		Width:  320,
		Height: 180,
	})
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(data, &decoded))
	require.Equal(t, "image_link", decoded["type"])
	require.Equal(t, "https://example.com/image.png", decoded["text"])
	require.Equal(t, "https://example.com/image.png", decoded["url"])
	require.Equal(t, float64(320), decoded["width"])
	require.Equal(t, float64(180), decoded["height"])
}

func TestChatMessage_WhenFragmentsEmpty_ExpectOmittedFromJSON(t *testing.T) {
	t.Parallel()

	data, err := json.Marshal(struct {
		Message   string                `json:"message"`
		Fragments []bus.MessageFragment `json:"fragments,omitempty"`
	}{
		Message: "plain text",
	})
	require.NoError(t, err)
	require.JSONEq(t, `{"message":"plain text"}`, string(data))
}
