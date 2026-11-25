// Package goodgame reads public GoodGame chat using its v2 guest protocol.
package goodgame

import (
	"context"
	"log/slog"
	"time"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/retry"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/imagelink"
)

// Connector delivers live messages from the configured channel.
type Connector struct {
	events   *bus.Bus
	store    *config.Store
	registry *status.Registry
	client   client
}

// New creates a guest reader for one public channel.
func New(events *bus.Bus, store *config.Store, registry *status.Registry) *Connector {
	return &Connector{events: events, store: store, registry: registry, client: publicClient()}
}

// Run replaces the active connection when the operator changes channels.
func (c *Connector) Run(ctx context.Context) error {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	var cancel context.CancelFunc
	var done chan struct{}
	stop := func() {
		if cancel != nil {
			cancel()
			<-done
			cancel = nil
		}
	}
	defer stop()
	c.registry.SetConnection(status.PlatformGoodGame, status.StateDisabled, "")
	var current config.GoodGameConfig
	for {
		cfg := c.store.Snapshot().GoodGame
		if cfg != current {
			stop()
			current = cfg
			if cfg.Enabled {
				session, end := context.WithCancel(ctx)
				cancel = end
				done = make(chan struct{})
				go func() {
					defer close(done)
					c.listen(session, cfg.ChannelKey())
				}()
			} else {
				c.registry.SetConnection(status.PlatformGoodGame, status.StateDisabled, "")
			}
		}
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
		}
	}
}

func (c *Connector) listen(ctx context.Context, key string) {
	backoff := retry.NewBackoff(time.Second, 30*time.Second)
	// Keep a bounded window across reconnects to suppress repeated upstream IDs.
	var recent [256]string
	next := 0
	publish := func(msg bus.ChatMessage) {
		for _, id := range recent {
			if id == msg.ID {
				return
			}
		}
		imagelink.Enrich(&msg, c.store.Snapshot().Overlay.ImagePreviews)
		if err := c.events.Publish(bus.ChatMessageReceived(msg)); err != nil {
			clog.Errorf(ctx, "publish GoodGame message: %w", err)
			return
		}
		recent[next] = msg.ID
		next = (next + 1) % len(recent)
		clog.Debug(ctx, "GoodGame message published", slog.String("message_id", msg.ID))
	}
	for ctx.Err() == nil {
		c.registry.SetConnection(status.PlatformGoodGame, status.StateConnecting, "")
		err := c.client.read(ctx, key, func() {
			c.registry.SetConnection(status.PlatformGoodGame, status.StateConnected, "")
			clog.Info(ctx, "GoodGame chat joined", slog.String("channel", key))
			backoff = backoff.Reset()
		}, publish)
		if ctx.Err() != nil {
			return
		}
		clog.Errorf(ctx, "GoodGame session ended: %w", err)
		c.registry.SetConnection(status.PlatformGoodGame, status.StateReconnecting, status.SanitizeError(err.Error()))
		if retry.Wait(ctx, backoff.Current()) != nil {
			return
		}
		backoff = backoff.Next()
	}
}
