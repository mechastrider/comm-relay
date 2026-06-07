package youtube

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/emote/ytemoji"
)

func TestMapEmojiFragments_WhenKnownShortcuts_ExpectEmoteFragments(t *testing.T) {
	t.Parallel()

	catalog := ytemoji.NewCatalog()
	catalog.ReplaceGlobal(map[string]ytemoji.Entry{
		":heart:": {
			ID:     "heart",
			URL:    "https://example.com/heart.svg",
			Width:  24,
			Height: 24,
		},
		":smile:": {
			ID:     "smile",
			URL:    "https://example.com/smile.svg",
			Width:  24,
			Height: 24,
		},
	})

	fragments := mapEmojiFragments("Hello :heart: :smile:", catalog)
	require.Len(t, fragments, 4)
	require.Equal(t, bus.FragmentTypeText, fragments[0].Type)
	require.Equal(t, "Hello ", fragments[0].Text)
	require.Equal(t, bus.FragmentTypeEmote, fragments[1].Type)
	require.Equal(t, ":heart:", fragments[1].Text)
	require.Equal(t, "https://example.com/heart.svg", fragments[1].URL)
	require.Equal(t, bus.FragmentTypeText, fragments[2].Type)
	require.Equal(t, " ", fragments[2].Text)
	require.Equal(t, bus.FragmentTypeEmote, fragments[3].Type)
	require.Equal(t, ":smile:", fragments[3].Text)
}

func TestMapEmojiFragments_WhenUnknownShortcut_ExpectPlainText(t *testing.T) {
	t.Parallel()

	catalog := ytemoji.NewCatalog()
	fragments := mapEmojiFragments("Hi :unknown:", catalog)
	require.Nil(t, fragments)
}

func TestMapEmojiFragments_WhenChannelEmojiOverridesGlobal_ExpectChannelURL(t *testing.T) {
	t.Parallel()

	catalog := ytemoji.NewCatalog()
	catalog.ReplaceGlobal(map[string]ytemoji.Entry{
		":blobcat:": {ID: "global", URL: "https://example.com/global.svg"},
	})
	catalog.MergeChannel(map[string]ytemoji.Entry{
		":blobcat:": {ID: "channel", URL: "https://example.com/channel.svg"},
	})

	fragments := mapEmojiFragments(":blobcat:", catalog)
	require.Len(t, fragments, 1)
	require.Equal(t, "https://example.com/channel.svg", fragments[0].URL)
}
