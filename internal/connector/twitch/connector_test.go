package twitch

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/gempir/go-twitch-irc/v4"
	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/stretchr/testify/require"
)

type fakeIRCClient struct {
	onPrivate func(twitch.PrivateMessage)
	onConnect func()
	joined    string
	connectCh chan struct{}
}

func (f *fakeIRCClient) OnPrivateMessage(handler func(twitch.PrivateMessage)) {
	f.onPrivate = handler
}

func (f *fakeIRCClient) OnConnect(handler func()) {
	f.onConnect = handler
}

func (f *fakeIRCClient) Join(channels ...string) {
	if len(channels) > 0 {
		f.joined = channels[0]
	}
}

func (f *fakeIRCClient) Connect() error {
	if f.onConnect != nil {
		f.onConnect()
	}
	<-f.connectCh
	return nil
}

func (f *fakeIRCClient) Disconnect() error {
	select {
	case f.connectCh <- struct{}{}:
	default:
	}
	return nil
}

func TestConnector_Run_WhenDisabled_ExpectNoConnect(t *testing.T) {
	t.Parallel()

	eventBus := bus.New(8)
	connector := New(eventBus, config.TwitchConfig{Enabled: false, Channel: "x"})
	connector.newClient = func() ircClient {
		t.Fatal("client should not be created when disabled")
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	require.NoError(t, connector.Run(ctx))
}

func TestConnector_Run_WhenSessionActive_ExpectPublishedMessage(t *testing.T) {
	t.Parallel()

	eventBus := bus.New(8)
	events, unsub := eventBus.Subscribe()
	defer unsub()

	fake := &fakeIRCClient{connectCh: make(chan struct{}, 1)}
	connector := New(eventBus, config.TwitchConfig{Enabled: true, Channel: "#Streamer"})
	connector.newClient = func() ircClient { return fake }

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = connector.Run(ctx)
	}()

	require.Eventually(t, func() bool {
		return fake.joined == "streamer"
	}, time.Second, 10*time.Millisecond)

	fake.onPrivate(twitch.PrivateMessage{
		ID:      "1",
		Message: "hello",
		User:    twitch.User{ID: "9", Name: "user", DisplayName: "User"},
	})

	select {
	case ev := <-events:
		require.Equal(t, bus.EventChatMessageReceived, ev.Type)
		require.Equal(t, "hello", ev.Message.Message)
		require.Equal(t, "twitch", ev.Message.Platform)
	case <-time.After(time.Second):
		t.Fatal("expected published message")
	}

	cancel()
	wg.Wait()
}
