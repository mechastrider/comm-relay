package vk

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
)

func testStore(t *testing.T, vkCfg config.VKConfig) *config.Store {
	t.Helper()

	path := t.TempDir() + "/config.json"
	cfg := config.Default()
	cfg.VK = vkCfg

	store, err := config.NewStore(path, cfg)
	require.NoError(t, err)

	return store
}

func TestConnector_Run_WhenDisabled_ExpectDisabledStatus(t *testing.T) {
	t.Parallel()

	eventBus := bus.New(8)
	registry := status.NewRegistry()
	store := testStore(t, config.VKConfig{Enabled: false})
	connector := New(eventBus, store, registry)
	connector.newClient = func(proxyCfg *config.SOCKS5Config) (chatClient, error) {
		t.Fatal("client should not be created when disabled")
		return nil, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	require.NoError(t, connector.Run(ctx))
	require.Equal(t, status.StateDisabled, registry.VK().State)
}

func TestConnector_Run_WhenChannelMissing_ExpectErrorStatus(t *testing.T) {
	t.Parallel()

	eventBus := bus.New(8)
	registry := status.NewRegistry()
	store := testStore(t, config.VKConfig{Enabled: true, Channel: ""})
	connector := New(eventBus, store, registry)
	connector.newClient = func(proxyCfg *config.SOCKS5Config) (chatClient, error) {
		t.Fatal("client should not be created without channel")
		return nil, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	require.NoError(t, connector.Run(ctx))
	require.Equal(t, status.StateError, registry.VK().State)
}

func TestConnector_RunSession_PublishesMappedMessage(t *testing.T) {
	t.Parallel()

	eventBus := bus.New(8)
	registry := status.NewRegistry()
	store := testStore(t, config.VKConfig{Enabled: true, Channel: "vkplay"})
	connector := New(eventBus, store, registry)

	raw := []byte(`{
		"push": {
			"pub": {
				"data": {
					"type": "message",
					"data": {
						"id": 7,
						"createdAt": 1717400000,
						"author": {"id": 3, "displayName": "Guest"},
						"data": [{"type": "text", "content": "[\"ping\"]"}]
					}
				}
			}
		}
	}`)

	connector.newClient = func(proxyCfg *config.SOCKS5Config) (chatClient, error) {
		return &sessionFakeClient{raw: raw}, nil
	}

	events, unsub := eventBus.Subscribe()
	defer unsub()

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		defer close(done)
		_ = connector.Run(ctx)
	}()

	select {
	case ev := <-events:
		require.Equal(t, bus.EventChatMessageReceived, ev.Type)
		msg := ev.Message
		require.Equal(t, "ping", msg.Message)
		require.Equal(t, status.StateConnected, registry.VK().State)
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for vk message")
	}

	cancel()
	<-done
}

type sessionFakeClient struct {
	raw []byte
}

func (f *sessionFakeClient) RunSession(ctx context.Context, channel string, onMessage func([]byte)) error {
	onMessage(f.raw)
	<-ctx.Done()
	return nil
}
