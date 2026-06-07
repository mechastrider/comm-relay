package imagelink

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
)

func enabledPolicy() config.ImagePreviewsConfig {
	cfg := config.Default().Overlay.ImagePreviews
	cfg.Enabled = true
	cfg.AllowedHosts = []string{"i.imgur.com"}
	return cfg
}

func TestEnrich_WhenDisabled_ExpectNoFragments(t *testing.T) {
	t.Parallel()

	msg := &bus.ChatMessage{Message: "https://i.imgur.com/a.png"}
	cfg := config.Default().Overlay.ImagePreviews
	cfg.Enabled = false

	Enrich(msg, cfg)
	require.Nil(t, msg.Fragments)
}

func TestEnrich_WhenPlainMessageWithAllowedURL_ExpectImageLinkFragment(t *testing.T) {
	t.Parallel()

	msg := &bus.ChatMessage{Message: "look https://i.imgur.com/a.png wow"}
	Enrich(msg, enabledPolicy())

	require.Len(t, msg.Fragments, 3)
	require.Equal(t, bus.FragmentTypeText, msg.Fragments[0].Type)
	require.Equal(t, "look ", msg.Fragments[0].Text)
	require.Equal(t, bus.FragmentTypeImageLink, msg.Fragments[1].Type)
	require.Equal(t, "https://i.imgur.com/a.png", msg.Fragments[1].URL)
	require.Equal(t, bus.FragmentTypeText, msg.Fragments[2].Type)
	require.Equal(t, " wow", msg.Fragments[2].Text)
}

func TestEnrich_WhenHostBlocked_ExpectNoImageFragments(t *testing.T) {
	t.Parallel()

	msg := &bus.ChatMessage{Message: "https://evil.example/a.png"}
	Enrich(msg, enabledPolicy())

	require.Nil(t, msg.Fragments)
	require.Equal(t, "https://evil.example/a.png", msg.Message)
}

func TestEnrich_WhenMaxPerMessageReached_ExpectExtraURLAsText(t *testing.T) {
	t.Parallel()

	cfg := enabledPolicy()
	cfg.MaxPerMessage = 1

	msg := &bus.ChatMessage{
		Message: "https://i.imgur.com/one.png https://i.imgur.com/two.png",
	}
	Enrich(msg, cfg)

	var imageLinks int
	for _, fragment := range msg.Fragments {
		if fragment.Type == bus.FragmentTypeImageLink {
			imageLinks++
		}
	}
	require.Equal(t, 1, imageLinks)
}

func TestEnrich_WhenExistingTextFragment_ExpectSplitAroundURL(t *testing.T) {
	t.Parallel()

	msg := &bus.ChatMessage{
		Message: "see https://i.imgur.com/a.png",
		Fragments: []bus.MessageFragment{
			{Type: bus.FragmentTypeText, Text: "see https://i.imgur.com/a.png"},
		},
	}
	Enrich(msg, enabledPolicy())

	require.Len(t, msg.Fragments, 2)
	require.Equal(t, bus.FragmentTypeText, msg.Fragments[0].Type)
	require.Equal(t, "see ", msg.Fragments[0].Text)
	require.Equal(t, bus.FragmentTypeImageLink, msg.Fragments[1].Type)
}
