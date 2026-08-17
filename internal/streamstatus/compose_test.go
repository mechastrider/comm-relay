package streamstatus

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
)

func TestCompose_WhenNoStoreRecords_ExpectUnknownStateAndNullViewers(t *testing.T) {
	t.Parallel()

	cfg := config.Default()
	now := time.Date(2026, 8, 17, 12, 0, 0, 0, time.UTC)
	resp := Compose(*cfg, status.NewRegistry(), NewStore(StoreOptions{}), now)

	require.Equal(t, now.UTC(), resp.UpdatedAt)
	require.Nil(t, resp.ViewersTotal.Current)
	require.Equal(t, "local_samples", resp.ViewersTotal.Source)
	require.Len(t, resp.Platforms, 3)
	require.Equal(t, status.PlatformTwitch, resp.Platforms[0].Platform)
	require.Equal(t, status.PlatformYouTube, resp.Platforms[1].Platform)
	require.Equal(t, status.PlatformVK, resp.Platforms[2].Platform)

	for _, platform := range resp.Platforms {
		require.Equal(t, StateUnknown, platform.State)
		require.Nil(t, platform.Viewers.Current)
		require.Equal(t, "disabled", platform.Chat.State)
	}
}

func TestCompose_WhenConnectorConnected_ExpectChatOnlyChanges(t *testing.T) {
	t.Parallel()

	cfg := config.Default()
	cfg.Twitch.Enabled = true
	cfg.Twitch.Channel = "streamer"

	registry := status.NewRegistry()
	registry.SetTwitch(status.Snapshot{State: status.StateConnected})

	resp := Compose(*cfg, registry, NewStore(StoreOptions{}), time.Now())

	require.Equal(t, StateUnknown, resp.Platforms[0].State)
	require.Equal(t, "connected", resp.Platforms[0].Chat.State)
	require.Nil(t, resp.Platforms[0].Viewers.Current)
}

func TestCompose_WhenConnectorDisabled_ExpectChatDisabled(t *testing.T) {
	t.Parallel()

	cfg := config.Default()
	cfg.Twitch.Enabled = false

	registry := status.NewRegistry()
	registry.SetTwitch(status.Snapshot{State: status.StateConnected})

	resp := Compose(*cfg, registry, NewStore(StoreOptions{}), time.Now())
	require.Equal(t, "disabled", resp.Platforms[0].Chat.State)
}

func TestCompose_WhenViewersRecorded_ExpectTotalSum(t *testing.T) {
	t.Parallel()

	store := NewStore(StoreOptions{})
	now := time.Date(2026, 8, 17, 12, 0, 0, 0, time.UTC)
	store.Record(Snapshot{
		Platform:     status.PlatformTwitch,
		State:        StateLive,
		SampledAt:    now,
		Viewers:      Viewers{Current: intPtr(100)},
		Capabilities: []string{CapViewers},
	})
	store.Record(Snapshot{
		Platform:     status.PlatformYouTube,
		State:        StateLive,
		SampledAt:    now,
		Viewers:      Viewers{Current: intPtr(50)},
		Capabilities: []string{CapViewers},
	})

	resp := Compose(*config.Default(), status.NewRegistry(), store, now)
	require.NotNil(t, resp.ViewersTotal.Current)
	require.Equal(t, 150, *resp.ViewersTotal.Current)
	require.Contains(t, resp.Platforms[0].Capabilities, CapViewers)
	require.Contains(t, resp.Platforms[0].Capabilities, CapChatHealth)
	require.Contains(t, resp.Platforms[1].Capabilities, CapViewers)
	require.Contains(t, resp.Platforms[1].Capabilities, CapChatHealth)
}
