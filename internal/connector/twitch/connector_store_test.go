package twitch

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/stretchr/testify/require"
)

func TestConnector_Run_WhenEnabledAfterStoreUpdate_ExpectSession(t *testing.T) {
	t.Parallel()

	eventBus := bus.New(8)
	store := testStore(t, config.TwitchConfig{Enabled: false, Channel: "streamer"})

	fake := &fakeIRCClient{connectCh: make(chan struct{}, 1)}
	connector := New(eventBus, store, nil, nil)
	connector.newClient = func() ircClient { return fake }

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = connector.Run(ctx)
	}()

	time.Sleep(100 * time.Millisecond)
	require.Equal(t, "", fake.joined)

	updated := store.Snapshot()
	updated.Twitch = config.TwitchConfig{Enabled: true, Channel: "streamer"}
	require.NoError(t, store.Replace(updated))

	require.Eventually(t, func() bool {
		return fake.joined == "streamer"
	}, 5*time.Second, 50*time.Millisecond)

	cancel()
	wg.Wait()
}
