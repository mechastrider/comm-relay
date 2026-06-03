package twitch

import (
	"context"
	"log/slog"
	"time"

	"github.com/gempir/go-twitch-irc/v4"
	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"
)

// ircClient is the subset of go-twitch-irc used by the connector (mocked in tests).
type ircClient interface {
	OnPrivateMessage(handler func(twitch.PrivateMessage))
	OnConnect(handler func())
	Join(channels ...string)
	Connect() error
	Disconnect() error
}

type clientFactory func() ircClient

// Connector reads Twitch IRC chat (anonymous read-only) and publishes unified messages to the event bus.
// MVP uses IRC rather than EventSub for simplicity and public chat without OAuth.
type Connector struct {
	bus       *bus.Bus
	cfg       config.TwitchConfig
	newClient clientFactory
}

// New creates a Twitch IRC connector.
func New(eventBus *bus.Bus, cfg config.TwitchConfig) *Connector {
	return &Connector{
		bus: eventBus,
		cfg: cfg,
		newClient: func() ircClient {
			return twitch.NewAnonymousClient()
		},
	}
}

// Run connects to Twitch IRC until ctx is cancelled. Disabled or empty channel is a no-op.
func (c *Connector) Run(ctx context.Context) error {
	if !c.cfg.Enabled {
		return nil
	}

	channel := normalizeChannel(c.cfg.Channel)
	if channel == "" {
		return nil
	}

	ctx = clog.NewContext(ctx, slog.Default().With(
		slog.String("platform", platformTwitch),
		slog.String("channel", channel),
	))

	clog.Info(ctx, "twitch connector starting")
	defer clog.Info(ctx, "twitch connector stopped")

	backoff := newReconnectBackoff()

	for {
		if ctx.Err() != nil {
			return nil
		}

		err := c.runSession(ctx, channel)
		if ctx.Err() != nil {
			return nil
		}

		if err != nil {
			clog.Errorf(ctx, "twitch session ended: %w", err)
		} else {
			clog.Info(ctx, "twitch session ended")
		}

		wait := backoff.current()
		clog.Info(ctx, "twitch reconnect scheduled", slog.Duration("after", wait))
		if err := waitContext(ctx, wait); err != nil {
			return nil
		}

		backoff = backoff.next()
	}
}

func (c *Connector) runSession(ctx context.Context, channel string) error {
	client := c.newClient()

	client.OnConnect(func() {
		clog.Info(ctx, "twitch irc connected")
	})

	client.OnPrivateMessage(func(msg twitch.PrivateMessage) {
		chatMsg := MapPrivateMessage(msg)
		if err := c.bus.Publish(bus.ChatMessageReceived(chatMsg)); err != nil {
			clog.Errorf(ctx, "publish twitch message: %w", err)
		}
	})

	client.Join(channel)

	connectDone := make(chan error, 1)
	go func() {
		connectDone <- client.Connect()
	}()

	select {
	case <-ctx.Done():
		_ = client.Disconnect()
		<-connectDone
		return nil
	case err := <-connectDone:
		_ = client.Disconnect()
		if err != nil {
			return errors.Errorf("twitch connect: %w", err)
		}
		return nil
	}
}

func waitContext(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return nil
	}

	timer := time.NewTimer(d)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}
