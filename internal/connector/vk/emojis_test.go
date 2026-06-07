package vk

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
)

func TestSmileLabel_WhenNameWithoutColons_ExpectWrapped(t *testing.T) {
	t.Parallel()

	require.Equal(t, ":kappa:", smileLabel(contentBlock{Name: "kappa"}))
}

func TestSmileLabel_WhenNameAlreadyWrapped_ExpectUnchanged(t *testing.T) {
	t.Parallel()

	require.Equal(t, ":heart:", smileLabel(contentBlock{Name: ":heart:"}))
}

func TestSmileImageURL_PrefersSmallOverMediumAndLarge(t *testing.T) {
	t.Parallel()

	block := contentBlock{
		SmallURL:  "https://example.test/small.png",
		MediumURL: "https://example.test/medium.png",
		LargeURL:  "https://example.test/large.png",
	}
	require.Equal(t, "https://example.test/small.png", smileImageURL(block))
}

func TestBuildMessageContent_WhenSmileWithoutURL_ExpectTextFragment(t *testing.T) {
	t.Parallel()

	content := buildMessageContent([]contentBlock{
		{Type: "smile", Name: "kappa"},
	}, true)

	require.Equal(t, ":kappa:", content.message)
	require.Empty(t, content.fragments)
}

func TestMapSmileFragment_WhenValidBlock_ExpectEmoteMetadata(t *testing.T) {
	t.Parallel()

	fragment, ok := mapSmileFragment(contentBlock{
		ID:       "99",
		Name:     "wave",
		SmallURL: "https://example.test/wave.png",
	}, ":wave:")
	require.True(t, ok)
	require.Equal(t, bus.FragmentTypeEmote, fragment.Type)
	require.Equal(t, "vk", fragment.Provider)
	require.Equal(t, "99", fragment.ID)
	require.Equal(t, 28, fragment.Width)
	require.Equal(t, 28, fragment.Height)
}
