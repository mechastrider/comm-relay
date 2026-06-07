package youtube

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"golang.org/x/oauth2"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
)

func testStore(t *testing.T, youtubeCfg config.YouTubeConfig) *config.Store {
	t.Helper()

	path := t.TempDir() + "/config.json"
	cfg := config.Default()
	cfg.YouTube = youtubeCfg

	store, err := config.NewStore(path, cfg)
	require.NoError(t, err)

	return store
}

func TestConnector_Run_WhenDisabled_ExpectDisabledStatus(t *testing.T) {
	t.Parallel()

	eventBus := bus.New(8)
	registry := status.NewRegistry()
	store := testStore(t, config.YouTubeConfig{Enabled: false})
	connector := New(eventBus, store, registry, nil, nil)
	connector.newClient = func(ctx context.Context, tokenSource oauth2.TokenSource) (liveChatAPI, error) {
		t.Fatal("client should not be created when disabled")
		return nil, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	require.NoError(t, connector.Run(ctx))
	require.Equal(t, status.StateDisabled, registry.YouTube().State)
}
