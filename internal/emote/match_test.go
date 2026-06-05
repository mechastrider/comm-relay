package emote

import (
	"context"
	"testing"
	"time"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/stretchr/testify/require"
)

func allEmotesEnabled() config.EmotesConfig {
	return config.Default().Overlay.Emotes
}

func TestEnricher_WhenThirdPartyTokenKnown_ExpectEmoteFragment(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 6, 5, 12, 0, 0, 0, time.UTC)
	cache := New(Options{Now: func() time.Time { return now }})
	cache.RegisterFetcher(&stubFetcher{
		id: ProviderFFZ,
		global: []Metadata{
			{Code: "FeelsBadMan", ID: "1", URL: "https://cdn.example/feelsbadman.png", Width: 28, Height: 28},
		},
	})
	require.NoError(t, cache.Refresh(context.Background(), ProviderFFZ, GlobalScope()))

	enricher := NewEnricher(cache)
	msg := &bus.ChatMessage{
		Platform: "twitch",
		Message:  "hello FeelsBadMan",
	}

	enricher.Enrich(msg, "streamer", allEmotesEnabled())

	require.Len(t, msg.Fragments, 3)
	require.Equal(t, bus.FragmentTypeText, msg.Fragments[0].Type)
	require.Equal(t, "hello", msg.Fragments[0].Text)
	require.Equal(t, bus.FragmentTypeText, msg.Fragments[1].Type)
	require.Equal(t, " ", msg.Fragments[1].Text)
	require.Equal(t, bus.FragmentTypeEmote, msg.Fragments[2].Type)
	require.Equal(t, "FeelsBadMan", msg.Fragments[2].Text)
	require.Equal(t, "ffz", msg.Fragments[2].Provider)
}

func TestEnricher_WhenTwitchNativeEmotePresent_ExpectOnlyUnknownTokensMatched(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 6, 5, 12, 0, 0, 0, time.UTC)
	cache := New(Options{Now: func() time.Time { return now }})
	cache.RegisterFetcher(&stubFetcher{
		id: ProviderFFZ,
		channel: []Metadata{
			{Code: "WideHard", ID: "42", URL: "https://cdn.example/widehard.png", Width: 50, Height: 20},
		},
	})
	scope := ChannelScope("twitch", "streamer")
	cache.SetChannelActive("twitch", "streamer")
	require.NoError(t, cache.Refresh(context.Background(), ProviderFFZ, scope))

	enricher := NewEnricher(cache)
	msg := &bus.ChatMessage{
		Platform: "twitch",
		Message:  "Kappa WideHard",
		Fragments: []bus.MessageFragment{
			{Type: bus.FragmentTypeEmote, Text: "Kappa", Provider: "twitch", ID: "25"},
			{Type: bus.FragmentTypeText, Text: " WideHard"},
		},
	}

	enricher.Enrich(msg, "streamer", allEmotesEnabled())

	require.Len(t, msg.Fragments, 3)
	require.Equal(t, "twitch", msg.Fragments[0].Provider)
	require.Equal(t, bus.FragmentTypeText, msg.Fragments[1].Type)
	require.Equal(t, " ", msg.Fragments[1].Text)
	require.Equal(t, bus.FragmentTypeEmote, msg.Fragments[2].Type)
	require.Equal(t, "WideHard", msg.Fragments[2].Text)
	require.Equal(t, "ffz", msg.Fragments[2].Provider)
}

func TestEnricher_WhenCodeUnknown_ExpectFragmentsUnchanged(t *testing.T) {
	t.Parallel()

	enricher := NewEnricher(New(Options{}))
	msg := &bus.ChatMessage{
		Platform: "twitch",
		Message:  "plain chat",
	}

	enricher.Enrich(msg, "streamer", allEmotesEnabled())

	require.Nil(t, msg.Fragments)
}

func TestEnricher_WhenProviderDisabled_ExpectNoFragments(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 6, 5, 12, 0, 0, 0, time.UTC)
	cache := New(Options{Now: func() time.Time { return now }})
	cache.RegisterFetcher(&stubFetcher{
		id: ProviderFFZ,
		global: []Metadata{
			{Code: "FeelsBadMan", ID: "1", URL: "https://cdn.example/feelsbadman.png", Width: 28, Height: 28},
		},
	})
	require.NoError(t, cache.Refresh(context.Background(), ProviderFFZ, GlobalScope()))

	enricher := NewEnricher(cache)
	msg := &bus.ChatMessage{
		Platform: "twitch",
		Message:  "hello FeelsBadMan",
	}

	disabled := config.EmotesConfig{Twitch: true, FFZ: false, BTTV: false, SevenTV: false}
	enricher.Enrich(msg, "streamer", disabled)

	require.Nil(t, msg.Fragments)
}

func TestLookupThirdParty_WhenChannelOverridesGlobal_ExpectChannelMetadata(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 6, 5, 12, 0, 0, 0, time.UTC)
	cache := New(Options{Now: func() time.Time { return now }})
	cache.RegisterFetcher(&stubFetcher{
		id: ProviderFFZ,
		global: []Metadata{
			{Code: "Pog", ID: "global", URL: "https://cdn.example/global.png"},
		},
		channel: []Metadata{
			{Code: "Pog", ID: "channel", URL: "https://cdn.example/channel.png"},
		},
	})

	require.NoError(t, cache.Refresh(context.Background(), ProviderFFZ, GlobalScope()))
	require.NoError(t, cache.Refresh(context.Background(), ProviderFFZ, ChannelScope("twitch", "streamer")))

	meta, ok := cache.LookupThirdParty("twitch", "streamer", "Pog", allEmotesEnabled())
	require.True(t, ok)
	require.Equal(t, "channel", meta.ID)
}
