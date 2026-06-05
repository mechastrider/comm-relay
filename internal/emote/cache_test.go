package emote

import (
	"context"
	"testing"
	"time"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/require"
)

type stubFetcher struct {
	id           ProviderID
	global       []Metadata
	channel      []Metadata
	globalErr    error
	channelErr   error
	globalCalls  int
	channelCalls int
}

func (s *stubFetcher) ID() ProviderID {
	return s.id
}

func (s *stubFetcher) FetchGlobal(ctx context.Context) ([]Metadata, error) {
	s.globalCalls++
	if s.globalErr != nil {
		return nil, s.globalErr
	}
	return s.global, nil
}

func (s *stubFetcher) FetchChannel(ctx context.Context, platform, channelID string) ([]Metadata, error) {
	s.channelCalls++
	if s.channelErr != nil {
		return nil, s.channelErr
	}
	return s.channel, nil
}

func TestCache_WhenScopeExpires_ExpectLookupMiss(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 6, 5, 12, 0, 0, 0, time.UTC)
	cache := New(Options{
		ChannelTTL: time.Minute,
		GlobalTTL:  time.Minute,
		Now:        func() time.Time { return now },
	})

	fetcher := &stubFetcher{
		id: ProviderFFZ,
		global: []Metadata{
			{Code: "Kappa", ID: "1", URL: "https://cdn.example/kappa.png", Width: 28, Height: 28},
		},
	}
	cache.RegisterFetcher(fetcher)

	require.NoError(t, cache.Refresh(context.Background(), ProviderFFZ, GlobalScope()))
	meta, ok := cache.Lookup(ProviderFFZ, GlobalScope(), "Kappa")
	require.True(t, ok)
	require.Equal(t, "1", meta.ID)

	now = now.Add(2 * time.Minute)
	_, ok = cache.Lookup(ProviderFFZ, GlobalScope(), "Kappa")
	require.False(t, ok)
}

func TestCache_WhenOverMaxEntries_ExpectEviction(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 6, 5, 12, 0, 0, 0, time.UTC)
	cache := New(Options{
		ChannelTTL: time.Hour,
		GlobalTTL:  time.Hour,
		MaxEntries: 2,
		MaxScopes:  10,
		Now:        func() time.Time { return now },
	})

	ffzFetcher := &stubFetcher{
		id:     ProviderFFZ,
		global: []Metadata{{Code: "one", ID: "1", URL: "https://cdn.example/1.png"}},
	}
	bttvFetcher := &stubFetcher{
		id:     ProviderBTTV,
		global: []Metadata{{Code: "two", ID: "2", URL: "https://cdn.example/2.png"}},
	}
	seventvFetcher := &stubFetcher{
		id:     Provider7TV,
		global: []Metadata{{Code: "three", ID: "3", URL: "https://cdn.example/3.png"}},
	}
	cache.RegisterFetcher(ffzFetcher)
	cache.RegisterFetcher(bttvFetcher)
	cache.RegisterFetcher(seventvFetcher)

	require.NoError(t, cache.Refresh(context.Background(), ProviderFFZ, GlobalScope()))
	now = now.Add(time.Second)
	require.NoError(t, cache.Refresh(context.Background(), ProviderBTTV, GlobalScope()))
	now = now.Add(time.Second)
	require.NoError(t, cache.Refresh(context.Background(), Provider7TV, GlobalScope()))

	cache.EvictStale()

	snap := cache.Diagnostics()
	require.LessOrEqual(t, snap.TotalEntries, 2)
	require.Greater(t, snap.Evictions, uint64(0))
}

func TestCache_WhenFetchFails_ExpectBackoffAndRetainedEntries(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 6, 5, 12, 0, 0, 0, time.UTC)
	cache := New(Options{
		ChannelTTL: time.Hour,
		GlobalTTL:  time.Hour,
		Now:        func() time.Time { return now },
	})

	fetcher := &stubFetcher{
		id: ProviderFFZ,
		global: []Metadata{
			{Code: "Kappa", ID: "1", URL: "https://cdn.example/kappa.png"},
		},
	}
	cache.RegisterFetcher(fetcher)
	require.NoError(t, cache.Refresh(context.Background(), ProviderFFZ, GlobalScope()))

	fetcher.globalErr = errors.New("provider unavailable")
	err := cache.Refresh(context.Background(), ProviderFFZ, GlobalScope())
	require.Error(t, err)

	meta, ok := cache.Lookup(ProviderFFZ, GlobalScope(), "Kappa")
	require.True(t, ok)
	require.Equal(t, "1", meta.ID)

	snap := cache.Diagnostics()
	provider := snap.Providers["ffz"]
	require.Equal(t, "provider unavailable", provider.LastError)
	require.NotNil(t, provider.NextRetryAt)

	initialCalls := fetcher.globalCalls
	err = cache.Refresh(context.Background(), ProviderFFZ, GlobalScope())
	require.NoError(t, err)
	require.Equal(t, initialCalls, fetcher.globalCalls)
}

func TestCache_WhenFetchSucceedsAfterFailure_ExpectResetBackoff(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 6, 5, 12, 0, 0, 0, time.UTC)
	cache := New(Options{
		ChannelTTL: time.Hour,
		GlobalTTL:  time.Hour,
		Now:        func() time.Time { return now },
	})

	fetcher := &stubFetcher{
		id:        ProviderBTTV,
		globalErr: errors.New("temporary outage"),
	}
	cache.RegisterFetcher(fetcher)

	require.Error(t, cache.Refresh(context.Background(), ProviderBTTV, GlobalScope()))

	now = now.Add(2 * time.Second)
	fetcher.globalErr = nil
	fetcher.global = []Metadata{{Code: "PogChamp", ID: "88", URL: "https://cdn.example/pog.png"}}

	require.NoError(t, cache.Refresh(context.Background(), ProviderBTTV, GlobalScope()))

	meta, ok := cache.Lookup(ProviderBTTV, GlobalScope(), "PogChamp")
	require.True(t, ok)
	require.Equal(t, "88", meta.ID)

	snap := cache.Diagnostics()
	provider := snap.Providers["bttv"]
	require.Empty(t, provider.LastError)
	require.Nil(t, provider.NextRetryAt)
}

func TestCache_WhenInactiveChannel_ExpectEviction(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 6, 5, 12, 0, 0, 0, time.UTC)
	cache := New(Options{
		ChannelTTL: time.Hour,
		GlobalTTL:  time.Hour,
		Now:        func() time.Time { return now },
	})

	fetcher := &stubFetcher{
		id: ProviderFFZ,
		channel: []Metadata{
			{Code: "ChannelEmote", ID: "9", URL: "https://cdn.example/channel.png"},
		},
	}
	cache.RegisterFetcher(fetcher)

	scope := ChannelScope("twitch", "streamer")
	cache.SetChannelActive("twitch", "streamer")
	require.NoError(t, cache.Refresh(context.Background(), ProviderFFZ, scope))

	_, ok := cache.Lookup(ProviderFFZ, scope, "ChannelEmote")
	require.True(t, ok)

	now = now.Add(channelInactive + time.Minute)
	cache.EvictStale()

	_, ok = cache.Lookup(ProviderFFZ, scope, "ChannelEmote")
	require.False(t, ok)
}

func TestMetadata_ToFragment_ExpectEmoteShape(t *testing.T) {
	t.Parallel()

	fragment := Metadata{
		Provider: ProviderFFZ,
		Code:     "Kappa",
		ID:       "25",
		URL:      "https://cdn.example/kappa.png",
		Width:    28,
		Height:   28,
	}.ToFragment()

	require.Equal(t, "emote", string(fragment.Type))
	require.Equal(t, "Kappa", fragment.Text)
	require.Equal(t, "ffz", fragment.Provider)
	require.Equal(t, "25", fragment.ID)
}
